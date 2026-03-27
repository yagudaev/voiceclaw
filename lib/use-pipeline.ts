import { useCallback, useRef } from 'react'

import type { LatencyData } from '@/db'
import { getApiConfig } from '@/lib/chat'
import { streamCompletion } from '@/lib/chat'
import ExpoCustomPipelineModule from '@/modules/expo-custom-pipeline/src/ExpoCustomPipelineModule'
import type {
  FinalTranscriptEvent,
  PartialTranscriptEvent,
} from '@/modules/expo-custom-pipeline/src/ExpoCustomPipeline.types'

export type PipelineCallbacks = {
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onAssistantResponse?: (text: string) => void
  onTTSStart?: () => void
  onTTSComplete?: () => void
  onError?: (message: string) => void
  onLatencyUpdate?: (latency: LatencyData) => void
}

export type PipelineControls = {
  start: () => void
  stop: () => void
}

export function usePipeline(callbacks: PipelineCallbacks): PipelineControls {
  const subsRef = useRef<Array<{ remove: () => void }>>([])
  const pendingTTSCountRef = useRef(0)
  const isStreamCompleteRef = useRef(false)
  const sentenceBufferRef = useRef('')
  const stopCompletionRef = useRef<(() => void) | null>(null)
  const isActiveRef = useRef(false)

  // Latency tracking
  const finalTranscriptTimeRef = useRef<number | null>(null)
  const firstTokenTimeRef = useRef<number | null>(null)
  const speakStartTimesRef = useRef<number[]>([])
  const sttLatencyMsRef = useRef<number>(0)
  const llmLatencyMsRef = useRef<number>(0)
  const ttsLatencyMsRef = useRef<number>(0)

  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  const restartSTTIfReady = useCallback(() => {
    if (!isActiveRef.current) return
    if (!isStreamCompleteRef.current) return
    if (pendingTTSCountRef.current > 0) return

    isStreamCompleteRef.current = false
    sentenceBufferRef.current = ''
    callbacksRef.current.onLatencyUpdate?.({
      sttLatencyMs: sttLatencyMsRef.current,
      llmLatencyMs: llmLatencyMsRef.current,
      ttsLatencyMs: ttsLatencyMsRef.current,
    })
    startListening()
  }, [])

  const speakSentence = useCallback((sentence: string) => {
    pendingTTSCountRef.current += 1
    speakStartTimesRef.current.push(Date.now())
    ExpoCustomPipelineModule.speak(sentence)
  }, [])

  const flushSentenceBuffer = useCallback(() => {
    const remaining = sentenceBufferRef.current.trim()
    sentenceBufferRef.current = ''
    if (remaining) {
      speakSentence(remaining)
    }
  }, [speakSentence])

  const trySpeakCompleteSentences = useCallback(() => {
    const sentenceEndings = ['.', '!', '?', '\n']
    const buf = sentenceBufferRef.current
    let lastIdx = -1
    for (let i = buf.length - 1; i >= 0; i--) {
      if (sentenceEndings.includes(buf[i])) {
        lastIdx = i
        break
      }
    }
    if (lastIdx === -1) return

    const sentence = buf.slice(0, lastIdx + 1).trim()
    sentenceBufferRef.current = buf.slice(lastIdx + 1)

    if (sentence) {
      speakSentence(sentence)
    }
  }, [speakSentence])

  const callAPI = useCallback((userText: string) => {
    firstTokenTimeRef.current = null
    sentenceBufferRef.current = ''
    pendingTTSCountRef.current = 0
    isStreamCompleteRef.current = false

    const doCall = async () => {
      const { apiKey, apiUrl, model } = await getApiConfig()
      if (!apiKey || !apiUrl) {
        callbacksRef.current.onError?.('API not configured')
        return
      }

      let fullResponse = ''
      const llmStartTime = Date.now()

      stopCompletionRef.current = streamCompletion(
        [{ role: 'user', content: userText }],
        apiKey,
        model,
        apiUrl,
        '',
        0,
        {
          onToken: (text) => {
            if (!isActiveRef.current) return

            // Track LLM latency (time to first token)
            if (firstTokenTimeRef.current === null) {
              llmLatencyMsRef.current = Date.now() - llmStartTime
              firstTokenTimeRef.current = Date.now()
            }

            const newChars = text.slice(fullResponse.length)
            fullResponse = text
            sentenceBufferRef.current += newChars
            trySpeakCompleteSentences()
          },
          onDone: (text) => {
            if (!isActiveRef.current) return
            callbacksRef.current.onAssistantResponse?.(text)
            isStreamCompleteRef.current = true
            flushSentenceBuffer()
            restartSTTIfReady()
          },
          onError: (error) => {
            if (!isActiveRef.current) return
            callbacksRef.current.onError?.(error)
            isStreamCompleteRef.current = true
            restartSTTIfReady()
          },
        }
      )
    }

    doCall()
  }, [trySpeakCompleteSentences, flushSentenceBuffer, restartSTTIfReady])

  const startListening = useCallback(() => {
    if (!isActiveRef.current) return

    // Reset latency for new turn
    finalTranscriptTimeRef.current = null
    firstTokenTimeRef.current = null
    sttLatencyMsRef.current = 0
    llmLatencyMsRef.current = 0
    ttsLatencyMsRef.current = 0

    ExpoCustomPipelineModule.startListening()
  }, [])

  const start = useCallback(() => {
    isActiveRef.current = true
    pendingTTSCountRef.current = 0
    isStreamCompleteRef.current = false
    sentenceBufferRef.current = ''

    // Clear any old subs
    subsRef.current.forEach((s) => s.remove())

    subsRef.current = [
      ExpoCustomPipelineModule.addListener(
        'onPartialTranscript',
        (event: PartialTranscriptEvent) => {
          callbacksRef.current.onPartialTranscript?.(event.text)
        }
      ),
      ExpoCustomPipelineModule.addListener(
        'onFinalTranscript',
        (event: FinalTranscriptEvent) => {
          const now = Date.now()
          // STT latency: time from startListening call to final transcript
          // We use finalTranscriptTimeRef to compute it relative to when we started listening
          // (simple approximation: wall-clock time captured when listening started)
          if (finalTranscriptTimeRef.current != null) {
            sttLatencyMsRef.current = now - finalTranscriptTimeRef.current
          }
          finalTranscriptTimeRef.current = now

          callbacksRef.current.onFinalTranscript?.(event.text)
          callAPI(event.text)
        }
      ),
      ExpoCustomPipelineModule.addListener('onTTSStart', () => {
        // TTS latency: time from speak() call to onTTSStart
        const speakTime = speakStartTimesRef.current.shift()
        if (speakTime != null) {
          ttsLatencyMsRef.current = Date.now() - speakTime
        }
        callbacksRef.current.onTTSStart?.()
      }),
      ExpoCustomPipelineModule.addListener('onTTSComplete', () => {
        pendingTTSCountRef.current = Math.max(0, pendingTTSCountRef.current - 1)
        callbacksRef.current.onTTSComplete?.()
        restartSTTIfReady()
      }),
      ExpoCustomPipelineModule.addListener('onError', (event) => {
        pendingTTSCountRef.current = Math.max(0, pendingTTSCountRef.current - 1)
        callbacksRef.current.onError?.(event.message)
        restartSTTIfReady()
      }),
    ]

    // Mark the start-listening time for STT latency
    finalTranscriptTimeRef.current = Date.now()
    ExpoCustomPipelineModule.startListening()
  }, [callAPI, restartSTTIfReady])

  const stop = useCallback(() => {
    isActiveRef.current = false
    stopCompletionRef.current?.()
    stopCompletionRef.current = null
    ExpoCustomPipelineModule.stopListening()
    ExpoCustomPipelineModule.stopSpeaking()
    subsRef.current.forEach((s) => s.remove())
    subsRef.current = []
    pendingTTSCountRef.current = 0
    isStreamCompleteRef.current = false
    sentenceBufferRef.current = ''
    speakStartTimesRef.current = []
  }, [])

  return { start, stop }
}
