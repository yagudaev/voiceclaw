import { useEffect, useCallback, useState, useRef } from 'react'

import ExpoCustomPipelineModule from '../modules/expo-custom-pipeline/src/ExpoCustomPipelineModule'
import type {
  PartialTranscriptEvent,
  FinalTranscriptEvent,
} from '../modules/expo-custom-pipeline/src/ExpoCustomPipeline.types'

export type CustomPipelineConfig = {
  apiUrl: string
  apiKey: string
  model: string
}

export type CustomPipelineState = {
  isListening: boolean
  isSpeaking: boolean
  partialTranscript: string
  startListening: () => void
  stopListening: () => void
}

export function useCustomPipeline(_config: CustomPipelineConfig): CustomPipelineState {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [partialTranscript, setPartialTranscript] = useState('')
  const subscriptions = useRef<Array<{ remove: () => void }>>([])

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
      ExpoCustomPipelineModule.addListener('onError', (event) => {
        console.error('[CustomPipeline Error]', event.message)
      }),
    ]

    subscriptions.current = subs

    return () => {
      subs.forEach((s) => s.remove())
    }
  }, [])

  const startListening = useCallback(() => {
    setPartialTranscript('')
    ExpoCustomPipelineModule.startListening()
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    ExpoCustomPipelineModule.stopListening()
    setIsListening(false)
    setIsSpeaking(false)
    setPartialTranscript('')
  }, [])

  return {
    isListening,
    isSpeaking,
    partialTranscript,
    startListening,
    stopListening,
  }
}
