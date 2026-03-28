import { useCallback, useRef } from 'react'

import type { LatencyData } from '@/db'
import { getApiConfig } from '@/lib/chat'
import { streamCompletion } from '@/lib/chat'
import ExpoCustomPipelineModule from '@/modules/expo-custom-pipeline/src/ExpoCustomPipelineModule'
import type {
  FinalTranscriptEvent,
  PartialTranscriptEvent,
} from '@/modules/expo-custom-pipeline/src/ExpoCustomPipeline.types'

type PipelineMessage = {
  role: string
  content: string
}

export type PipelineCallbacks = {
  getConversationId?: () => number | null
  buildMessages?: (userText: string) => Promise<PipelineMessage[]>
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onLLMToken?: (text: string) => void
  onLLMComplete?: (text: string) => void
  onAssistantResponse?: (text: string) => void
  onSpeakRequested?: (text: string) => void
  onTTSStart?: () => void
  onTTSComplete?: () => void
  onError?: (message: string) => void
  onLatencyUpdate?: (latency: LatencyData) => void
}

export type PipelineControls = {
  start: () => void
  stop: () => void
  interrupt: () => void
}

export function usePipeline(callbacks: PipelineCallbacks): PipelineControls {
  const subsRef = useRef<Array<{ remove: () => void }>>([])
  const pendingTTSCountRef = useRef(0)
  const isStreamCompleteRef = useRef(false)
  const sentenceBufferRef = useRef('')
  const stopCompletionRef = useRef<(() => void) | null>(null)
  const isActiveRef = useRef(false)
  const bargeInActiveRef = useRef(false)
  const activeTurnIdRef = useRef(0)

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
    console.log('[Pipeline] restartSTTIfReady called — isActive:', isActiveRef.current, 'isStreamComplete:', isStreamCompleteRef.current, 'pendingTTS:', pendingTTSCountRef.current)
    if (!isActiveRef.current) { console.log('[Pipeline] restartSTT BLOCKED: not active'); return }
    if (!isStreamCompleteRef.current) { console.log('[Pipeline] restartSTT BLOCKED: stream not complete'); return }

    if (pendingTTSCountRef.current > 0) { console.log('[Pipeline] restartSTT BLOCKED: pending TTS:', pendingTTSCountRef.current); return }

    console.log('[Pipeline] restartSTT — ALL CONDITIONS MET, restarting STT')
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
    callbacksRef.current.onSpeakRequested?.(sentence)
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
    const turnId = activeTurnIdRef.current + 1
    activeTurnIdRef.current = turnId
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
      const conversationId = callbacksRef.current.getConversationId?.() ?? 0
      const requestMessages = callbacksRef.current.buildMessages
        ? await callbacksRef.current.buildMessages(userText)
        : [{ role: 'user', content: userText }]

      let fullResponse = ''
      const llmStartTime = Date.now()

      stopCompletionRef.current = streamCompletion(
        requestMessages,
        apiKey,
        model,
        apiUrl,
        '',
        conversationId,
        {
          onToken: (text) => {
            if (turnId !== activeTurnIdRef.current) return
            if (!isActiveRef.current) return

            // Track LLM latency (time to first token)
            if (firstTokenTimeRef.current === null) {
              llmLatencyMsRef.current = Date.now() - llmStartTime
              firstTokenTimeRef.current = Date.now()
            }

            const newChars = text.slice(fullResponse.length)
            fullResponse = text
            callbacksRef.current.onLLMToken?.(text)
            sentenceBufferRef.current += newChars
            trySpeakCompleteSentences()
          },
          onDone: (text) => {
            if (turnId !== activeTurnIdRef.current) return
            console.log('[Pipeline] LLM onDone — pendingTTS:', pendingTTSCountRef.current, 'isActive:', isActiveRef.current)
            if (!isActiveRef.current) return
            callbacksRef.current.onLLMComplete?.(text)
            callbacksRef.current.onAssistantResponse?.(text)
            isStreamCompleteRef.current = true
            flushSentenceBuffer()
            console.log('[Pipeline] After flushSentenceBuffer — pendingTTS:', pendingTTSCountRef.current)
            restartSTTIfReady()
          },
          onError: (error) => {
            if (turnId !== activeTurnIdRef.current) return
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
    console.log('[Pipeline] startListening called — isActive:', isActiveRef.current)
    if (!isActiveRef.current) { console.log('[Pipeline] startListening BLOCKED: not active'); return }

    // Reset latency for new turn
    finalTranscriptTimeRef.current = null
    firstTokenTimeRef.current = null
    sttLatencyMsRef.current = 0
    llmLatencyMsRef.current = 0
    ttsLatencyMsRef.current = 0

    console.log('[Pipeline] Calling ExpoCustomPipelineModule.startListening()')
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
          if (finalTranscriptTimeRef.current != null) {
            sttLatencyMsRef.current = now - finalTranscriptTimeRef.current
          }
          finalTranscriptTimeRef.current = now

          // Final transcripts end the current listen turn. Stop the active
          // recognizer explicitly so the next restart is never blocked on
          // lingering native STT state.
          ExpoCustomPipelineModule.stopListening()

          // Barge-in: cancel any in-progress LLM stream and TTS playback
          console.log('[Pipeline] onFinalTranscript — cancelling pending LLM/TTS for barge-in')
          activeTurnIdRef.current += 1
          stopCompletionRef.current?.()
          stopCompletionRef.current = null
          ExpoCustomPipelineModule.stopSpeaking()
          if (bargeInActiveRef.current) {
            bargeInActiveRef.current = false
            ExpoCustomPipelineModule.stopBargeInDetection()
          }
          pendingTTSCountRef.current = 0
          sentenceBufferRef.current = ''
          speakStartTimesRef.current = []

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
        // Start VAD once per response (not per sentence)
        if (!bargeInActiveRef.current) {
          bargeInActiveRef.current = true
          ExpoCustomPipelineModule.startBargeInDetection()
        }
        callbacksRef.current.onTTSStart?.()
      }),
      ExpoCustomPipelineModule.addListener('onTTSComplete', () => {
        pendingTTSCountRef.current = Math.max(0, pendingTTSCountRef.current - 1)
        console.log('[Pipeline] onTTSComplete — pendingTTS now:', pendingTTSCountRef.current, 'isStreamComplete:', isStreamCompleteRef.current)
        callbacksRef.current.onTTSComplete?.()
        if (pendingTTSCountRef.current === 0) {
          // Stop VAD when all TTS finished — STT will take over
          if (bargeInActiveRef.current) {
            bargeInActiveRef.current = false
            ExpoCustomPipelineModule.stopBargeInDetection()
          }
          if (isStreamCompleteRef.current) {
            callbacksRef.current.onLatencyUpdate?.({
              sttLatencyMs: sttLatencyMsRef.current,
              llmLatencyMs: llmLatencyMsRef.current,
              ttsLatencyMs: ttsLatencyMsRef.current,
            })
          }
        }
        restartSTTIfReady()
      }),
      ExpoCustomPipelineModule.addListener('onBargeIn', () => {
        console.log('[Pipeline] onBargeIn — user voice detected, interrupting')
        bargeInActiveRef.current = false
        ExpoCustomPipelineModule.stopBargeInDetection()
        // Cancel in-progress LLM and TTS
        activeTurnIdRef.current += 1
        stopCompletionRef.current?.()
        stopCompletionRef.current = null
        ExpoCustomPipelineModule.stopSpeaking()
        pendingTTSCountRef.current = 0
        sentenceBufferRef.current = ''
        speakStartTimesRef.current = []
        isStreamCompleteRef.current = false
        // Start listening for the user's speech
        startListening()
      }),
      ExpoCustomPipelineModule.addListener('onError', (event) => {
        pendingTTSCountRef.current = Math.max(0, pendingTTSCountRef.current - 1)
        console.log('[Pipeline] onError:', event.message, '— pendingTTS now:', pendingTTSCountRef.current)
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
    activeTurnIdRef.current += 1
    stopCompletionRef.current?.()
    stopCompletionRef.current = null
    ExpoCustomPipelineModule.stopListening()
    ExpoCustomPipelineModule.stopSpeaking()
    bargeInActiveRef.current = false
    ExpoCustomPipelineModule.stopBargeInDetection()
    subsRef.current.forEach((s) => s.remove())
    subsRef.current = []
    pendingTTSCountRef.current = 0
    isStreamCompleteRef.current = false
    sentenceBufferRef.current = ''
    speakStartTimesRef.current = []
  }, [])

  const interrupt = useCallback(() => {
    if (!isActiveRef.current) return
    console.log('[Pipeline] interrupt — user tapped to interrupt')
    ExpoCustomPipelineModule.stopBargeInDetection()
    activeTurnIdRef.current += 1
    stopCompletionRef.current?.()
    stopCompletionRef.current = null
    ExpoCustomPipelineModule.stopSpeaking()
    pendingTTSCountRef.current = 0
    sentenceBufferRef.current = ''
    speakStartTimesRef.current = []
    isStreamCompleteRef.current = false
    startListening()
  }, [])

  return { start, stop, interrupt }
}
