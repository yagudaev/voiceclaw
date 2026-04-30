export interface TextChatOptions {
  serverUrl: string
  apiKey: string
  provider: 'gemini' | 'openai' | 'xai'
  model: string
  voice: string
  sessionKey?: string
  tavilyApiKey?: string
  instructionsOverride?: string
  conversationHistory?: { role: 'user' | 'assistant', text: string }[]
  deviceContext?: { timezone?: string, locale?: string, deviceModel?: string }
}

export interface TextChatCallbacks {
  onToken: (fullText: string) => void
  onDone: (fullText: string) => void
  onError: (error: string) => void
}

export function streamTextChat(
  text: string,
  opts: TextChatOptions,
  callbacks: TextChatCallbacks,
): () => void {
  let didFinish = false
  let fullText = ''
  let sawDone = false
  let ws: WebSocket | null = null

  const finish = (kind: 'done' | 'error', payload: string) => {
    if (didFinish) return
    didFinish = true
    try { ws?.close() } catch {}
    if (kind === 'done') callbacks.onDone(payload)
    else callbacks.onError(payload)
  }

  try {
    ws = new WebSocket(opts.serverUrl)
  } catch (e) {
    callbacks.onError(e instanceof Error ? e.message : 'failed to open relay websocket')
    return () => {}
  }

  ws.onopen = () => {
    ws?.send(JSON.stringify({
      type: 'session.config',
      provider: opts.provider,
      voice: opts.voice,
      model: opts.model,
      brainAgent: 'enabled',
      apiKey: opts.apiKey,
      tavilyApiKey: opts.tavilyApiKey,
      sessionKey: opts.sessionKey,
      deviceContext: opts.deviceContext,
      instructionsOverride: opts.instructionsOverride,
      conversationHistory: opts.conversationHistory,
    }))
  }

  ws.onmessage = (event: MessageEvent) => {
    let data: { type?: string, text?: string, role?: string, message?: string, code?: number }
    try {
      data = JSON.parse(event.data as string)
    } catch {
      return
    }

    switch (data.type) {
      case 'session.ready':
        ws?.send(JSON.stringify({ type: 'text.input', text }))
        break
      case 'transcript.delta':
        if (data.role === 'assistant' && typeof data.text === 'string') {
          fullText += data.text
          callbacks.onToken(fullText)
        }
        break
      case 'transcript.done':
        if (data.role === 'assistant' && typeof data.text === 'string') {
          fullText = data.text
          sawDone = true
          finish('done', fullText)
        }
        break
      case 'turn.ended':
        if (!sawDone) finish('done', fullText)
        break
      case 'error':
        finish('error', data.message || `relay error ${data.code ?? ''}`.trim())
        break
    }
  }

  ws.onerror = () => {
    if (!didFinish) finish('error', 'relay connection failed')
  }

  ws.onclose = () => {
    if (!didFinish) finish('done', fullText)
  }

  return () => {
    if (!didFinish) finish('error', 'cancelled')
  }
}
