// Gemini Live adapter — translates relay protocol ↔ Gemini Live WebSocket events

import WebSocket from "ws"
import type { SessionConfigEvent } from "../types.js"
import type { ProviderAdapter, SendToClient } from "./types.js"
import { buildInstructions } from "../instructions.js"
import { getGeminiTools } from "../tools/index.js"
import { buildHistorySplit, formatSummaryPreamble } from "../history.js"
import { log, error as logError } from "../log.js"

const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
const DEFAULT_MODEL = "gemini-3.1-flash-live-preview"
const WATCHDOG_TIMEOUT_MS = 20_000
const SETUP_TIMEOUT_MS = 15_000
const MAX_RECONNECT_ATTEMPTS = 2
const RECONNECT_BACKOFF_MS = 500
// After a resumption, Gemini's ASR pipeline can come back while the generation
// pipeline stays wedged — we see inputTranscription (or empty serverContent
// heartbeats) but never modelTurn / outputTranscription / audio. This is a
// "poisoned handle": the resumption checkpoint landed mid-turn and the turn
// controller is waiting for a boundary that will never arrive. Detect it by
// watching for ASR-alive + generation-dead post-resume, and recover by forcing
// a fresh session (no handle).
const POST_RESUME_GENERATION_TIMEOUT_MS = 8000
// Close codes that warrant a transparent reconnect (vs. surfacing to the client).
// Gemini's graceful end-of-session path is goAway → we reconnect proactively
// before the close lands. These codes cover transport-level drops (network,
// server restart, rate limit). 1007 is included because Gemini can send it after
// a goAway rotation, likely triggered by stale video frames flushed into the new
// session (invalid argument). 1011 (internal server error) is included because
// transient Gemini-side faults shouldn't drop the user mid-call — resumption
// may recover, and if it doesn't, the retry budget surfaces the error anyway.
const RECONNECTABLE_CLOSE_CODES = new Set([1001, 1006, 1007, 1011, 1012, 1013])
// Bounded send queues for the reconnect window.
// Audio: ~1s at 50Hz — older chunks are dropped first since stale audio
// smears VAD. Control: small buffer for toolResponse / clientContent which
// MUST reach the upstream to unblock the model.
const MAX_PENDING_AUDIO = 50
const MAX_PENDING_CONTROL = 20
const MAX_PENDING_VIDEO = 5

const GEMINI_VOICES = ["Puck", "Charon", "Kore", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"]
const DEFAULT_GEMINI_VOICE = "Zephyr"

export class GeminiAdapter implements ProviderAdapter {
  private upstream: WebSocket | null = null
  private sendToClient: SendToClient | null = null
  private config: SessionConfigEvent | null = null
  private transcript: { role: "user" | "assistant", text: string }[] = []
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null
  private pendingToolCalls = 0
  private currentAssistantText = ""
  private currentUserText = ""
  private userSpeaking = false
  private hasVideoInput = false
  private watchdogEnabled = false
  // Post-resume liveness tracking. When a resumed session completes setup we
  // arm a timer; any generation-side activity disarms it. ASR-only activity
  // (inputTranscription or empty serverContent) does not disarm — that's the
  // exact failure signature we're trying to detect.
  private postResumeTimer: ReturnType<typeof setTimeout> | null = null
  private awaitingResumeGeneration = false

  // Session resumption state
  private resumptionHandle: string | null = null
  private currentlyResumable = false
  private rotateAfterToolCalls = false
  private isReconnecting = false
  private disconnected = false
  private wsUrlOverride: string | null = null // for tests to point at a mock server
  // Conversation history injected on the initial connect only. Reconnects rely
  // on Gemini's resumption handle (or on the next initial connect) — replaying
  // turns into a resumed session would duplicate context the model already has.
  // Stored already in Gemini wire shape so the setup flag and the post-setupComplete
  // clientContent stay consistent: setting historyConfig.initialHistoryInClientContent
  // without a follow-up clientContent leaves the model waiting for the seed.
  private resumeTurns: GeminiClientTurn[] = []
  private resumeSummary: string | null = null
  // Bounded queues for messages written during the reconnect window.
  // Flushed on the resumed connection's setupComplete.
  private pendingAudio: string[] = []
  private pendingVideo: string[] = []
  private pendingControl: string[] = []

  // Per-turn latency marks, emitted on turnComplete. Gemini Live has no
  // explicit "end-of-speech" event — we proxy it via the last inputTranscription
  // delta timestamp (loose — includes transcription latency) and fall back to
  // the last upstream audio write when transcription is quiet. Source-kind
  // reported via voice.latency.endpoint.source so dashboards can weight it.
  private turnStartedAtMs: number | null = null
  private lastInputTranscriptionAtMs: number | null = null
  private lastUpstreamAudioAtMs: number | null = null
  private firstModelAudioAtMs: number | null = null
  private firstModelTextAtMs: number | null = null
  private turnWasInterrupted = false

  async connect(config: SessionConfigEvent, sendToClient: SendToClient): Promise<void> {
    this.sendToClient = sendToClient
    this.config = config
    this.disconnected = false
    this.watchdogEnabled = config.watchdog === "enabled"

    const split = await buildHistorySplit(config.conversationHistory, "gemini")
    this.resumeTurns = buildClientContentTurns(split.recent)
    this.resumeSummary = split.summary
    if (this.resumeTurns.length > 0 || split.summary) {
      log(`[gemini] Resume context: recent=${this.resumeTurns.length} turns, summary=${split.summary ? `${split.summary.length} chars` : "none"}`)
    }

    await this.openUpstream()
  }

  /**
   * Open an upstream WebSocket to Gemini and wait for setupComplete.
   * If `this.resumptionHandle` is set, includes it in the setup message so
   * Gemini resumes the conversation instead of starting fresh.
   */
  private openUpstream(): Promise<void> {
    if (!this.config) throw new Error("openUpstream called without config")

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY not set")

    const model = this.config.model || DEFAULT_MODEL
    const url = this.wsUrlOverride ?? `${GEMINI_WS_URL}?key=${apiKey}`
    const ws = new WebSocket(url)
    this.upstream = ws

    return new Promise((resolve, reject) => {
      let settled = false

      const onOpen = () => {
        const resuming = this.resumptionHandle !== null
        log(`[gemini] WebSocket connected, sending setup (model=${model}${resuming ? ", resuming" : ""})`)
        try {
          this.sendSetup(this.config!, model)
        } catch (err) {
          finish(err instanceof Error ? err : new Error(String(err)))
        }
      }

      const onMessage = (raw: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(String(raw))
          if (msg.setupComplete !== undefined) {
            log("[gemini] Setup complete")
            this.resetWatchdog()
            finish()
            this.injectResumeTurns()
            // Flush AFTER finish() so any waiters see a fully-established
            // connection before queued sends begin landing on the wire.
            this.flushPending()
            return
          }
          this.handleServerMessage(msg)
        } catch (err) {
          logError("[gemini] Failed to parse message:", err)
        }
      }

      const onError = (err: Error) => {
        logError("[gemini] WebSocket error:", err.message)
        finish(err)
      }

      const onClose = (code: number, reason: Buffer) => {
        const reasonText = String(reason)
        log(`[gemini] WebSocket closed: ${code} ${reasonText}`)
        if (!settled) {
          finish(new Error(reasonText || "Gemini setup failed"))
          return
        }
        this.handleUpstreamClose(code)
      }

      const finish = (err?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timeoutHandle)
        if (err) {
          // Detach our handlers so the abandoned socket can't fire a spurious
          // handleUpstreamClose. Swap in no-op error/close first so any follow-on
          // events after close() don't become uncaught.
          ws.off("open", onOpen)
          ws.off("message", onMessage)
          ws.off("error", onError)
          ws.off("close", onClose)
          ws.on("error", () => { /* discard */ })
          ws.on("close", () => { /* discard */ })
          if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            try { ws.close(1011, "setup failed") } catch { /* ignore */ }
          }
          if (this.upstream === ws) this.upstream = null
          reject(err)
        } else {
          resolve()
        }
      }

      const timeoutHandle = setTimeout(() => finish(new Error("Gemini setup timed out")), SETUP_TIMEOUT_MS)

      ws.on("open", onOpen)
      ws.on("message", onMessage)
      ws.on("error", onError)
      ws.on("close", onClose)
    })
  }

  /**
   * Handle an unexpected upstream close after the session was established.
   * For reconnectable codes (1001/1006/1007/1012/1013) with a resumption handle
   * available, silently re-open the session. Otherwise surface an error.
   */
  private handleUpstreamClose(code: number) {
    if (this.disconnected) return // we initiated the close
    if (code === 1000) return // clean close — nothing to do
    if (this.isReconnecting) return // a reconnect is already in flight

    // If the socket closes while a tool call is in flight or we were waiting
    // for a post-tool resumable handle, the call is lost — our stored handle
    // is from before the call and the new session wouldn't recognize the
    // callId. Surface the error rather than silently resuming into a broken state.
    if (this.pendingToolCalls > 0 || this.rotateAfterToolCalls) {
      logError(`[gemini] upstream closed mid-tool-call — cannot safely resume (pending=${this.pendingToolCalls}, deferred=${this.rotateAfterToolCalls})`)
      this.pendingToolCalls = 0
      this.rotateAfterToolCalls = false
      this.sendToClient?.({ type: "error", message: "upstream connection closed mid-tool-call", code: 502 })
      return
    }

    if (!RECONNECTABLE_CLOSE_CODES.has(code) || !this.resumptionHandle) {
      this.sendToClient?.({ type: "error", message: "upstream connection closed", code: 502 })
      return
    }

    void this.reconnect(`close code ${code}`)
  }

  /**
   * Open a fresh upstream using the stored resumption handle. Runs with a
   * small retry budget so a single transient failure doesn't drop the call.
   * Emits session.rotating / session.rotated so clients can clear playback
   * buffers and show status.
   */
  private async reconnect(reason: string, forceFresh = false): Promise<void> {
    if (this.isReconnecting || this.disconnected) return
    if (!forceFresh && !this.resumptionHandle) {
      logError(`[gemini] reconnect requested (${reason}) but no resumption handle — giving up`)
      this.sendToClient?.({ type: "error", message: "upstream connection closed", code: 502 })
      return
    }

    this.isReconnecting = true
    // Reset session-scoped state. Treat the resumed session as not-yet-resumable
    // until its first sessionResumptionUpdate reports `resumable: true` — otherwise
    // a goAway on the fresh session could trigger another rotation using the
    // prior session's stale handle.
    this.currentlyResumable = false
    this.rotateAfterToolCalls = false
    const handlePreview = this.resumptionHandle ? `${this.resumptionHandle.slice(0, 8)}…` : "fresh"
    log(`[gemini] Reconnecting (${reason}, handle=${handlePreview})`)
    // Finalize any in-flight transcription before rotating. Gemini's resumed
    // session replays transcription from its last checkpoint, so if we leave
    // currentAssistantText / currentUserText populated, the replayed deltas
    // concatenate onto stale text and the UI renders "How's that?How's that?".
    // Flush as transcript.done so the client commits its current bubble; post-
    // resume deltas then start a fresh bubble.
    this.flushPendingTranscripts()
    this.userSpeaking = false
    this.sendToClient?.({ type: "session.rotating" })
    this.pauseWatchdog()

    // Tear down any remaining upstream so listeners don't fire during the swap
    if (this.upstream && this.upstream.readyState !== WebSocket.CLOSED) {
      this.upstream.removeAllListeners()
      try { this.upstream.close() } catch { /* ignore */ }
    }
    this.upstream = null

    const resumingWithHandle = this.resumptionHandle !== null
    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      try {
        await this.openUpstream()
        this.isReconnecting = false
        this.sendToClient?.({ type: "session.rotated", sessionId: `gemini-resumed-${Date.now()}` })
        log(`[gemini] Reconnected on attempt ${attempt}`)
        if (resumingWithHandle) this.armPostResumeWatchdog()
        return
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logError(`[gemini] Reconnect attempt ${attempt} failed: ${msg}`)
        if (attempt < MAX_RECONNECT_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RECONNECT_BACKOFF_MS))
        }
      }
    }

    this.isReconnecting = false
    this.sendToClient?.({ type: "error", message: "upstream connection closed", code: 502 })
  }

  sendAudio(data: string) {
    // Client sends 24kHz PCM16, Gemini needs 16kHz PCM16
    const downsampled = downsample24to16(data)
    this.sendUpstream({
      realtimeInput: {
        audio: {
          data: downsampled,
          mimeType: "audio/pcm;rate=16000",
        },
      },
    }, "audio")
    this.lastUpstreamAudioAtMs = Date.now()
    this.resetWatchdog()
  }

  sendFrame(data: string, mimeType?: string) {
    this.hasVideoInput = true
    this.sendUpstream({
      realtimeInput: {
        video: {
          data,
          mimeType: mimeType || "image/jpeg",
        },
      },
    }, "video")
    // Do NOT reset the watchdog here — video frames at 1 FPS should not
    // count as user activity. Only audio activity pets the watchdog so the
    // "are you still there?" prompt fires correctly during silent screen sharing.
  }

  commitAudio() {
    // Gemini uses automatic VAD — no explicit commit needed
  }

  createResponse() {
    // Gemini auto-responds based on VAD — no explicit trigger needed
  }

  cancelResponse() {
    // Gemini handles interruption via barge-in automatically
  }

  sendToolResult(callId: string, output: string) {
    this.pendingToolCalls = Math.max(0, this.pendingToolCalls - 1)

    let parsedOutput: Record<string, unknown>
    try {
      parsedOutput = JSON.parse(output)
    } catch {
      parsedOutput = { result: output }
    }

    this.sendUpstream({
      toolResponse: {
        functionResponses: [{
          id: callId,
          response: parsedOutput,
        }],
      },
    })

    if (this.pendingToolCalls === 0) {
      this.resetWatchdog()
    }
  }

  injectContext(text: string) {
    // Use realtimeInput.text — clientContent is not supported mid-session on
    // Gemini 3.1 Flash Live and triggers 1007. realtimeInput.text can be sent
    // concurrently with audio streaming without conflict.
    log(`[gemini] Injecting context via realtimeInput.text (${text.length} chars)`)
    this.sendUpstream({
      realtimeInput: {
        text,
      },
    })
  }

  getTranscript() {
    return [...this.transcript]
  }

  disconnect() {
    this.disconnected = true
    this.clearWatchdog()
    this.clearPostResumeWatchdog()
    if (this.upstream && this.upstream.readyState !== WebSocket.CLOSED) {
      this.upstream.close()
    }
    this.upstream = null
    this.sendToClient = null
  }

  // --- setup ---

  private sendSetup(config: SessionConfigEvent, model: string) {
    const baseInstructions = buildInstructions(config)
    const instructions = this.resumeSummary
      ? `${baseInstructions}\n\n${formatSummaryPreamble(this.resumeSummary)}`
      : baseInstructions
    const tools = getGeminiTools(config)
    const voice = resolveVoice(config.voice)

    // Gemini Live setup message structure:
    // - generationConfig: responseModalities, speechConfig (generation settings)
    // - outputAudioTranscription, inputAudioTranscription: at setup root
    // - systemInstruction, tools, realtimeInputConfig: at setup root
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setup: Record<string, any> = {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
        // Default LOW collapses every video frame to ~64 tokens, which loses
        // the detail Gemini needs to read terminal text and code. HIGH bumps
        // it to ~280 tokens/frame on Gemini 3 (~256 on 2.5) so small fonts
        // stay legible during screen sharing. ~4x more video tokens per
        // frame, negligible cost vs the continuous audio stream.
        mediaResolution: "MEDIA_RESOLUTION_HIGH",
      },
      outputAudioTranscription: {},
      inputAudioTranscription: {},
      systemInstruction: {
        parts: [{ text: instructions }],
      },
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
          endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
          prefixPaddingMs: 20,
          silenceDurationMs: 500,
        },
      },
      // Opt into session resumption: empty object on first connect tells Gemini
      // to start sending newHandle updates; a stored handle resumes that session.
      sessionResumption: this.resumptionHandle
        ? { handle: this.resumptionHandle }
        : {},
    }

    if (tools.length > 0) {
      setup.tools = [{ functionDeclarations: tools }]
    }

    // gemini-3.1-flash-live-preview only accepts a post-setup clientContent
    // history seed when this flag is set; absent it, sendClientContent is
    // unsupported on this model. Only set when we actually have wire-ready
    // turns to inject — opting into the seeding path without sending the
    // terminating clientContent leaves the model waiting for the seed.
    if (this.resumeTurns.length > 0) {
      setup.historyConfig = { initialHistoryInClientContent: true }
    }

    // Enable context window compression unconditionally. hasVideoInput is only
    // set when sendFrame() is called, which happens after setup, so gating on
    // it here would miss sessions that share screen immediately after connecting.
    // Compression is lightweight and harmless for audio-only sessions.
    setup.contextWindowCompression = {
      slidingWindow: {},
      triggerTokens: 10000,
    }

    log(`[gemini] Setup: model=${model}, voice=${voice}, tools=${tools.length}`)
    // Bypass the reconnect queue — the setup message IS the handshake that
    // ends the reconnect window. Queuing it would deadlock.
    if (this.upstream?.readyState === WebSocket.OPEN) {
      this.upstream.send(JSON.stringify({ setup }))
    }
  }

  // --- server message handling ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleServerMessage(msg: any) {
    if (msg.serverContent) {
      this.handleServerContent(msg.serverContent)
      return
    }

    if (msg.toolCall) {
      this.handleToolCall(msg.toolCall)
      return
    }

    if (msg.toolCallCancellation) {
      const ids: string[] = Array.isArray(msg.toolCallCancellation.ids)
        ? msg.toolCallCancellation.ids.filter((id: unknown): id is string => typeof id === "string")
        : []
      log(`[gemini] Tool call cancelled: ${ids.join(", ") || "(no ids)"}`)
      if (ids.length > 0) {
        this.sendToClient?.({ type: "tool.cancelled", callIds: ids })
      }
      this.pendingToolCalls = 0
      this.resetWatchdog()
      return
    }

    if (msg.goAway) {
      const timeLeftMs = parseTimeLeftMs(msg.goAway.timeLeft)
      if (this.pendingToolCalls > 0 || !this.currentlyResumable) {
        // Gemini marks the stream non-resumable while a tool call is in flight.
        // Rotating now would resume to a checkpoint from before the call existed,
        // and the pending toolResponse would be sent to a session that never saw
        // the callId. Defer until we see a fresh resumable handle post-tool.
        log(`[gemini] GoAway received — deferring rotation (pending=${this.pendingToolCalls}, resumable=${this.currentlyResumable}, timeLeft=${timeLeftMs}ms)`)
        this.rotateAfterToolCalls = true
        return
      }
      log(`[gemini] GoAway received — session ending in ~${timeLeftMs}ms, rotating proactively`)
      void this.reconnect("goAway")
      return
    }

    if (msg.sessionResumptionUpdate) {
      const update = msg.sessionResumptionUpdate
      this.currentlyResumable = !!update.resumable
      if (update.newHandle && update.resumable) {
        this.resumptionHandle = update.newHandle
        // If a goAway arrived during a tool call, this is our first chance to
        // rotate safely — the new handle is post-call.
        if (this.rotateAfterToolCalls && this.pendingToolCalls === 0) {
          this.rotateAfterToolCalls = false
          void this.reconnect("goAway-deferred")
        }
      }
      return
    }

    if (msg.usageMetadata) {
      log(`[gemini] Usage: ${JSON.stringify(msg.usageMetadata)}`)
      const u = msg.usageMetadata
      this.sendToClient?.({
        type: "usage.metrics",
        promptTokens: u.promptTokenCount,
        completionTokens: u.responseTokenCount,
        totalTokens: u.totalTokenCount,
        inputAudioTokens: findModalityTokens(u.promptTokensDetails, "AUDIO"),
        outputAudioTokens: findModalityTokens(u.responseTokensDetails, "AUDIO"),
      })
      return
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleServerContent(content: any) {
    const keys = Object.keys(content).join(", ")
    log(`[gemini] serverContent: ${keys}`)

    // Any generation-side activity means the resumed session's turn controller
    // is healthy — cancel the post-resume watchdog.
    if (content.modelTurn || content.outputTranscription || content.turnComplete || content.generationComplete) {
      this.clearPostResumeWatchdog()
    }

    // Model audio output — only extract inlineData (audio)
    // Do NOT emit transcript from modelTurn.parts[].text — outputTranscription handles that
    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData) {
          if (this.firstModelAudioAtMs == null) {
            this.firstModelAudioAtMs = Date.now()
          }
          this.sendToClient?.({ type: "audio.delta", data: part.inlineData.data })
          this.resetWatchdog()
        }
      }
    }

    // Output transcription (model speech → text)
    // Flush any accumulated user text first — the model is now responding
    if (content.outputTranscription?.text) {
      if (this.currentUserText) {
        this.transcript.push({ role: "user", text: this.currentUserText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentUserText,
          role: "user",
        })
        this.currentUserText = ""
      }
      this.userSpeaking = false
      if (this.firstModelTextAtMs == null) {
        this.firstModelTextAtMs = Date.now()
      }
      this.currentAssistantText += content.outputTranscription.text
      this.sendToClient?.({
        type: "transcript.delta",
        text: content.outputTranscription.text,
        role: "assistant",
      })
    }

    // Input transcription (user speech → text)
    // Synthesize turn.started so client stops playback (prevents echo)
    if (content.inputTranscription?.text) {
      // Every input-transcription delta refreshes our proxy for end-of-speech
      // — the LAST one before modelTurn is our best non-explicit signal.
      this.lastInputTranscriptionAtMs = Date.now()
      if (!this.userSpeaking) {
        this.userSpeaking = true
        // Reset per-turn marks at the start of the user's turn. Done here
        // (not in turnComplete) because Gemini's turnComplete lands AFTER the
        // assistant finishes — the next turn's marks would otherwise clobber
        // in-flight state if the user is quick.
        this.resetLatencyMarks()
        this.turnStartedAtMs = Date.now()
        this.sendToClient?.({ type: "turn.started" })
      }
      // Flush any accumulated assistant text — user is speaking again
      if (this.currentAssistantText) {
        this.transcript.push({ role: "assistant", text: this.currentAssistantText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentAssistantText,
          role: "assistant",
        })
        this.currentAssistantText = ""
      }
      this.currentUserText += content.inputTranscription.text
      this.sendToClient?.({
        type: "transcript.delta",
        text: content.inputTranscription.text,
        role: "user",
      })
    }

    // Turn complete — emit latency metrics before turn.ended, then flush
    // accumulated transcriptions (user first, then assistant).
    if (content.turnComplete) {
      this.emitLatencyMetrics()
      if (this.currentUserText) {
        this.transcript.push({ role: "user", text: this.currentUserText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentUserText,
          role: "user",
        })
        this.currentUserText = ""
      }
      if (this.currentAssistantText) {
        this.transcript.push({ role: "assistant", text: this.currentAssistantText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentAssistantText,
          role: "assistant",
        })
        this.currentAssistantText = ""
      }
      this.userSpeaking = false
      this.sendToClient?.({ type: "turn.ended" })
    }

    // Interrupted (barge-in) — flush both user and assistant text
    if (content.interrupted) {
      log("[gemini] Response interrupted by user")
      this.turnWasInterrupted = true
      if (!this.userSpeaking) {
        this.userSpeaking = true
        this.sendToClient?.({ type: "turn.started" })
      }
      if (this.currentUserText) {
        this.transcript.push({ role: "user", text: this.currentUserText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentUserText,
          role: "user",
        })
        this.currentUserText = ""
      }
      if (this.currentAssistantText) {
        this.transcript.push({ role: "assistant", text: this.currentAssistantText + "..." })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentAssistantText + "...",
          role: "assistant",
        })
        this.currentAssistantText = ""
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleToolCall(toolCall: any) {
    const calls = toolCall.functionCalls || []

    for (const call of calls) {
      log(`[gemini] Tool call: ${call.name} (${call.id})`)
      this.pendingToolCalls++
      this.pauseWatchdog()
      this.sendToClient?.({
        type: "tool.call",
        callId: call.id,
        name: call.name,
        arguments: JSON.stringify(call.args || {}),
      })
    }
  }

  // --- upstream comms ---

  private sendUpstream(msg: Record<string, unknown>, kind: "audio" | "video" | "control" = "control") {
    const payload = JSON.stringify(msg)
    // While rotating, always queue — the resumed socket may be OPEN before
    // setupComplete lands, and writing between CONNECTED and SETUP would
    // interleave with our setup message and corrupt the handshake.
    if (this.isReconnecting) {
      if (kind === "audio") {
        // Oldest-drop: stale audio smears VAD and delays the next turn more
        // than a short loss does.
        if (this.pendingAudio.length >= MAX_PENDING_AUDIO) this.pendingAudio.shift()
        this.pendingAudio.push(payload)
      } else if (kind === "video") {
        // Oldest-drop: stale frames have less value than fresh ones.
        if (this.pendingVideo.length >= MAX_PENDING_VIDEO) this.pendingVideo.shift()
        this.pendingVideo.push(payload)
      } else {
        // Control messages (toolResponse, clientContent) must reach the upstream
        // to unblock the model. If we somehow overflow, drop the newest so the
        // original toolResponse still goes through.
        if (this.pendingControl.length < MAX_PENDING_CONTROL) {
          this.pendingControl.push(payload)
        } else {
          logError(`[gemini] control queue full (${MAX_PENDING_CONTROL}) — dropping message`)
        }
      }
      return
    }
    if (this.upstream?.readyState === WebSocket.OPEN) {
      this.upstream.send(payload)
    }
  }

  private injectResumeTurns() {
    if (this.resumeTurns.length === 0) return
    if (!this.upstream || this.upstream.readyState !== WebSocket.OPEN) return

    // turnComplete: true marks this as the terminating message of the initial
    // history seed. After this, the next user audio drives the first model turn
    // via realtimeInput.audio — sendClientContent is no longer used on this model.
    const payload = JSON.stringify({
      clientContent: {
        turns: this.resumeTurns,
        turnComplete: true,
      },
    })

    log(`[gemini] Injecting ${this.resumeTurns.length} recent turn(s) via clientContent (${payload.length} bytes)`)
    this.upstream.send(payload)

    this.resumeTurns = []
    this.resumeSummary = null
  }

  private flushPending() {
    if (!this.upstream || this.upstream.readyState !== WebSocket.OPEN) return
    // Control first so the model unblocks before we flood it with media.
    const control = this.pendingControl
    const audio = this.pendingAudio
    const video = this.pendingVideo
    this.pendingControl = []
    this.pendingAudio = []
    // Drop video frames — they are stale by the time we reconnect and sending
    // them can trigger a 1007 (invalid argument) from Gemini. The client
    // refreshes screen-share frames within ~1 s anyway.
    this.pendingVideo = []
    if (control.length > 0 || audio.length > 0) {
      log(`[gemini] Flushing reconnect queue (${control.length} control, ${audio.length} audio)`)
    }
    if (video.length > 0) {
      log(`[gemini] Dropping ${video.length} stale video frame(s) from reconnect queue`)
    }
    for (const p of control) this.upstream.send(p)
    for (const p of audio) this.upstream.send(p)
  }

  private armPostResumeWatchdog() {
    this.clearPostResumeWatchdog()
    this.awaitingResumeGeneration = true
    this.postResumeTimer = setTimeout(() => {
      if (!this.awaitingResumeGeneration || this.disconnected) return
      logError(`[gemini] Post-resume generation timeout (${POST_RESUME_GENERATION_TIMEOUT_MS}ms) — handle is poisoned, forcing fresh session`)
      this.awaitingResumeGeneration = false
      this.postResumeTimer = null
      // Drop the poisoned handle so the next reconnect starts a fresh session.
      this.resumptionHandle = null
      this.currentlyResumable = false
      void this.reconnect("poisoned handle — fresh session", true)
    }, POST_RESUME_GENERATION_TIMEOUT_MS)
  }

  private clearPostResumeWatchdog() {
    this.awaitingResumeGeneration = false
    if (this.postResumeTimer) {
      clearTimeout(this.postResumeTimer)
      this.postResumeTimer = null
    }
  }

  private flushPendingTranscripts() {
    if (this.currentUserText) {
      this.transcript.push({ role: "user", text: this.currentUserText })
      this.sendToClient?.({
        type: "transcript.done",
        text: this.currentUserText,
        role: "user",
      })
      this.currentUserText = ""
    }
    if (this.currentAssistantText) {
      this.transcript.push({ role: "assistant", text: this.currentAssistantText })
      this.sendToClient?.({
        type: "transcript.done",
        text: this.currentAssistantText,
        role: "assistant",
      })
      this.currentAssistantText = ""
    }
  }

  // --- watchdog ---

  private resetWatchdog() {
    this.clearWatchdog()
    if (!this.watchdogEnabled) return
    // While a tool call is in flight, leave the watchdog paused — firing the
    // "user silent" prompt mid-tool would inject a fake user turn into a
    // session that's already waiting on us, corrupting the conversation.
    if (this.pendingToolCalls > 0) return
    this.watchdogTimer = setTimeout(() => {
      log("[gemini] Watchdog: no audio for 20s, injecting prompt")
      this.sendUpstream({
        realtimeInput: {
          text: "(The user has been silent for a while. If you were mid-conversation, gently check if they're still there. If the conversation had naturally ended, stay quiet.)",
        },
      })
    }, WATCHDOG_TIMEOUT_MS)
  }

  private pauseWatchdog() {
    this.clearWatchdog()
  }

  private clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }

  // --- latency metrics ---

  private resetLatencyMarks() {
    this.turnStartedAtMs = null
    this.lastInputTranscriptionAtMs = null
    this.lastUpstreamAudioAtMs = null
    this.firstModelAudioAtMs = null
    this.firstModelTextAtMs = null
    this.turnWasInterrupted = false
  }

  private emitLatencyMetrics() {
    // Skip interrupted turns — barge-ins don't define a meaningful first-
    // output boundary. Gemini's interrupted flag sets a "... truncated"
    // transcript but does not give us a clean mark.
    if (this.turnWasInterrupted) {
      this.resetLatencyMarks()
      return
    }
    // VoiceClaw accepts either modality — users sometimes paste links or
    // ask for text output, and voice turns still land. Stamp whichever
    // came first as the canonical "first output" anchor; surface both
    // modality-specific marks too.
    const firstAudioAt = this.firstModelAudioAtMs
    const firstTextAt = this.firstModelTextAtMs
    const firstOutputAt = pickEarliest(firstAudioAt, firstTextAt)
    if (firstOutputAt == null) {
      this.resetLatencyMarks()
      return
    }
    const firstOutputModality =
      firstAudioAt != null && (firstTextAt == null || firstAudioAt <= firstTextAt)
        ? "audio"
        : "text"
    // Prefer last input-transcription delta over last upstream audio: the
    // transcription signal reflects the provider's view of speech content
    // landing, which aligns better with when VAD would have cut the turn.
    // Fall back to last upstream audio when transcription is silent (rare —
    // most sessions have inputAudioTranscription enabled).
    const endpointStart = this.lastInputTranscriptionAtMs ?? this.lastUpstreamAudioAtMs ?? null
    const endpointSource = this.lastInputTranscriptionAtMs != null
      ? "transcription_proxy"
      : this.lastUpstreamAudioAtMs != null
        ? "last_audio_frame"
        : undefined
    const endpointMs = endpointStart != null ? Math.max(0, firstOutputAt - endpointStart) : undefined
    const providerFirstByteMs = this.lastUpstreamAudioAtMs != null
      ? Math.max(0, firstOutputAt - this.lastUpstreamAudioAtMs)
      : undefined
    const firstAudioFromTurnStartMs = firstAudioAt != null && this.turnStartedAtMs != null
      ? Math.max(0, firstAudioAt - this.turnStartedAtMs)
      : undefined
    const firstTextFromTurnStartMs = firstTextAt != null && this.turnStartedAtMs != null
      ? Math.max(0, firstTextAt - this.turnStartedAtMs)
      : undefined
    const firstOutputFromTurnStartMs = this.turnStartedAtMs != null
      ? Math.max(0, firstOutputAt - this.turnStartedAtMs)
      : undefined

    this.sendToClient?.({
      type: "latency.metrics",
      endpointMs,
      endpointSource,
      providerFirstByteMs,
      firstAudioFromTurnStartMs,
      firstTextFromTurnStartMs,
      firstOutputFromTurnStartMs,
      firstOutputModality,
    })
    this.resetLatencyMarks()
  }
}

function pickEarliest(a: number | null, b: number | null): number | null {
  if (a == null) return b
  if (b == null) return a
  return Math.min(a, b)
}

// --- helpers ---

/**
 * Parse goAway.timeLeft — Gemini sends a Duration proto which serializes to
 * a string like "30s" or "0.500s". We only use it for logging.
 */
function parseTimeLeftMs(timeLeft: unknown): number {
  if (typeof timeLeft !== "string") return 0
  const match = /^(\d+(?:\.\d+)?)s$/.exec(timeLeft)
  if (!match) return 0
  return Math.round(parseFloat(match[1]) * 1000)
}

function resolveVoice(voice?: string): string {
  if (!voice) return DEFAULT_GEMINI_VOICE
  const match = GEMINI_VOICES.find((v) => v.toLowerCase() === voice.toLowerCase())
  if (!match) {
    log(`[gemini] Unknown voice "${voice}"; falling back to ${DEFAULT_GEMINI_VOICE}`)
    return DEFAULT_GEMINI_VOICE
  }
  return match
}

function downsample24to16(base64Audio: string): string {
  const inputBuf = Buffer.from(base64Audio, "base64")
  const inputSamples = inputBuf.length / 2 // 16-bit = 2 bytes per sample
  const outputSamples = Math.floor(inputSamples * 16000 / 24000)
  const outputBuf = Buffer.alloc(outputSamples * 2)
  const ratio = 24000 / 16000 // 1.5

  for (let i = 0; i < outputSamples; i++) {
    const srcPos = i * ratio
    const srcIdx = Math.floor(srcPos)
    const frac = srcPos - srcIdx

    const s0 = inputBuf.readInt16LE(srcIdx * 2)
    const s1 = srcIdx + 1 < inputSamples
      ? inputBuf.readInt16LE((srcIdx + 1) * 2)
      : s0

    const sample = Math.round(s0 * (1 - frac) + s1 * frac)
    outputBuf.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2)
  }

  return outputBuf.toString("base64")
}

function findModalityTokens(
  details: { modality?: string, tokenCount?: number }[] | undefined,
  modality: string,
): number | undefined {
  return details?.find((d) => d.modality === modality)?.tokenCount
}

type GeminiClientTurn = { role: "user" | "model", parts: { text: string }[] }

// Map the relay's history shape onto Gemini's clientContent.turns. Drops
// empty-text entries and coalesces consecutive same-role turns so the wire
// payload always alternates user/model — Gemini Live requires alternation.
function buildClientContentTurns(
  history: { role: "user" | "assistant", text: string }[],
): GeminiClientTurn[] {
  const out: GeminiClientTurn[] = []
  for (const m of history) {
    const text = typeof m.text === "string" ? m.text.trim() : ""
    if (!text) continue
    const role: "user" | "model" = m.role === "assistant" ? "model" : "user"
    const last = out[out.length - 1]
    if (last && last.role === role) {
      last.parts.push({ text })
    } else {
      out.push({ role, parts: [{ text }] })
    }
  }
  return out
}
