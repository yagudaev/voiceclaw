// Vanilla TS port of desktop's useRealtime hook for the Telegram mini app.
// Same WebSocket protocol (session.config / audio.append / audio.delta), no
// React. Barge-in, reconnect with bounded backoff, and basic error surfacing.

import { AudioEngine } from "./audio-engine"

export interface RealtimeConfig {
  serverUrl: string
  voice: string
  model: string
  brainAgent: "enabled" | "none"
  apiKey: string
  sessionKey?: string
  deviceContext?: {
    timezone?: string
    locale?: string
    deviceModel?: string
  }
}

export interface RealtimeCallbacks {
  onStatus?: (status: "idle" | "connecting" | "live" | "reconnecting" | "closed") => void
  onTranscriptDelta?: (text: string, role: "user" | "assistant") => void
  onError?: (message: string) => void
}

const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAYS_MS = [1000, 3000, 5000]

export class RealtimeClient {
  private ws: WebSocket | null = null
  private engine: AudioEngine | null = null
  private config: RealtimeConfig | null = null
  private callbacks: RealtimeCallbacks
  private userStopped = false
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connectionId = 0
  private hasConnected = false
  private muted = false

  constructor(callbacks: RealtimeCallbacks) {
    this.callbacks = callbacks
  }

  async start(config: RealtimeConfig): Promise<void> {
    this.cancelReconnectTimer()

    const myConnectionId = ++this.connectionId

    if (this.ws) this.ws.close()
    if (this.engine) this.engine.destroy()

    this.config = config
    this.userStopped = false
    this.callbacks.onStatus?.("connecting")

    const engine = new AudioEngine()
    this.engine = engine
    engine.setMuted(this.muted)

    const ws = new WebSocket(config.serverUrl)
    this.ws = ws

    ws.onopen = async () => {
      ws.send(JSON.stringify({
        type: "session.config",
        provider: "gemini",
        voice: config.voice,
        model: config.model,
        brainAgent: config.brainAgent,
        apiKey: config.apiKey,
        sessionKey: config.sessionKey,
        deviceContext: config.deviceContext,
      }))

      try {
        await engine.startCapture((base64) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "audio.append", data: base64 }))
          }
        })
      } catch (err) {
        if (this.engine !== engine) return
        const message = err instanceof Error ? err.message : "microphone error"
        console.error("[realtime] startCapture failed:", err)
        this.callbacks.onError?.(`Microphone access failed: ${message}`)
      }
    }

    ws.onmessage = (event) => {
      let data: unknown
      try {
        data = JSON.parse(event.data as string)
      } catch {
        return
      }
      this.handleRelayEvent(data as RelayEvent)
    }

    ws.onerror = () => {
      if (!this.hasConnected && this.reconnectAttempts === 0) {
        this.callbacks.onError?.("Could not reach relay. Is the tunnel up?")
      }
    }

    ws.onclose = () => {
      if (this.connectionId !== myConnectionId) return
      engine.stopCapture()
      engine.stopPlayback()

      if (this.userStopped) {
        this.callbacks.onStatus?.("closed")
        return
      }

      if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAYS_MS[this.reconnectAttempts]
        this.reconnectAttempts += 1
        this.callbacks.onStatus?.("reconnecting")
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null
          if (!this.userStopped && this.config) {
            void this.start(this.config)
          }
        }, delay)
      } else {
        this.callbacks.onStatus?.("closed")
      }
    }
  }

  stop() {
    this.userStopped = true
    this.hasConnected = false
    this.cancelReconnectTimer()
    this.engine?.destroy()
    this.engine = null
    this.ws?.close()
    this.ws = null
    this.callbacks.onStatus?.("closed")
  }

  setMuted(muted: boolean) {
    this.muted = muted
    this.engine?.setMuted(muted)
  }

  private handleRelayEvent(data: RelayEvent) {
    switch (data.type) {
      case "session.ready":
        this.reconnectAttempts = 0
        this.hasConnected = true
        this.callbacks.onStatus?.("live")
        break
      case "audio.delta":
        this.engine?.playAudio(data.data)
        break
      case "turn.started":
        this.engine?.stopPlayback()
        break
      case "transcript.delta":
        this.callbacks.onTranscriptDelta?.(data.text, data.role)
        break
      case "error":
        this.callbacks.onError?.(data.message)
        break
    }
  }

  private cancelReconnectTimer() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

type RelayEvent =
  | { type: "session.ready"; sessionId: string }
  | { type: "audio.delta"; data: string }
  | { type: "turn.started"; turnId?: string }
  | { type: "turn.ended" }
  | { type: "transcript.delta"; text: string; role: "user" | "assistant" }
  | { type: "transcript.done"; text: string; role: "user" | "assistant" }
  | { type: "error"; message: string; code: number }
