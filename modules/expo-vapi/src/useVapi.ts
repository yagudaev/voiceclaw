import { useEffect, useCallback, useState, useRef } from 'react'

import ExpoVapiModule from './ExpoVapiModule'
import type { TranscriptEvent } from './ExpoVapi.types'

type VapiConfig = {
  publicKey: string
  assistantId: string
  overrides?: Record<string, unknown>
}

export function useVapi(config: VapiConfig) {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const subscriptions = useRef<Array<{ remove: () => void }>>([])

  useEffect(() => {
    if (!config.publicKey) return

    ExpoVapiModule.initialize(config.publicKey).then(() => {
      setIsInitialized(true)
    })
  }, [config.publicKey])

  useEffect(() => {
    const subs = [
      ExpoVapiModule.addListener('onCallStart', () => {
        setIsCallActive(true)
      }),
      ExpoVapiModule.addListener('onCallEnd', () => {
        setIsCallActive(false)
        setIsMuted(false)
      }),
      ExpoVapiModule.addListener('onTranscript', (event: TranscriptEvent) => {
        if (event.type === 'final') {
          setTranscripts((prev) => [...prev, event])
        }
      }),
      ExpoVapiModule.addListener('onError', (event) => {
        console.error('[Vapi Error]', event.message)
      }),
    ]

    subscriptions.current = subs

    return () => {
      subs.forEach((s) => s.remove())
    }
  }, [])

  const startCall = useCallback(async () => {
    if (!isInitialized) return
    setTranscripts([])
    return ExpoVapiModule.startCall(config.assistantId, config.overrides)
  }, [isInitialized, config.assistantId, config.overrides])

  const stopCall = useCallback(async () => {
    return ExpoVapiModule.stopCall()
  }, [])

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted
    await ExpoVapiModule.setMuted(newMuted)
    setIsMuted(newMuted)
  }, [isMuted])

  return {
    isInitialized,
    isCallActive,
    isMuted,
    transcripts,
    startCall,
    stopCall,
    toggleMute,
  }
}
