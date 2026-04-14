// useRealtime — JS hook for WebSocket connection to relay server
// Manages the relay protocol, bridges audio events to/from the native audio module

import { useCallback, useEffect, useRef, useState } from 'react'
import ExpoRealtimeAudioModule from '@/modules/expo-realtime-audio/src/ExpoRealtimeAudioModule'

export interface RealtimeConfig {
  serverUrl: string
  voice: string
  model?: string
  brainAgent: 'enabled' | 'none'
  apiKey: string
  sessionKey?: string
  volume?: number
  deviceContext?: {
    timezone?: string
    locale?: string
    deviceModel?: string
  }
  instructionsOverride?: string
  conversationHistory?: { role: 'user' | 'assistant', text: string }[]
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
  isConnected: boolean
  sessionId: string | null
}

export function useRealtime(callbacks: RealtimeCallbacks): RealtimeControls {
  const wsRef = useRef<WebSocket | null>(null)
  const configRef = useRef<RealtimeConfig | null>(null)
  const userStoppedRef = useRef(false)
  const mutedRef = useRef(false)
  const [isConnected, setIsConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Clean up on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])

  // Forward native logs to JS console
  useEffect(() => {
    const sub = ExpoRealtimeAudioModule.addListener(
      'onLog',
      (event: { message: string }) => {
        console.log('[native]', event.message)
      },
    )
    return () => sub.remove()
  }, [])

  // Listen for audio from native module and forward to WebSocket
  useEffect(() => {
    const subscription = ExpoRealtimeAudioModule.addListener(
      'onAudioCaptured',
      (event: { data: string }) => {
        if (mutedRef.current) return
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'audio.append',
            data: event.data,
          }))
        }
      },
    )
    return () => subscription.remove()
  }, [])

  const handleMessage = useCallback((event: MessageEvent) => {
    const data = JSON.parse(event.data)
    const cb = callbacksRef.current

    switch (data.type) {
      case 'session.ready':
        setSessionId(data.sessionId)
        setIsConnected(true)
        if (configRef.current?.volume && typeof ExpoRealtimeAudioModule.setVolume === 'function') {
          ExpoRealtimeAudioModule.setVolume(configRef.current.volume)
        }
        cb.onSessionReady?.(data.sessionId)
        break

      case 'audio.delta':
        // Forward to native module for playback
        ExpoRealtimeAudioModule.playAudio(data.data)
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
        ExpoRealtimeAudioModule.stopPlayback()
        cb.onTurnStarted?.()
        break

      case 'turn.ended':
        cb.onTurnEnded?.()
        break

      case 'session.ended':
        cb.onSessionEnded?.(data.summary)
        break

      case 'error':
        console.warn(`[useRealtime] Error: ${data.message} (${data.code})`)
        cb.onError?.(data.message, data.code)
        break
    }
  }, [])

  const start = useCallback((config: RealtimeConfig) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    configRef.current = config
    console.log(`[useRealtime] Connecting to ${config.serverUrl}`)
    const ws = new WebSocket(config.serverUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[useRealtime] WebSocket connected, sending session.config')
      const provider = config.model?.startsWith('gemini-') ? 'gemini' : 'openai'
      ws.send(JSON.stringify({
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
      }))
    }

    ws.onmessage = handleMessage

    ws.onerror = (err) => {
      console.warn('[useRealtime] WebSocket error:', err)
      callbacksRef.current.onError?.('WebSocket connection error', 0)
    }

    ws.onclose = () => {
      console.log('[useRealtime] WebSocket closed, userStopped:', userStoppedRef.current)
      setIsConnected(false)
      setSessionId(null)
      ExpoRealtimeAudioModule.stopCapture()
      ExpoRealtimeAudioModule.stopPlayback()
      if (!userStoppedRef.current) {
        callbacksRef.current.onDisconnect?.()
      }
      userStoppedRef.current = false
    }
  }, [handleMessage])

  const stop = useCallback(() => {
    userStoppedRef.current = true
    mutedRef.current = false
    ExpoRealtimeAudioModule.stopCapture()
    ExpoRealtimeAudioModule.stopPlayback()
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
    setSessionId(null)
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted
  }, [])

  return { start, stop, setMuted, isConnected, sessionId }
}
