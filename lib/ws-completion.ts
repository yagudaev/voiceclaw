import { getSetting } from '@/db'

// ---- Public types --------------------------------------------------------

export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type WsCompletionCallbacks = {
  onToken: (fullText: string) => void
  onDone: (fullText: string) => void
  onError: (error: string) => void
}

export type WsStatusListener = (status: WsConnectionStatus) => void

// ---- Module state --------------------------------------------------------

let ws: WebSocket | null = null
let connectionStatus: WsConnectionStatus = 'disconnected'
let statusListeners: WsStatusListener[] = []
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0

// Active completion state
let activeCallbacks: WsCompletionCallbacks | null = null
let fullText = ''

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY_MS = 1000

// ---- Public API ----------------------------------------------------------

export function getWsStatus(): WsConnectionStatus {
  return connectionStatus
}

export function addWsStatusListener(listener: WsStatusListener): () => void {
  statusListeners.push(listener)
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener)
  }
}

export async function connectWs(url?: string, token?: string): Promise<void> {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  const gatewayUrl = url ?? await getSetting('openclaw_gateway_url')
  const authToken = token ?? await getSetting('openclaw_auth_token')

  if (!gatewayUrl) {
    setStatus('error')
    return
  }

  setStatus('connecting')
  reconnectAttempts = 0
  openSocket(gatewayUrl, authToken)
}

export function disconnectWs(): void {
  cancelReconnect()
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS // prevent auto-reconnect
  if (ws) {
    ws.close()
    ws = null
  }
  setStatus('disconnected')
}

/**
 * Send a completion request over the WebSocket connection.
 * Uses the same callback shape as streamCompletion (onToken, onDone, onError).
 * Returns a cancel function.
 */
export function wsStreamCompletion(
  messages: Array<{ role: string, content: string }>,
  model: string,
  systemPrompt: string,
  conversationId: number,
  callbacks: WsCompletionCallbacks,
): () => void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    callbacks.onError('WebSocket not connected')
    return () => {}
  }

  // Cancel any in-progress completion
  if (activeCallbacks) {
    activeCallbacks = null
  }

  activeCallbacks = callbacks
  fullText = ''

  const chatMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  // Send request in the `req:agent` format
  // NOTE: The exact OpenClaw gateway protocol is not yet documented.
  // This format is a best guess and may need adjustment after testing
  // against a real gateway instance.
  const payload = {
    type: 'req:agent',
    data: {
      model,
      messages: chatMessages,
      stream: true,
      session_key: `voiceclaw:${conversationId}`,
    },
  }

  ws.send(JSON.stringify(payload))

  return () => {
    if (activeCallbacks === callbacks) {
      activeCallbacks = null
    }
  }
}

export async function getWsConfig() {
  const gatewayUrl = await getSetting('openclaw_gateway_url')
  const authToken = await getSetting('openclaw_auth_token')
  const model = (await getSetting('default_model')) || 'openclaw:voice'
  return { gatewayUrl, authToken, model }
}

// ---- Internal helpers (bottom of file) -----------------------------------

function setStatus(status: WsConnectionStatus) {
  connectionStatus = status
  for (const listener of statusListeners) {
    try { listener(status) } catch { /* swallow listener errors */ }
  }
}

function cancelReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function scheduleReconnect(gatewayUrl: string, authToken: string | null) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    setStatus('error')
    return
  }

  const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts)
  reconnectAttempts += 1

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (connectionStatus !== 'connected') {
      setStatus('connecting')
      openSocket(gatewayUrl, authToken)
    }
  }, delay)
}

function openSocket(gatewayUrl: string, authToken: string | null) {
  try {
    // Append auth token as query param if provided
    const url = authToken
      ? `${gatewayUrl}${gatewayUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(authToken)}`
      : gatewayUrl

    ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectAttempts = 0
      setStatus('connected')
    }

    ws.onmessage = (event) => {
      handleMessage(event.data)
    }

    ws.onerror = () => {
      // onerror is always followed by onclose in RN, so we handle reconnect there
    }

    ws.onclose = () => {
      ws = null
      if (connectionStatus !== 'disconnected' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setStatus('connecting')
        scheduleReconnect(gatewayUrl, authToken)
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setStatus('error')
      }
    }
  } catch (err: any) {
    setStatus('error')
  }
}

function handleMessage(raw: string) {
  if (!activeCallbacks) return

  try {
    const msg = JSON.parse(raw)

    // Handle `event:agent` responses from the gateway
    // NOTE: This parsing logic may need adjustment once the actual
    // OpenClaw gateway protocol is confirmed. Currently supports:
    //   { type: "event:agent", data: { delta: "...", done: false } }
    //   { type: "event:agent", data: { done: true } }
    //   { type: "error", data: { message: "..." } }
    if (msg.type === 'event:agent') {
      const data = msg.data
      if (data?.delta) {
        fullText += data.delta
        activeCallbacks.onToken(fullText)
      }
      if (data?.done) {
        const cb = activeCallbacks
        activeCallbacks = null
        cb.onDone(fullText)
      }
    } else if (msg.type === 'error') {
      const cb = activeCallbacks
      activeCallbacks = null
      cb.onError(msg.data?.message || 'Unknown gateway error')
    }
  } catch {
    // Non-JSON messages are silently ignored
  }
}
