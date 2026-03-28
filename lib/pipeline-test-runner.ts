import ExpoCustomPipelineModule from '@/modules/expo-custom-pipeline/src/ExpoCustomPipelineModule'
import { getApiConfig, streamCompletion } from '@/lib/chat'
import { getSetting } from '@/db'

export type TestResult = {
  name: string
  passed: boolean
  error?: string
  durationMs: number
}

type EventLog = { event: string, time: number, data?: any }

export async function runPipelineTests(
  onProgress: (msg: string) => void,
): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Verify API is configured before running tests
  const { apiKey, apiUrl } = await getApiConfig()
  if (!apiKey || !apiUrl) {
    return [{ name: 'Pre-check: API configured', passed: false, error: 'API key or URL not set', durationMs: 0 }]
  }

  // Configure providers
  const sttProvider = (await getSetting('stt_provider')) || 'apple'
  const ttsProvider = (await getSetting('tts_provider')) || 'apple'
  const ttsConfig: Record<string, string> = {}

  if (ttsProvider === 'elevenlabs') {
    const key = await getSetting('elevenlabs_api_key')
    const voice = await getSetting('elevenlabs_voice_id')
    if (key) ttsConfig.apiKey = key
    if (voice) ttsConfig.voiceId = voice
  } else if (ttsProvider === 'openai') {
    const key = await getSetting('openai_tts_api_key')
    const voice = await getSetting('openai_tts_voice')
    if (key) ttsConfig.apiKey = key
    if (voice) ttsConfig.voice = voice
  }

  ExpoCustomPipelineModule.setSTTProvider(sttProvider, {})
  ExpoCustomPipelineModule.setTTSProvider(ttsProvider, ttsConfig)

  onProgress('Providers configured, running tests...')

  // Test 1: Single turn
  results.push(await runSingleTurnTest(onProgress))

  // Small delay between tests
  await delay(1000)

  // Test 2: Multi-turn
  results.push(await runMultiTurnTest(onProgress))

  await delay(1000)

  // Test 3: Barge-in (interrupt during TTS)
  results.push(await runBargeInTest(onProgress))

  // Cleanup
  ExpoCustomPipelineModule.stopListening()
  ExpoCustomPipelineModule.stopSpeaking()
  ExpoCustomPipelineModule.stopBargeInDetection()

  return results
}

async function runSingleTurnTest(onProgress: (msg: string) => void): Promise<TestResult> {
  const start = Date.now()
  onProgress('[Test 1/3] Single turn: simulating transcript...')

  try {
    const events = await runPipelineTurn('Say hello in one short sentence.', 15000)

    const hasTTSStart = events.some(e => e.event === 'onTTSStart')
    const hasTTSComplete = events.some(e => e.event === 'onTTSComplete')

    if (!hasTTSStart) {
      return { name: 'Single turn', passed: false, error: 'No onTTSStart event received', durationMs: Date.now() - start }
    }
    if (!hasTTSComplete) {
      return { name: 'Single turn', passed: false, error: 'No onTTSComplete event received', durationMs: Date.now() - start }
    }

    onProgress('[Test 1/3] Single turn: PASSED')
    return { name: 'Single turn', passed: true, durationMs: Date.now() - start }
  } catch (e: any) {
    return { name: 'Single turn', passed: false, error: e.message, durationMs: Date.now() - start }
  }
}

async function runMultiTurnTest(onProgress: (msg: string) => void): Promise<TestResult> {
  const start = Date.now()
  onProgress('[Test 2/3] Multi-turn: first turn...')

  try {
    // Turn 1
    const events1 = await runPipelineTurn('Say the word apple.', 15000)
    const hasTTS1 = events1.some(e => e.event === 'onTTSComplete')
    if (!hasTTS1) {
      return { name: 'Multi-turn', passed: false, error: 'Turn 1: No onTTSComplete', durationMs: Date.now() - start }
    }

    onProgress('[Test 2/3] Multi-turn: second turn...')
    await delay(500)

    // Turn 2
    const events2 = await runPipelineTurn('Say the word banana.', 15000)
    const hasTTS2 = events2.some(e => e.event === 'onTTSComplete')
    if (!hasTTS2) {
      return { name: 'Multi-turn', passed: false, error: 'Turn 2: No onTTSComplete', durationMs: Date.now() - start }
    }

    onProgress('[Test 2/3] Multi-turn: PASSED')
    return { name: 'Multi-turn', passed: true, durationMs: Date.now() - start }
  } catch (e: any) {
    return { name: 'Multi-turn', passed: false, error: e.message, durationMs: Date.now() - start }
  }
}

async function runBargeInTest(onProgress: (msg: string) => void): Promise<TestResult> {
  const start = Date.now()
  onProgress('[Test 3/3] Barge-in: starting turn then interrupting...')

  try {
    // Start a turn that will produce a long response
    const events = await runPipelineTurnWithBargeIn(
      'Tell me a long story about a dragon. Make it at least 5 sentences.',
      'Stop talking.',
      15000
    )

    // We expect: first turn starts TTS, then barge-in fires simulateFinalTranscript
    // which should cancel TTS and start a new LLM call
    const ttsStarts = events.filter(e => e.event === 'onTTSStart')
    const finalTranscripts = events.filter(e => e.event === 'onFinalTranscript')

    if (ttsStarts.length === 0) {
      return { name: 'Barge-in', passed: false, error: 'No TTS started for initial turn', durationMs: Date.now() - start }
    }
    if (finalTranscripts.length < 2) {
      return { name: 'Barge-in', passed: false, error: `Expected 2 final transcripts (original + interrupt), got ${finalTranscripts.length}`, durationMs: Date.now() - start }
    }

    onProgress('[Test 3/3] Barge-in: PASSED')
    return { name: 'Barge-in', passed: true, durationMs: Date.now() - start }
  } catch (e: any) {
    return { name: 'Barge-in', passed: false, error: e.message, durationMs: Date.now() - start }
  }
}

// --- Helpers ---

function runPipelineTurn(userText: string, timeoutMs: number): Promise<EventLog[]> {
  return new Promise((resolve, reject) => {
    const events: EventLog[] = []
    const subs: Array<{ remove: () => void }> = []
    let settled = false

    const cleanup = () => {
      subs.forEach(s => s.remove())
    }

    const finish = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(events)
    }

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error(`Timed out after ${timeoutMs}ms. Events: ${events.map(e => e.event).join(', ')}`))
      }
    }, timeoutMs)

    let pendingTTS = 0
    let streamDone = false

    subs.push(
      ExpoCustomPipelineModule.addListener('onFinalTranscript', (event) => {
        events.push({ event: 'onFinalTranscript', time: Date.now(), data: event })
      }),
      ExpoCustomPipelineModule.addListener('onTTSStart', () => {
        events.push({ event: 'onTTSStart', time: Date.now() })
      }),
      ExpoCustomPipelineModule.addListener('onTTSComplete', () => {
        pendingTTS = Math.max(0, pendingTTS - 1)
        events.push({ event: 'onTTSComplete', time: Date.now() })
        if (pendingTTS === 0 && streamDone) {
          clearTimeout(timeout)
          finish()
        }
      }),
      ExpoCustomPipelineModule.addListener('onError', (event) => {
        events.push({ event: 'onError', time: Date.now(), data: event })
      }),
    )

    // Drive the LLM + TTS manually (same logic as use-pipeline but inline)
    driveLLMAndTTS(userText, {
      onSpeakSentence: () => { pendingTTS += 1 },
      onStreamDone: () => { streamDone = true },
      onError: (err) => {
        if (!settled) {
          settled = true
          cleanup()
          clearTimeout(timeout)
          reject(new Error(`LLM error: ${err}`))
        }
      },
    })

    // Simulate the final transcript to kick things off
    ExpoCustomPipelineModule.simulateFinalTranscript(userText)
  })
}

function runPipelineTurnWithBargeIn(
  userText: string,
  interruptText: string,
  timeoutMs: number
): Promise<EventLog[]> {
  return new Promise((resolve, reject) => {
    const events: EventLog[] = []
    const subs: Array<{ remove: () => void }> = []
    let settled = false
    let bargeInSent = false

    const cleanup = () => { subs.forEach(s => s.remove()) }
    const finish = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(events)
    }

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error(`Timed out after ${timeoutMs}ms. Events: ${events.map(e => e.event).join(', ')}`))
      }
    }, timeoutMs)

    let pendingTTS = 0
    let streamDone = false
    let interruptStreamDone = false
    let interruptPendingTTS = 0

    subs.push(
      ExpoCustomPipelineModule.addListener('onFinalTranscript', (event) => {
        events.push({ event: 'onFinalTranscript', time: Date.now(), data: event })
      }),
      ExpoCustomPipelineModule.addListener('onTTSStart', () => {
        events.push({ event: 'onTTSStart', time: Date.now() })
        // Send barge-in on first TTS start
        if (!bargeInSent) {
          bargeInSent = true
          console.log('[PipelineTest] TTS started — sending barge-in interrupt in 500ms')
          setTimeout(() => {
            console.log('[PipelineTest] Sending barge-in: simulateFinalTranscript')
            ExpoCustomPipelineModule.stopSpeaking()
            pendingTTS = 0
            streamDone = false

            // Drive second LLM call for the interrupt
            driveLLMAndTTS(interruptText, {
              onSpeakSentence: () => { interruptPendingTTS += 1 },
              onStreamDone: () => { interruptStreamDone = true },
              onError: () => {},
            })

            ExpoCustomPipelineModule.simulateFinalTranscript(interruptText)
          }, 500)
        }
      }),
      ExpoCustomPipelineModule.addListener('onTTSComplete', () => {
        events.push({ event: 'onTTSComplete', time: Date.now() })
        if (bargeInSent) {
          interruptPendingTTS = Math.max(0, interruptPendingTTS - 1)
          if (interruptPendingTTS === 0 && interruptStreamDone) {
            clearTimeout(timeout)
            finish()
          }
        } else {
          pendingTTS = Math.max(0, pendingTTS - 1)
        }
      }),
      ExpoCustomPipelineModule.addListener('onError', (event) => {
        events.push({ event: 'onError', time: Date.now(), data: event })
      }),
    )

    // Drive first LLM call
    driveLLMAndTTS(userText, {
      onSpeakSentence: () => { pendingTTS += 1 },
      onStreamDone: () => { streamDone = true },
      onError: (err) => {
        if (!settled) {
          settled = true
          cleanup()
          clearTimeout(timeout)
          reject(new Error(`LLM error: ${err}`))
        }
      },
    })

    ExpoCustomPipelineModule.simulateFinalTranscript(userText)
  })
}

type DriveCallbacks = {
  onSpeakSentence: () => void
  onStreamDone: () => void
  onError: (err: string) => void
}

async function driveLLMAndTTS(userText: string, cb: DriveCallbacks) {
  const { apiKey, apiUrl, model } = await getApiConfig()
  if (!apiKey || !apiUrl) { cb.onError('API not configured'); return }

  let fullResponse = ''
  let sentenceBuffer = ''

  streamCompletion(
    [{ role: 'user', content: userText }],
    apiKey,
    model,
    apiUrl,
    '',
    0,
    {
      onToken: (text) => {
        const newChars = text.slice(fullResponse.length)
        fullResponse = text
        sentenceBuffer += newChars
        // Try to speak complete sentences
        const endings = ['.', '!', '?', '\n']
        let lastIdx = -1
        for (let i = sentenceBuffer.length - 1; i >= 0; i--) {
          if (endings.includes(sentenceBuffer[i])) { lastIdx = i; break }
        }
        if (lastIdx !== -1) {
          const sentence = sentenceBuffer.slice(0, lastIdx + 1).trim()
          sentenceBuffer = sentenceBuffer.slice(lastIdx + 1)
          if (sentence) {
            cb.onSpeakSentence()
            ExpoCustomPipelineModule.speak(sentence)
          }
        }
      },
      onDone: () => {
        const remaining = sentenceBuffer.trim()
        sentenceBuffer = ''
        if (remaining) {
          cb.onSpeakSentence()
          ExpoCustomPipelineModule.speak(remaining)
        }
        cb.onStreamDone()
      },
      onError: (err) => { cb.onError(err) },
    }
  )
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
