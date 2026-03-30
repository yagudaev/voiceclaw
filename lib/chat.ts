import { getSetting } from '@/db'
import { pluginStreamCompletion } from '@/lib/plugin-completion'
import EventSource from 'react-native-sse'

export type OpenClawConnectionMode = 'http' | 'plugin'

const DEFAULT_SYSTEM_PROMPT = `\
You are a helpful assistant. Keep responses concise. Use markdown for formatting \
and images when appropriate. Your identity, personality, and capabilities are \
defined in your system files.`

type ChatMessage = { role: string, content: string }

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object') {
        const text = (part as { text?: unknown }).text
        if (typeof text === 'string') return text
      }
      return ''
    }).join('')
  }
  return ''
}

function extractChoiceText(payload: any): string {
  const choice = payload?.choices?.[0]
  return extractTextContent(
    choice?.delta?.content
      ?? choice?.message?.content
      ?? choice?.text
  )
}

async function fetchCompletionFallback(
  chatMessages: ChatMessage[],
  apiKey: string,
  model: string,
  apiUrl: string,
  conversationId: number
): Promise<string> {
  const sessionKey = `voiceclaw:${conversationId}`
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-openclaw-session-key': sessionKey,
      'x-openclaw-scopes': 'operator.read,operator.write',
    },
    body: JSON.stringify({
      model,
      messages: chatMessages,
      stream: false,
      user: sessionKey,
    }),
  })

  const raw = await response.text()
  if (!response.ok) {
    throw new Error(`Fallback HTTP ${response.status}: ${raw.slice(0, 200)}`)
  }

  const payload = JSON.parse(raw)
  return extractChoiceText(payload)
}

export function streamCompletion(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  apiUrl: string,
  systemPrompt: string,
  conversationId: number,
  {
    onToken,
    onDone,
    onError,
  }: {
    onToken: (fullText: string) => void
    onDone: (fullText: string) => void
    onError: (error: string) => void
  }
) {
  const chatMessages = [
    { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
    ...messages,
  ]

  const sessionKey = `voiceclaw:${conversationId}`
  const es = new EventSource(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-openclaw-session-key': sessionKey,
      'x-openclaw-scopes': 'operator.read,operator.write',
    },
    body: JSON.stringify({ model, messages: chatMessages, stream: true, user: sessionKey }),
    pollingInterval: 0,
    timeoutBeforeConnection: 0,
  })

  let fullText = ''
  let didFinish = false

  es.addEventListener('message', (event: any) => {
    if (event.data === '[DONE]') {
      es.close()
      if (didFinish) return
      didFinish = true
      if (fullText.trim()) {
        onDone(fullText)
        return
      }
      fetchCompletionFallback(chatMessages, apiKey, model, apiUrl, conversationId)
        .then((fallbackText) => {
          onDone(fallbackText)
        })
        .catch((error) => {
          onError(error instanceof Error ? error.message : 'Fallback completion failed')
        })
      return
    }

    try {
      const payload = JSON.parse(event.data)
      const delta = extractChoiceText(payload)
      if (delta) {
        fullText += delta
        onToken(fullText)
      }
    } catch (error) {
      console.warn('[streamCompletion] Failed to parse SSE chunk:', event?.data, error)
    }
  })

  es.addEventListener('error', (event: any) => {
    if (didFinish) return
    didFinish = true
    es.close()
    onError(event?.message || 'Stream failed')
  })

  return () => es.close()
}

export async function getApiConfig() {
  const connectionMode = ((await getSetting('openclaw_connection_mode')) || 'http') as OpenClawConnectionMode
  const apiKey = await getSetting('openclaw_api_key')
  const model = (await getSetting('default_model')) || 'openclaw:voice'
  const apiUrl = await getSetting('openclaw_api_url')
  return { apiKey, model, apiUrl, connectionMode }
}

/**
 * Unified streaming completion that checks the connection mode setting.
 * - HTTP mode: uses SSE-based streamCompletion (existing behaviour)
 * - Plugin mode: uses plugin-backed HTTP/SSE streaming
 *
 * Both paths use the same callback interface (onToken, onDone, onError)
 * and return a cancel function.
 */
export function unifiedStreamCompletion(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  apiUrl: string,
  systemPrompt: string,
  conversationId: number,
  connectionMode: OpenClawConnectionMode,
  callbacks: {
    onToken: (fullText: string) => void
    onDone: (fullText: string) => void
    onError: (error: string) => void
  },
): () => void {
  if (connectionMode === 'plugin') {
    return pluginStreamCompletion(messages, model, systemPrompt, conversationId, callbacks)
  }

  // Default: HTTP/SSE path
  return streamCompletion(messages, apiKey, model, apiUrl, systemPrompt, conversationId, callbacks)
}
