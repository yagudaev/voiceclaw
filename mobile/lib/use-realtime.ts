// useRealtime — JS hook for WebSocket connection to relay server
// Manages the relay protocol, bridges audio events to/from the native audio module

import { useCallback, useEffect, useRef, useState } from 'react'
import ExpoRealtimeAudioModule from '@/modules/expo-realtime-audio/src/ExpoRealtimeAudioModule'

export interface RealtimeConfig {
  serverUrl: string
  voice: string
  brainAgent: 'kira' | 'none'
  openclawGatewayUrl: string
  openclawAuthToken: string
  deviceContext?: {
    timezone?: string
    locale?: string
    deviceModel?: string
  }
  instructionsOverride?: string
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
  onError?: (message: string, code: number) => void
}

export interface RealtimeControls {
  start: (config: RealtimeConfig) => void
  stop: () => void
  isConnected: boolean
  sessionId: string | null
}

export function useRealtime(callbacks: RealtimeCallbacks): RealtimeControls {
  const wsRef = useRef<WebSocket | null>(null)
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

  // Listen for audio from native module and forward to WebSocket
  useEffect(() => {
    const subscription = ExpoRealtimeAudioModule.addListener(
      'onAudioCaptured',
      (event: { data: string }) => {
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

    console.log(`[useRealtime] Connecting to ${config.serverUrl}`)
    const ws = new WebSocket(config.serverUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[useRealtime] WebSocket connected, sending session.config')
      ws.send(JSON.stringify({
        type: 'session.config',
        provider: 'openai',
        voice: config.voice,
        brainAgent: config.brainAgent,
        openclawGatewayUrl: config.openclawGatewayUrl,
        openclawAuthToken: config.openclawAuthToken,
        deviceContext: config.deviceContext,
        instructionsOverride: config.instructionsOverride,
      }))
    }

    ws.onmessage = handleMessage

    ws.onerror = (err) => {
      console.warn('[useRealtime] WebSocket error:', err)
      callbacksRef.current.onError?.('WebSocket connection error', 0)
    }

    ws.onclose = () => {
      console.log('[useRealtime] WebSocket closed')
      setIsConnected(false)
      setSessionId(null)
      ExpoRealtimeAudioModule.stopCapture()
      ExpoRealtimeAudioModule.stopPlayback()
    }
  }, [handleMessage])

  const stop = useCallback(() => {
    ExpoRealtimeAudioModule.stopCapture()
    ExpoRealtimeAudioModule.stopPlayback()
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
    setSessionId(null)
  }, [])

  return { start, stop, isConnected, sessionId }
}
