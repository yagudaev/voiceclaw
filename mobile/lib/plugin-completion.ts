import { getSetting } from '@/db'
import EventSource from 'react-native-sse'

export type PluginConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type PluginCompletionCallbacks = {
  onToken: (fullText: string) => void
  onDone: (fullText: string) => void
  onError: (error: string) => void
}

export type PluginStatusListener = (status: PluginConnectionStatus) => void

let connectionStatus: PluginConnectionStatus = 'disconnected'
let statusListeners: PluginStatusListener[] = []

export function getPluginStatus(): PluginConnectionStatus {
  return connectionStatus
}

export function addPluginStatusListener(listener: PluginStatusListener): () => void {
  statusListeners.push(listener)
  return () => {
    statusListeners = statusListeners.filter((entry) => entry !== listener)
  }
}

export async function connectPlugin(baseUrl?: string, token?: string): Promise<void> {
  const gatewayBaseUrl = normalizeBaseUrl(baseUrl ?? (await getSetting('brain_gateway_url')) ?? (await getSetting('openclaw_gateway_url')))
  const authToken = token ?? (await getSetting('brain_auth_token')) ?? (await getSetting('openclaw_auth_token'))

  if (!gatewayBaseUrl) {
    setStatus('error')
    return
  }

  setStatus('connecting')

  try {
    const response = await fetch(buildPluginUrl(gatewayBaseUrl, '/voiceclaw/health'), {
      method: 'GET',
      headers: buildPluginHeaders(authToken, false),
    })

    setStatus(response.ok ? 'connected' : 'error')
  } catch {
    setStatus('error')
  }
}

export function disconnectPlugin(): void {
  setStatus('disconnected')
}

export function pluginStreamCompletion(
  messages: Array<{ role: string, content: string }>,
  model: string,
  systemPrompt: string,
  conversationId: number,
  callbacks: PluginCompletionCallbacks,
): () => void {
  let isCanceled = false
  let didFinish = false
  let fullText = ''
  let eventSource: EventSource | null = null

  void start()

  return () => {
    isCanceled = true
    eventSource?.close()
  }

  async function start() {
    const { gatewayBaseUrl, authToken } = await getPluginConfig()

    if (!gatewayBaseUrl) {
      callbacks.onError('Plugin base URL is not configured')
      return
    }

    const sessionKey = `voiceclaw:${conversationId}`
    const chatMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages

    eventSource = new EventSource(buildPluginUrl(gatewayBaseUrl, '/voiceclaw/v1/chat/completions'), {
      method: 'POST',
      headers: {
        ...buildPluginHeaders(authToken, true),
        'x-openclaw-session-key': sessionKey,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        stream: true,
        user: sessionKey,
      }),
      pollingInterval: 0,
      timeoutBeforeConnection: 0,
    })

    eventSource.addEventListener('message', (event: any) => {
      if (isCanceled || didFinish) return

      if (event.data === '[DONE]') {
        didFinish = true
        eventSource?.close()
        callbacks.onDone(fullText)
        return
      }

      try {
        const payload = JSON.parse(event.data)
        const delta = extractChoiceText(payload)
        if (!delta) return
        fullText += delta
        setStatus('connected')
        callbacks.onToken(fullText)
      } catch (error) {
        console.warn('[pluginStreamCompletion] Failed to parse SSE chunk:', event?.data, error)
      }
    })

    eventSource.addEventListener('error', (event: any) => {
      if (isCanceled || didFinish) return
      didFinish = true
      eventSource?.close()
      setStatus('error')
      callbacks.onError(event?.message || 'Plugin stream failed')
    })
  }
}

export async function getPluginConfig() {
  const gatewayBaseUrl = normalizeBaseUrl((await getSetting('brain_gateway_url')) || (await getSetting('openclaw_gateway_url')))
  const authToken = (await getSetting('brain_auth_token')) || (await getSetting('openclaw_auth_token'))
  const model = (await getSetting('default_model')) || 'openclaw:voice'
  return { gatewayBaseUrl, authToken, model }
}

function setStatus(status: PluginConnectionStatus) {
  connectionStatus = status
  for (const listener of statusListeners) {
    try {
      listener(status)
    } catch {}
  }
}

function buildPluginHeaders(authToken: string | null, includeJsonBody: boolean) {
  return {
    ...(includeJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(authToken?.trim() ? { Authorization: `Bearer ${authToken.trim()}` } : {}),
  }
}

function buildPluginUrl(baseUrl: string, route: string) {
  return `${baseUrl}${route.startsWith('/') ? route : `/${route}`}`
}

function normalizeBaseUrl(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  return value.trim().replace(/\/+$/, '')
}

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
