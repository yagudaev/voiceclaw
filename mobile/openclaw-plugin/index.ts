import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry'
import { resolveAgentIdFromSessionKey } from 'openclaw/plugin-sdk/routing'

type VoiceClawChatRequest = {
  model?: string
  stream?: boolean
  user?: string
  messages?: Array<{
    role?: string
    content?: unknown
  }>
}

type VoiceClawChatMessage = {
  role: string
  content: string
}

const PLUGIN_ID = 'openclaw-plugin'
const HEALTH_PATH = '/voiceclaw/health'
const CHAT_PATH = '/voiceclaw/v1/chat/completions'

export default definePluginEntry({
  id: PLUGIN_ID,
  name: 'VoiceClaw Plugin',
  description: 'VoiceClaw bridge plugin backed by embedded OpenClaw agent runs',
  register(api) {
    api.registerHttpRoute({
      path: HEALTH_PATH,
      auth: 'plugin',
      handler: async (req, res) => {
        if (!authorizeRequest(req, api.pluginConfig?.authToken)) {
          writeJson(res, 401, { error: { message: 'Unauthorized' } })
          return true
        }

        if (req.method !== 'GET') {
          writeJson(res, 405, { error: { message: 'Method not allowed' } })
          return true
        }

        writeJson(res, 200, {
          ok: true,
          plugin: PLUGIN_ID,
          transport: 'http+sse',
        })
        return true
      },
    })

    api.registerHttpRoute({
      path: CHAT_PATH,
      auth: 'plugin',
      handler: async (req, res) => {
        if (!authorizeRequest(req, api.pluginConfig?.authToken)) {
          writeJson(res, 401, { error: { message: 'Unauthorized' } })
          return true
        }

        if (req.method !== 'POST') {
          writeJson(res, 405, { error: { message: 'Method not allowed' } })
          return true
        }

        try {
          const body = await readJsonBody(req) as VoiceClawChatRequest
          const messages = normalizeMessages(body.messages)
          const sessionKey = resolveSessionKey(req, body)

          if (!messages.length) {
            writeJson(res, 400, { error: { message: 'At least one message is required' } })
            return true
          }

          const sessionId = toSessionId(sessionKey)
          const agentId = resolveAgentIdFromSessionKey(sessionKey)
          const agentDir = api.runtime.agent.resolveAgentDir(api.config, agentId)
          const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(api.config, agentId)
          const sessionFile = path.join(agentDir, 'sessions', `${sessionId}.jsonl`)
          const requestedModel = resolveRequestedModel(body.model)
          const responseModel = requestedModel.raw || api.runtime.agent.defaults.model
          const runId = randomUUID()
          const isStreaming = body.stream !== false
          const { prompt, extraSystemPrompt } = buildPromptContext(messages, !existsSync(sessionFile))

          await api.runtime.agent.ensureAgentWorkspace({ dir: workspaceDir })
          await mkdir(path.dirname(sessionFile), { recursive: true })

          const abortController = new AbortController()
          req.on('close', () => abortController.abort())

          if (isStreaming) {
            writeSseHeaders(res)
          }

          let streamedText = ''

          const result = await api.runtime.agent.runEmbeddedPiAgent({
            sessionId,
            sessionKey,
            runId,
            sessionFile,
            workspaceDir,
            agentDir,
            agentId,
            prompt,
            timeoutMs: api.runtime.agent.resolveAgentTimeoutMs({ cfg: api.config }),
            trigger: 'user',
            messageChannel: 'openclaw-plugin',
            provider: requestedModel.provider,
            model: requestedModel.model,
            extraSystemPrompt,
            abortSignal: abortController.signal,
            onPartialReply: async ({ text }) => {
              if (!isStreaming || !text) return
              const delta = resolveDelta(text, streamedText)
              if (!delta) return
              streamedText += delta
              writeSseChunk(res, buildStreamChunk(runId, responseModel, delta))
            },
          })

          const assistantText = collectAssistantText(result, streamedText)

          if (isStreaming) {
            if (!streamedText && assistantText) {
              writeSseChunk(res, buildStreamChunk(runId, responseModel, assistantText))
            }
            writeSseChunk(res, buildStreamStopChunk(runId, responseModel))
            writeSseDone(res)
            return true
          }

          writeJson(res, 200, buildCompletionResponse(runId, responseModel, assistantText))
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'VoiceClaw plugin request failed'
          api.logger.error(`VoiceClaw chat route failed: ${message}`)

          if (!res.headersSent) {
            writeJson(res, 500, { error: { message } })
            return true
          }

          try {
            writeSseChunk(res, JSON.stringify({ error: { message } }))
            writeSseDone(res)
          } catch {}
          return true
        }
      },
    })
  },
})

function authorizeRequest(req: IncomingMessage, expectedToken: unknown): boolean {
  if (typeof expectedToken !== 'string' || !expectedToken.trim()) return true
  const authHeader = readHeader(req, 'authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  const pluginToken = readHeader(req, 'x-voiceclaw-plugin-token')
  return bearerToken === expectedToken || pluginToken === expectedToken
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  return JSON.parse(raw)
}

function normalizeMessages(messages: VoiceClawChatRequest['messages']): VoiceClawChatMessage[] {
  return (messages || [])
    .map((message) => ({
      role: typeof message?.role === 'string' ? message.role : 'user',
      content: extractTextContent(message?.content).trim(),
    }))
    .filter((message) => message.content.length > 0)
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object') {
          const text = (part as { text?: unknown }).text
          return typeof text === 'string' ? text : ''
        }
        return ''
      })
      .join('')
  }

  return ''
}

function resolveSessionKey(req: IncomingMessage, body: VoiceClawChatRequest): string {
  const headerSessionKey = readHeader(req, 'x-openclaw-session-key')
  const bodySessionKey = typeof body.user === 'string' ? body.user.trim() : ''
  const sessionKey = headerSessionKey || bodySessionKey
  return sessionKey || `voiceclaw:${randomUUID()}`
}

function readHeader(req: IncomingMessage, header: string): string | null {
  const raw = req.headers[header]
  if (Array.isArray(raw)) return raw[0] ?? null
  return typeof raw === 'string' ? raw : null
}

function toSessionId(sessionKey: string): string {
  return sessionKey
    .trim()
    .replace(/[^a-zA-Z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `voiceclaw-${randomUUID()}`
}

function resolveRequestedModel(rawModel: string | undefined): {
  raw?: string
  provider?: string
  model?: string
} {
  const model = rawModel?.trim()

  if (!model || model.startsWith('openclaw:')) {
    return {}
  }

  const slashIndex = model.indexOf('/')

  if (slashIndex === -1) {
    return {
      raw: model,
      model,
    }
  }

  return {
    raw: model,
    provider: model.slice(0, slashIndex),
    model: model.slice(slashIndex + 1),
  }
}

function buildPromptContext(messages: VoiceClawChatMessage[], includeHistory: boolean): {
  prompt: string
  extraSystemPrompt?: string
} {
  const systemMessages = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)

  const chatMessages = messages.filter((message) => message.role !== 'system')
  const latestUserIndex = findLastUserMessageIndex(chatMessages)

  if (latestUserIndex === -1) {
    throw new Error('VoiceClaw plugin requires at least one user message')
  }

  const prompt = chatMessages[latestUserIndex].content
  const historyMessages = includeHistory ? chatMessages.slice(0, latestUserIndex) : []
  const extraSections: string[] = []

  if (systemMessages.length) {
    extraSections.push([
      'Follow this system guidance exactly:',
      systemMessages.join('\n\n'),
    ].join('\n'))
  }

  if (historyMessages.length) {
    extraSections.push([
      'Conversation so far:',
      historyMessages
        .map((message) => `${formatRoleLabel(message.role)}: ${message.content}`)
        .join('\n\n'),
    ].join('\n'))
  }

  return {
    prompt,
    extraSystemPrompt: extraSections.length ? extraSections.join('\n\n') : undefined,
  }
}

function findLastUserMessageIndex(messages: VoiceClawChatMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') return index
  }

  return -1
}

function formatRoleLabel(role: string): string {
  if (role === 'assistant') return 'Assistant'
  if (role === 'tool') return 'Tool'
  return 'User'
}

function resolveDelta(nextText: string, currentText: string): string {
  if (!nextText) return ''
  if (!currentText) return nextText
  if (nextText.startsWith(currentText)) return nextText.slice(currentText.length)
  return nextText
}

function collectAssistantText(
  result: {
    payloads?: Array<{ text?: string }>
  },
  streamedText: string,
): string {
  if (streamedText) return streamedText

  return (result.payloads || [])
    .map((payload) => payload.text || '')
    .join('')
    .trim()
}

function buildStreamChunk(runId: string, model: string | undefined, delta: string) {
  return JSON.stringify({
    id: runId,
    object: 'chat.completion.chunk',
    model: model || null,
    choices: [
      {
        index: 0,
        delta: { content: delta },
        finish_reason: null,
      },
    ],
  })
}

function buildStreamStopChunk(runId: string, model: string | undefined) {
  return JSON.stringify({
    id: runId,
    object: 'chat.completion.chunk',
    model: model || null,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: 'stop',
      },
    ],
  })
}

function buildCompletionResponse(runId: string, model: string | undefined, assistantText: string) {
  return {
    id: runId,
    object: 'chat.completion',
    model: model || null,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: assistantText,
        },
        finish_reason: 'stop',
      },
    ],
  }
}

function writeJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function writeSseHeaders(res: ServerResponse) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
}

function writeSseChunk(res: ServerResponse, payload: string) {
  res.write(`data: ${payload}\n\n`)
}

function writeSseDone(res: ServerResponse) {
  res.write('data: [DONE]\n\n')
  res.end()
}
