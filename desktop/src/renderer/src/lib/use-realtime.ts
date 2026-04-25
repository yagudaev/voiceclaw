// useRealtime — WebSocket hook for relay server connection
// Port of mobile/lib/use-realtime.ts, using AudioEngine instead of native modules

import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine } from './audio-engine'

export interface RealtimeConfig {
  serverUrl: string
  voice: string
  model?: string
  brainAgent: 'enabled' | 'none'
  apiKey: string
  sessionKey?: string
  volume?: number
  inputDeviceId?: string
  outputDeviceId?: string
  deviceContext?: {
    timezone?: string
    locale?: string
    deviceModel?: string
  }
  instructionsOverride?: string
  conversationHistory?: { role: 'user' | 'assistant', text: string }[]
  tracingEnabled?: boolean
}

export interface RealtimeCallbacks {
  onTranscriptDelta?: (text: string, role: 'user' | 'assistant') => void
  onTranscriptDone?: (text: string, role: 'user' | 'assistant') => void
  onToolCall?: (callId: string, name: string, args: string) => void
  onToolProgress?: (callId: string, summary: string) => void
  onTurnStarted?: () => void
  onTurnEnded?: () => void
  onSessionReady?: (sessionId: string) => void
  onSessionEnded?: (summary: string) => void
  onDisconnect?: () => void
  onError?: (message: string, code: number) => void
}

export interface RealtimeControls {
  start: (config: RealtimeConfig) => void
  stop: () => void
  setMuted: (muted: boolean) => void
  sendFrame: (base64Jpeg: string) => void
  getInputLevel: () => number
  isConnected: boolean
  isReconnecting: boolean
  sessionId: string | null
}

const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAYS = [1000, 3000, 5000]

export function useRealtime(callbacks: RealtimeCallbacks): RealtimeControls {
  const wsRef = useRef<WebSocket | null>(null)
  const configRef = useRef<RealtimeConfig | null>(null)
  const engineRef = useRef<AudioEngine | null>(null)
  const userStoppedRef = useRef(false)
  const turnStartedAtRef = useRef<number | null>(null)
  const turnIdRef = useRef<string | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectionIdRef = useRef(0)
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const hasConnectedRef = useRef(false)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Surface call activity to the menu-bar tray so it can show "On a call"
  // while a session is live instead of the default "Idle".
  useEffect(() => {
    window.electronAPI?.tray?.setCallActive(isConnected).catch(() => {})
    if (isConnected) {
      return () => {
        window.electronAPI?.tray?.setCallActive(false).catch(() => {})
      }
    }
  }, [isConnected])

  const sendTiming = useCallback((phase: string, ms: number, turnId: string | null) => {
    if (!configRef.current?.tracingEnabled) return
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(
      JSON.stringify({ type: 'client.timing', phase, ms, turnId: turnId ?? undefined }),
    )
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      userStoppedRef.current = true
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      engineRef.current?.destroy()
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = JSON.parse(event.data)
      const cb = callbacksRef.current

      switch (data.type) {
        case 'session.ready':
          reconnectAttemptsRef.current = 0
          hasConnectedRef.current = true
          setIsReconnecting(false)
          setSessionId(data.sessionId)
          setIsConnected(true)
          cb.onSessionReady?.(data.sessionId)
          break

        case 'audio.delta':
          engineRef.current?.playAudio(data.data)
          if (turnStartedAtRef.current != null) {
            sendTiming('ttft_audio', Date.now() - turnStartedAtRef.current, turnIdRef.current)
            turnStartedAtRef.current = null
          }
          break

        case 'transcript.delta':
          cb.onTranscriptDelta?.(data.text, data.role)
          break

        case 'transcript.done':
          cb.onTranscriptDone?.(data.text, data.role)
          break

        case 'tool.call':
          cb.onToolCall?.(data.callId, data.name, data.arguments)
          break

        case 'tool.progress':
          cb.onToolProgress?.(data.callId, data.summary)
          break

        case 'turn.started':
          // Barge-in: stop playback when user starts speaking
          engineRef.current?.stopPlayback()
          turnStartedAtRef.current = Date.now()
          turnIdRef.current = data.turnId ?? null
          cb.onTurnStarted?.()
          break

        case 'turn.ended':
          cb.onTurnEnded?.()
          break

        case 'session.ended':
          cb.onSessionEnded?.(data.summary)
          break

        case 'session.rotating':
          engineRef.current?.stopPlayback()
          turnStartedAtRef.current = null
          break

        case 'session.rotated':
          if (typeof data.sessionId === 'string') setSessionId(data.sessionId)
          break

        case 'error':
          console.warn(`[useRealtime] Error: ${data.message} (${data.code})`)
          cb.onError?.(data.message, data.code)
          break
      }
    },
    [sendTiming],
  )

  const start = useCallback(
    (config: RealtimeConfig) => {
      // Cancel any pending reconnect timer so a stale timeout can't race with this call
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      // Bump connection ID so any in-flight onclose from the previous ws is ignored
      const myConnectionId = connectionIdRef.current + 1
      connectionIdRef.current = myConnectionId

      // Tear down previous connection
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (engineRef.current) {
        engineRef.current.destroy()
      }

      configRef.current = config
      userStoppedRef.current = false

      // Create audio engine
      const engine = new AudioEngine()
      engineRef.current = engine

      if (config.volume !== undefined) {
        engine.setVolume(config.volume)
      }

      console.log(`[useRealtime] Connecting to ${config.serverUrl}`)
      const ws = new WebSocket(config.serverUrl)
      wsRef.current = ws

      ws.onopen = async () => {
        console.log('[useRealtime] WebSocket connected, sending session.config')
        const provider = getProviderForRealtimeModel(config.model)
        ws.send(
          JSON.stringify({
            type: 'session.config',
            provider,
            voice: config.voice,
            model: config.model,
            brainAgent: config.brainAgent,
            apiKey: config.apiKey,
            sessionKey: config.sessionKey,
            deviceContext: config.deviceContext,
            instructionsOverride: config.instructionsOverride,
            conversationHistory: config.conversationHistory,
          }),
        )

        // Start mic capture — audio data flows to WebSocket
        try {
          await engine.startCapture((base64) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'audio.append', data: base64 }))
            }
          }, config.inputDeviceId)

          if (config.outputDeviceId) {
            await engine.setOutputDevice(config.outputDeviceId)
          }
        } catch (err) {
          // If the engine was torn down while startCapture was awaiting (e.g. a
          // relay error fired onError → stop() in the meantime), the throw is a
          // consequence of the prior error — don't overwrite the real message.
          if (engineRef.current !== engine) return
          console.error('[useRealtime] Failed to start audio capture:', err)
          callbacksRef.current.onError?.('Failed to access microphone', 0)
        }
      }

      ws.onmessage = handleMessage

      ws.onerror = () => {
        // Only surface the error on the initial connection attempt.
        // During reconnect, onclose handles retry logic.
        if (!hasConnectedRef.current && reconnectAttemptsRef.current === 0) {
          callbacksRef.current.onError?.('Could not connect to relay server. Is it running?', 0)
        }
      }

      ws.onclose = () => {
        // Ignore close events from superseded connections (e.g. old ws closed by a new start() call)
        if (connectionIdRef.current !== myConnectionId) return

        console.log('[useRealtime] WebSocket closed, userStopped:', userStoppedRef.current)
        setIsConnected(false)
        setSessionId(null)
        engine.stopCapture()
        engine.stopPlayback()
        if (!userStoppedRef.current) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const attempt = reconnectAttemptsRef.current
            const delay = RECONNECT_DELAYS[attempt]
            reconnectAttemptsRef.current += 1
            setIsReconnecting(true)
            console.log(
              `[useRealtime] Unexpected disconnect — reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`,
            )
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null
              if (!userStoppedRef.current && configRef.current) {
                start(configRef.current)
              }
            }, delay)
          } else {
            console.log('[useRealtime] Max reconnect attempts reached, giving up')
            setIsReconnecting(false)
            callbacksRef.current.onDisconnect?.()
          }
        }
      }
    },
    [handleMessage],
  )

  const stop = useCallback(() => {
    userStoppedRef.current = true
    hasConnectedRef.current = false
    setIsReconnecting(false)
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    engineRef.current?.destroy()
    engineRef.current = null
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
    setSessionId(null)
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    engineRef.current?.setMuted(muted)
  }, [])

  const sendFrame = useCallback((base64Jpeg: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'frame.append', data: base64Jpeg }))
    }
  }, [])

  const getInputLevel = useCallback(() => {
    return engineRef.current?.getInputLevel() ?? 0
  }, [])

  return { start, stop, setMuted, sendFrame, getInputLevel, isConnected, isReconnecting, sessionId }
}

function getProviderForRealtimeModel(model?: string): 'gemini' | 'openai' | 'xai' {
  if (model?.startsWith('gemini-')) return 'gemini'
  if (model?.startsWith('grok-voice-')) return 'xai'
  return 'openai'
}
