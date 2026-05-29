// useDirectGemini — "Direct to provider" hook for Gemini Live.
//
// Architecture:
//  - Two WebSockets in parallel:
//    1. Relay WS (existing desktop URL) for session.prep, mint_token, tool.exec.
//    2. Gemini WS opened with the ephemeral token returned by the relay; all
//       audio in/out and transcripts ride this socket.
//  - The mic capture path is shared with the relay-proxy hook
//    (ExpoRealtimeAudioModule.onAudioCaptured / onAudioCapturedRaw); we just
//    intercept the gated frames, downsample 24 → 16 kHz, and forward as
//    realtimeInput.audio. Playback feeds Gemini's inlineData straight into
//    ExpoRealtimeAudioModule.playAudio.
//  - UI callbacks match `RealtimeCallbacks` so chat rendering is identical.
//  - Tool calls: Gemini's `toolCall` is fanned out as one `tool.exec` per
//    function call to the relay; the relay's `tool.result` / `tool.error`
//    closes the call and a `toolResponse` is sent back to Gemini.
//
// Skipped for v1 (relay-proxy fallback handles these — see index.tsx):
//  - sessionResumption + goAway-driven rotation
//  - reconnect with replayed pending audio / control queue

import { useCallback, useEffect, useRef, useState } from 'react'
import ExpoRealtimeAudioModule from '@/modules/expo-realtime-audio/src/ExpoRealtimeAudioModule'
import { captureMobile } from '@/lib/telemetry'
import type { RealtimeCallbacks, RealtimeConfig, RealtimeControls } from '@/lib/use-realtime'

const GEMINI_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'
const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview'
const DEFAULT_VOICE = 'Zephyr'
const PREP_TIMEOUT_MS = 8000
const TOKEN_TIMEOUT_MS = 8000
const SETUP_TIMEOUT_MS = 15000

type GeminiFunctionDeclaration = {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface DirectGeminiCallbacks extends RealtimeCallbacks {
  // Surfaced when direct-mode setup fails (token mint, prep, or Gemini setup).
  // The caller is expected to fall back to the relay-proxy path.
  onDirectModeFailure?: (reason: string) => void
}

export function useDirectGemini(callbacks: DirectGeminiCallbacks): RealtimeControls {
  const relayWsRef = useRef<WebSocket | null>(null)
  const geminiWsRef = useRef<WebSocket | null>(null)
  const configRef = useRef<RealtimeConfig | null>(null)
  const userStoppedRef = useRef(false)
  const mutedRef = useRef(false)
  const turnStartedAtRef = useRef<number | null>(null)
  const assistantSpeakingRef = useRef(false)
  const droppedMicFramesRef = useRef(0)
  const currentUserTextRef = useRef('')
  const currentAssistantTextRef = useRef('')
  const userSpeakingRef = useRef(false)
  const pendingPrepResolversRef = useRef<{
    resolve: (r: { instructions: string, tools: GeminiFunctionDeclaration[] }) => void
    reject: (e: Error) => void
  } | null>(null)
  const pendingTokenResolversRef = useRef<{
    resolve: (r: { token: string }) => void
    reject: (e: Error) => void
  } | null>(null)
  const pendingToolCallsRef = useRef<Map<string, { name: string, startedAt: number }>>(new Map())

  const [isConnected, setIsConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Forward native logs to JS console — same as use-realtime.
  useEffect(() => {
    const sub = ExpoRealtimeAudioModule.addListener('onLog', (event: { message: string }) => {
      console.log('[native]', event.message)
    })
    return () => sub.remove()
  }, [])

  // Forward RMS metrics.
  useEffect(() => {
    const sub = ExpoRealtimeAudioModule.addListener('onRmsMetrics', (event) => {
      callbacksRef.current.onRmsMetrics?.(event as never)
    })
    return () => sub.remove()
  }, [])

  // Mic capture → downsample 24→16 → Gemini.
  useEffect(() => {
    const gatedSub = ExpoRealtimeAudioModule.addListener(
      'onAudioCaptured',
      (event: { data: string }) => {
        if (mutedRef.current) return
        if (assistantSpeakingRef.current) {
          droppedMicFramesRef.current++
          if (droppedMicFramesRef.current % 100 === 1) {
            console.log(`[direct-gemini] mic gated while assistant speaking (dropped=${droppedMicFramesRef.current})`)
          }
          return
        }
        const ws = geminiWsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        const downsampled = downsample24to16(event.data)
        ws.send(JSON.stringify({
          realtimeInput: {
            audio: { data: downsampled, mimeType: 'audio/pcm;rate=16000' },
          },
        }))
      },
    )
    return () => gatedSub.remove()
  }, [])

  const cleanup = useCallback(() => {
    try { geminiWsRef.current?.close() } catch {}
    geminiWsRef.current = null
    try { relayWsRef.current?.close() } catch {}
    relayWsRef.current = null
    pendingPrepResolversRef.current = null
    pendingTokenResolversRef.current = null
    pendingToolCallsRef.current.clear()
    assistantSpeakingRef.current = false
    droppedMicFramesRef.current = 0
    currentUserTextRef.current = ''
    currentAssistantTextRef.current = ''
    userSpeakingRef.current = false
  }, [])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const handleGeminiMessage = useCallback((raw: string) => {
    const cb = callbacksRef.current
    let msg: Record<string, unknown>
    try { msg = JSON.parse(raw) }
    catch { return }

    if (msg.setupComplete !== undefined) {
      console.log('[direct-gemini] setupComplete')
      const id = `direct-gemini-${Date.now()}`
      setSessionId(id)
      setIsConnected(true)
      cb.onSessionReady?.(id)
      if (configRef.current?.volume != null) {
        ExpoRealtimeAudioModule.setVolume(configRef.current.volume)
      }
      if (configRef.current?.echoGateEnabled != null) {
        ExpoRealtimeAudioModule.setEchoGateEnabled(configRef.current.echoGateEnabled)
      }
      if (configRef.current?.echoGateThreshold != null) {
        ExpoRealtimeAudioModule.setEchoGateThreshold(configRef.current.echoGateThreshold)
      }
      ExpoRealtimeAudioModule.setDebugMetricsEnabled(configRef.current?.debugMode ?? false)
      ExpoRealtimeAudioModule.startCapture()
      return
    }

    const sc = msg.serverContent as Record<string, unknown> | undefined
    if (sc) {
      handleServerContent(sc)
      return
    }

    const tc = msg.toolCall as { functionCalls?: { id: string, name: string, args?: unknown }[] } | undefined
    if (tc?.functionCalls) {
      for (const call of tc.functionCalls) {
        handleGeminiToolCall(call.id, call.name, call.args ?? {})
      }
      return
    }
  }, [])

  function handleServerContent(content: Record<string, unknown>) {
    const cb = callbacksRef.current

    // Gate cleanup: any signal that the model finished or was interrupted re-opens the mic.
    if (content.generationComplete || content.turnComplete || content.interrupted) {
      if (assistantSpeakingRef.current) {
        if (droppedMicFramesRef.current > 0) {
          console.log(`[direct-gemini] mic re-opened (dropped ${droppedMicFramesRef.current} echo-window frames)`)
        }
        assistantSpeakingRef.current = false
        droppedMicFramesRef.current = 0
      }
    }

    const modelTurn = content.modelTurn as { parts?: { inlineData?: { data: string } }[] } | undefined
    if (modelTurn?.parts) {
      for (const part of modelTurn.parts) {
        const audioData = part.inlineData?.data
        if (typeof audioData === 'string' && audioData.length > 0) {
          assistantSpeakingRef.current = true
          ExpoRealtimeAudioModule.playAudio(audioData)
          if (turnStartedAtRef.current != null) turnStartedAtRef.current = null
        }
      }
    }

    const outT = content.outputTranscription as { text?: string } | undefined
    if (outT?.text) {
      if (currentUserTextRef.current) {
        cb.onTranscriptDone?.(currentUserTextRef.current, 'user')
        currentUserTextRef.current = ''
      }
      userSpeakingRef.current = false
      currentAssistantTextRef.current += outT.text
      cb.onTranscriptDelta?.(outT.text, 'assistant')
    }

    const inT = content.inputTranscription as { text?: string } | undefined
    if (inT?.text) {
      if (!userSpeakingRef.current) {
        userSpeakingRef.current = true
        turnStartedAtRef.current = Date.now()
        ExpoRealtimeAudioModule.stopPlayback()
        cb.onTurnStarted?.()
      }
      if (currentAssistantTextRef.current) {
        cb.onTranscriptDone?.(currentAssistantTextRef.current, 'assistant')
        currentAssistantTextRef.current = ''
      }
      currentUserTextRef.current += inT.text
      cb.onTranscriptDelta?.(inT.text, 'user')
    }

    if (content.turnComplete) {
      if (currentUserTextRef.current) {
        cb.onTranscriptDone?.(currentUserTextRef.current, 'user')
        currentUserTextRef.current = ''
      }
      if (currentAssistantTextRef.current) {
        cb.onTranscriptDone?.(currentAssistantTextRef.current, 'assistant')
        currentAssistantTextRef.current = ''
      }
      userSpeakingRef.current = false
      cb.onTurnEnded?.()
    }

    if (content.interrupted) {
      if (currentUserTextRef.current) {
        cb.onTranscriptDone?.(currentUserTextRef.current, 'user')
        currentUserTextRef.current = ''
      }
      if (currentAssistantTextRef.current) {
        cb.onTranscriptDone?.(currentAssistantTextRef.current + '...', 'assistant')
        currentAssistantTextRef.current = ''
      }
    }
  }

  function handleGeminiToolCall(callId: string, name: string, args: unknown) {
    const cb = callbacksRef.current
    const argsString = typeof args === 'string' ? args : JSON.stringify(args ?? {})
    pendingToolCallsRef.current.set(callId, { name, startedAt: Date.now() })
    cb.onToolCall?.(callId, name, argsString)
    const relay = relayWsRef.current
    if (!relay || relay.readyState !== WebSocket.OPEN) {
      // Should never happen — relay WS is required for the call to start. Surface as a failure.
      const err = 'relay WS not open for tool.exec'
      cb.onToolFailed?.(callId, name, 0, err, false)
      pendingToolCallsRef.current.delete(callId)
      const gemini = geminiWsRef.current
      gemini?.send(JSON.stringify({
        toolResponse: { functionResponses: [{ id: callId, response: { error: err } }] },
      }))
      return
    }
    relay.send(JSON.stringify({
      type: 'tool.exec',
      callId,
      name,
      arguments: argsString,
    }))
  }

  const handleRelayMessage = useCallback((raw: string) => {
    const cb = callbacksRef.current
    let data: Record<string, unknown>
    try { data = JSON.parse(raw) }
    catch { return }

    switch (data.type) {
      case 'session.prep.result': {
        const r = pendingPrepResolversRef.current
        pendingPrepResolversRef.current = null
        r?.resolve({
          instructions: String(data.instructions ?? ''),
          tools: Array.isArray(data.tools) ? (data.tools as GeminiFunctionDeclaration[]) : [],
        })
        return
      }
      case 'session.prep.error': {
        const r = pendingPrepResolversRef.current
        pendingPrepResolversRef.current = null
        r?.reject(new Error(String(data.message ?? 'session.prep.error')))
        return
      }
      case 'token': {
        const r = pendingTokenResolversRef.current
        pendingTokenResolversRef.current = null
        r?.resolve({ token: String(data.token ?? '') })
        return
      }
      case 'token.error': {
        const r = pendingTokenResolversRef.current
        pendingTokenResolversRef.current = null
        r?.reject(new Error(String(data.message ?? 'token.error')))
        return
      }
      case 'tool.progress': {
        cb.onToolProgress?.(String(data.callId), {
          textDelta: data.textDelta as string | undefined,
          step: data.step as string | undefined,
          summary: data.summary as string | undefined,
        })
        return
      }
      case 'tool.result': {
        const callId = String(data.callId)
        const name = String(data.name)
        const result = String(data.result ?? '')
        const durationMs = typeof data.durationMs === 'number' ? data.durationMs : 0
        const pending = pendingToolCallsRef.current.get(callId)
        pendingToolCallsRef.current.delete(callId)
        cb.onToolCompleted?.(callId, name, durationMs, result)
        // Echo the result back to Gemini so the model can continue.
        let parsed: Record<string, unknown>
        try { parsed = JSON.parse(result) }
        catch { parsed = { result } }
        const gemini = geminiWsRef.current
        gemini?.send(JSON.stringify({
          toolResponse: { functionResponses: [{ id: callId, response: parsed }] },
        }))
        // Silence the unused var lint — pending is used implicitly for cleanup.
        void pending
        return
      }
      case 'tool.error': {
        const callId = String(data.callId)
        const name = String(data.name)
        const errMessage = String(data.error ?? 'tool failed')
        const durationMs = typeof data.durationMs === 'number' ? data.durationMs : 0
        pendingToolCallsRef.current.delete(callId)
        cb.onToolFailed?.(callId, name, durationMs, errMessage, false)
        const gemini = geminiWsRef.current
        gemini?.send(JSON.stringify({
          toolResponse: { functionResponses: [{ id: callId, response: { error: errMessage } }] },
        }))
        return
      }
    }
  }, [])

  const openRelayWs = useCallback((serverUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(serverUrl)
      relayWsRef.current = ws
      const timer = setTimeout(() => {
        try { ws.close() } catch {}
        reject(new Error('relay WS timeout'))
      }, PREP_TIMEOUT_MS)
      ws.onopen = () => {
        clearTimeout(timer)
        resolve()
      }
      ws.onmessage = (e) => handleRelayMessage(String(e.data))
      ws.onerror = () => {
        // Surface only when no other handler resolved; if the WS dies mid-call,
        // we end the session via onclose.
      }
      ws.onclose = () => {
        if (relayWsRef.current === ws) {
          relayWsRef.current = null
        }
        // Mid-call relay drop means tools can no longer reach the desktop. End
        // the call so the user (and the auto-reconnect machinery) can recover.
        // The Gemini WS close handler in turn fires onDisconnect.
        if (!userStoppedRef.current && geminiWsRef.current) {
          console.warn('[direct-gemini] relay WS closed mid-call — tearing down')
          try { geminiWsRef.current.close() } catch {}
        }
      }
    })
  }, [handleRelayMessage])

  const sendOnRelay = useCallback((payload: object) => {
    const ws = relayWsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('relay WS not open')
    }
    ws.send(JSON.stringify(payload))
  }, [])

  const requestPrep = useCallback((config: RealtimeConfig): Promise<{ instructions: string, tools: GeminiFunctionDeclaration[] }> => {
    return new Promise((resolve, reject) => {
      pendingPrepResolversRef.current = { resolve, reject }
      const timer = setTimeout(() => {
        if (pendingPrepResolversRef.current) {
          pendingPrepResolversRef.current = null
          reject(new Error('session.prep timeout'))
        }
      }, PREP_TIMEOUT_MS)
      try {
        sendOnRelay({
          type: 'session.prep',
          config: {
            type: 'session.config',
            provider: 'gemini',
            voice: config.voice,
            model: config.model,
            brainAgent: config.brainAgent,
            apiKey: config.apiKey,
            sessionKey: config.sessionKey,
            deviceContext: config.deviceContext,
            instructionsOverride: config.instructionsOverride,
            conversationHistory: config.conversationHistory,
          },
        })
      } catch (e) {
        clearTimeout(timer)
        pendingPrepResolversRef.current = null
        reject(e instanceof Error ? e : new Error(String(e)))
        return
      }
      const wrap = pendingPrepResolversRef.current
      pendingPrepResolversRef.current = {
        resolve: (r) => { clearTimeout(timer); wrap?.resolve(r) },
        reject: (e) => { clearTimeout(timer); wrap?.reject(e) },
      }
    })
  }, [sendOnRelay])

  const requestToken = useCallback((model?: string): Promise<{ token: string }> => {
    return new Promise((resolve, reject) => {
      pendingTokenResolversRef.current = { resolve, reject }
      const timer = setTimeout(() => {
        if (pendingTokenResolversRef.current) {
          pendingTokenResolversRef.current = null
          reject(new Error('mint_token timeout'))
        }
      }, TOKEN_TIMEOUT_MS)
      try {
        sendOnRelay({ type: 'mint_token', provider: 'gemini', model })
      } catch (e) {
        clearTimeout(timer)
        pendingTokenResolversRef.current = null
        reject(e instanceof Error ? e : new Error(String(e)))
        return
      }
      const wrap = pendingTokenResolversRef.current
      pendingTokenResolversRef.current = {
        resolve: (r) => { clearTimeout(timer); wrap?.resolve(r) },
        reject: (e) => { clearTimeout(timer); wrap?.reject(e) },
      }
    })
  }, [sendOnRelay])

  const openGeminiWs = useCallback((
    token: string,
    model: string,
    voice: string,
    instructions: string,
    tools: GeminiFunctionDeclaration[],
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const url = `${GEMINI_WS_URL}?key=${encodeURIComponent(token)}`
      const ws = new WebSocket(url)
      geminiWsRef.current = ws
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try { ws.close() } catch {}
        reject(new Error('Gemini setup timeout'))
      }, SETUP_TIMEOUT_MS)

      ws.onopen = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const setup: Record<string, any> = {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
            mediaResolution: 'MEDIA_RESOLUTION_HIGH',
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: { parts: [{ text: instructions }] },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
              endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
              prefixPaddingMs: 20,
              silenceDurationMs: 500,
            },
          },
        }
        if (tools.length > 0) {
          setup.tools = [{ functionDeclarations: tools }]
        }
        ws.send(JSON.stringify({ setup }))
      }

      ws.onmessage = (e) => {
        const raw = String(e.data)
        if (!settled) {
          // Resolve the setup promise as soon as setupComplete arrives;
          // handleGeminiMessage will still process it for session.ready bookkeeping.
          try {
            const probe = JSON.parse(raw) as { setupComplete?: unknown }
            if (probe.setupComplete !== undefined) {
              settled = true
              clearTimeout(timer)
              resolve()
            }
          } catch {}
        }
        handleGeminiMessage(raw)
      }

      ws.onerror = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(new Error('Gemini WS error'))
      }

      ws.onclose = (ev: CloseEvent) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          reject(new Error(`Gemini WS closed: ${ev.code} ${ev.reason ?? ''}`))
          return
        }
        if (geminiWsRef.current === ws) geminiWsRef.current = null
        if (!userStoppedRef.current) {
          callbacksRef.current.onDisconnect?.()
        }
        setIsConnected(false)
        setSessionId(null)
        ExpoRealtimeAudioModule.stopCapture()
        ExpoRealtimeAudioModule.stopPlayback()
      }
    })
  }, [handleGeminiMessage])

  const start = useCallback((config: RealtimeConfig) => {
    cleanup()
    userStoppedRef.current = false
    configRef.current = config
    const model = config.model || DEFAULT_MODEL
    const voice = config.voice || DEFAULT_VOICE

    ;(async () => {
      try {
        await openRelayWs(config.serverUrl)
        captureMobile('direct_relay_connected', { model })
        const [prep, token] = await Promise.all([
          requestPrep(config),
          requestToken(model),
        ])
        await openGeminiWs(token.token, model, voice, prep.instructions, prep.tools)
        captureMobile('direct_gemini_connected', { model })
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e)
        console.warn('[direct-gemini] setup failed:', reason)
        captureMobile('direct_mode_failure', { reason, model })
        cleanup()
        callbacksRef.current.onDirectModeFailure?.(reason)
      }
    })()
  }, [cleanup, openRelayWs, requestPrep, requestToken, openGeminiWs])

  const stop = useCallback(() => {
    userStoppedRef.current = true
    mutedRef.current = false
    ExpoRealtimeAudioModule.stopCapture()
    ExpoRealtimeAudioModule.stopPlayback()
    cleanup()
    setIsConnected(false)
    setSessionId(null)
  }, [cleanup])

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted
  }, [])

  return { start, stop, setMuted, isConnected, sessionId }
}

// 24 kHz PCM16 base64 → 16 kHz PCM16 base64. Mirrors the relay's downsample
// helper in adapters/gemini.ts. Implemented with atob/btoa so it stays clean
// of node:buffer in the React Native bundle.
function downsample24to16(base64Audio: string): string {
  const bytes = base64ToBytes(base64Audio)
  const inputSamples = Math.floor(bytes.length / 2)
  const outputSamples = Math.floor(inputSamples * 16000 / 24000)
  const out = new Uint8Array(outputSamples * 2)
  const ratio = 24000 / 16000

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ov = new DataView(out.buffer)

  for (let i = 0; i < outputSamples; i++) {
    const srcPos = i * ratio
    const srcIdx = Math.floor(srcPos)
    const frac = srcPos - srcIdx
    const s0 = dv.getInt16(srcIdx * 2, true)
    const s1 = srcIdx + 1 < inputSamples ? dv.getInt16((srcIdx + 1) * 2, true) : s0
    let sample = Math.round(s0 * (1 - frac) + s1 * frac)
    if (sample > 32767) sample = 32767
    else if (sample < -32768) sample = -32768
    ov.setInt16(i * 2, sample, true)
  }

  return bytesToBase64(out)
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = globalThis.atob(b64)
  const len = bin.length
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return globalThis.btoa(bin)
}
