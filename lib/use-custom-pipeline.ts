import { useEffect, useCallback, useState, useRef } from 'react'

import ExpoCustomPipelineModule from '../modules/expo-custom-pipeline/src/ExpoCustomPipelineModule'
import type {
  PartialTranscriptEvent,
  FinalTranscriptEvent,
  LatencyUpdateEvent,
  LatencyStats,
} from '../modules/expo-custom-pipeline/src/ExpoCustomPipeline.types'
import type { LatencyData } from '@/db'

export type CustomPipelineConfig = {
  apiUrl: string
  apiKey: string
  model: string
  onLatencyUpdate?: (latency: LatencyData) => void
}

export type CustomPipelineState = {
  isListening: boolean
  isSpeaking: boolean
  partialTranscript: string
  latencyStats: LatencyStats
  startConversation: () => void
  stopConversation: () => void
}

export function useCustomPipeline(config: CustomPipelineConfig): CustomPipelineState {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [partialTranscript, setPartialTranscript] = useState('')
  const [latencyStats, setLatencyStats] = useState<LatencyStats>({
    sttLatencyMs: 0,
    llmLatencyMs: 0,
    ttsLatencyMs: 0,
  })
  const subscriptions = useRef<Array<{ remove: () => void }>>([])
  const onLatencyUpdateRef = useRef(config.onLatencyUpdate)
  onLatencyUpdateRef.current = config.onLatencyUpdate

  useEffect(() => {
    const subs = [
      ExpoCustomPipelineModule.addListener(
        'onPartialTranscript',
        (event: PartialTranscriptEvent) => {
          setPartialTranscript(event.text)
          setIsListening(true)
        }
      ),
      ExpoCustomPipelineModule.addListener(
        'onFinalTranscript',
        (_event: FinalTranscriptEvent) => {
          setPartialTranscript('')
          setIsListening(false)
        }
      ),
      ExpoCustomPipelineModule.addListener('onTTSStart', () => {
        setIsSpeaking(true)
      }),
      ExpoCustomPipelineModule.addListener('onTTSComplete', () => {
        setIsSpeaking(false)
      }),
      ExpoCustomPipelineModule.addListener(
        'onLatencyUpdate',
        (event: LatencyUpdateEvent) => {
          setLatencyStats({
            sttLatencyMs: event.sttLatencyMs,
            llmLatencyMs: event.llmLatencyMs,
            ttsLatencyMs: event.ttsLatencyMs,
          })
          onLatencyUpdateRef.current?.({
            sttLatencyMs: event.sttLatencyMs,
            llmLatencyMs: event.llmLatencyMs,
            ttsLatencyMs: event.ttsLatencyMs,
          })
        }
      ),
      ExpoCustomPipelineModule.addListener('onError', (event) => {
        console.error('[CustomPipeline Error]', event.message)
      }),
    ]

    subscriptions.current = subs

    return () => {
      subs.forEach((s) => s.remove())
    }
  }, [])

  const startConversation = useCallback(() => {
    setPartialTranscript('')
    setLatencyStats({ sttLatencyMs: 0, llmLatencyMs: 0, ttsLatencyMs: 0 })
    ExpoCustomPipelineModule.startConversation(config.apiUrl, config.apiKey, config.model)
    setIsListening(true)
  }, [config.apiUrl, config.apiKey, config.model])

  const stopConversation = useCallback(() => {
    ExpoCustomPipelineModule.stopConversation()
    setIsListening(false)
    setIsSpeaking(false)
    setPartialTranscript('')
  }, [])

  return {
    isListening,
    isSpeaking,
    partialTranscript,
    latencyStats,
    startConversation,
    stopConversation,
  }
}
