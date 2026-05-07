// OpenAI Realtime adapter — translates relay protocol ↔ OpenAI Realtime GA events.
// Wire format follows the GA (v2) spec: nested `audio` config, `output_modalities`,
// session `type: "realtime"`, no `OpenAI-Beta` header. Event names follow GA
// (`response.output_audio.*`, `response.output_audio_transcript.*`); legacy beta
// names are still accepted for the xAI subclass which speaks the OpenAI-compatible
// beta dialect.

import WebSocket from "ws"
import type { IncomingMessage } from "node:http"
import type { SessionConfigEvent } from "../types.js"
import type { AdapterCapabilities, ProviderAdapter, SendToClient } from "./types.js"
import { buildInstructions } from "../instructions.js"
import { getTools } from "../tools/index.js"
import { buildHistorySplit, formatStampedTurnText, formatSummaryPreamble, type HistoryMessage } from "../history.js"
import { log, error as logError } from "../log.js"
import { mapAdapterError } from "./error-map.js"

const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"
const DEFAULT_MODEL = "gpt-realtime-2"
const DEFAULT_VOICE = "marin"
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe"

export interface OpenAICompatibleAdapterOptions {
  providerName?: string
  realtimeUrl?: string
  apiKeyEnv?: string
  defaultModel?: string
  defaultVoice?: string
  authHeaders?: Record<string, string>
  sessionFormat?: "openai" | "xai"
}

const ROTATION_INTERVAL_MS = parseInt(process.env.ROTATION_INTERVAL_MS ?? String(50 * 60 * 1000), 10) // 50 min default
const WATCHDOG_TIMEOUT_MS = 20_000 // 20 seconds with no audio out

export class OpenAIAdapter implements ProviderAdapter {
  readonly capabilities: AdapterCapabilities = { blockingToolResponse: true }
  private providerName: string
  private realtimeUrl: string
  private apiKeyEnv: string
  private defaultModel: string
  private defaultVoice: string
  private authHeaders: Record<string, string>
  private sessionFormat: "openai" | "xai"
  private upstream: WebSocket | null = null
  private sendToClient: SendToClient | null = null
  private config: SessionConfigEvent | null = null
  private transcript: { role: "user" | "assistant", text: string }[] = []
  private rotationTimer: ReturnType<typeof setTimeout> | null = null
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null
  private isRotating = false
  // Set when WE initiate disconnect/rotation. Suppresses the close-handler's
  // error path so the user doesn't see a red "Connection closed unexpectedly"
  // banner when they intentionally hang up — `ws.close()` without an explicit
  // code surfaces as 1005 (no-status), which would otherwise look like a fault.
  private isClosing = false
  private isResponseActive = false
  private pendingResponseCancel = false
  private pendingResponseCreate = false
  private pendingToolCalls = 0
  private watchdogEnabled = false
  // Per-turn latency marks. Reset on turn.started (our synthesized event from
  // speech_started) and emitted on response.done alongside usage. Timestamps
  // are performance.now()-style monotonic ms from Date.now(); good enough for
  // ms-scale latency math, we don't need monotonic clock guarantees here.
  private turnStartedAtMs: number | null = null
  private firstTextDeltaAtMs: number | null = null
  private speechStoppedAtMs: number | null = null
  private lastUpstreamAudioAtMs: number | null = null
  private firstAudioDeltaAtMs: number | null = null
  private turnWasInterrupted = false
  // Conversation history that mirrors what the upstream session was
  // configured with. Single source of truth for both the inject-once setup
  // path and the tracer's per-turn input composition; rotation overwrites
  // these with the fresh rotation summary so post-rotation traces don't
  // report stale context.
  private resumeRecentTurns: HistoryMessage[] = []
  private resumeSummary: string | null = null
  private resumeContextInjected = false

  constructor(options: OpenAICompatibleAdapterOptions = {}) {
    this.providerName = options.providerName ?? "openai"
    this.realtimeUrl = options.realtimeUrl ?? OPENAI_REALTIME_URL
    this.apiKeyEnv = options.apiKeyEnv ?? "OPENAI_API_KEY"
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL
    this.defaultVoice = options.defaultVoice ?? DEFAULT_VOICE
    this.authHeaders = options.authHeaders ?? {}
    this.sessionFormat = options.sessionFormat ?? "openai"
  }

  async connect(config: SessionConfigEvent, sendToClient: SendToClient): Promise<void> {
    this.sendToClient = sendToClient
    this.config = config
    this.watchdogEnabled = config.watchdog === "enabled"

    const split = await buildHistorySplit(config.conversationHistory, "openai")
    this.resumeRecentTurns = split.recent
    this.resumeSummary = split.summary
    this.resumeContextInjected = false
    if (split.recent.length > 0 || split.summary) {
      log(`[${this.providerName}] Resume context: recent=${split.recent.length} msgs, summary=${split.summary ? `${split.summary.length} chars` : "none"}`)
    }

    await this.openUpstream(config)
    this.startRotationTimer()
    this.resetWatchdog()
  }

  sendAudio(data: string) {
    this.sendUpstream({
      type: "input_audio_buffer.append",
      audio: data,
    })
    this.lastUpstreamAudioAtMs = Date.now()
    this.resetWatchdog()
  }

  sendFrame(data: string, mimeType?: string) {
    // GA added image input via `input_image` content items. xAI's beta
    // dialect doesn't speak this shape, so the xAI subclass keeps the
    // legacy no-op behavior by overriding this method.
    if (this.sessionFormat !== "openai") return
    const mt = mimeType || "image/jpeg"
    log(`[${this.providerName}] Injecting image via conversation.item.create (${data.length} b64 chars, ${mt})`)
    this.sendUpstream({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_image", image_url: `data:${mt};base64,${data}` }],
      },
    })
    // Don't fire response.create here — the caller decides when to ask
    // the model to speak (typically after a sibling text.input arrives).
  }

  injectContext(text: string) {
    log(`[${this.providerName}] Injecting context via conversation.item.create (${text.length} chars)`)
    this.sendUpstream({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    })
    this.requestResponse("injectContext")
  }

  commitAudio() {
    this.sendUpstream({ type: "input_audio_buffer.commit" })
  }

  createResponse() {
    this.requestResponse("client")
  }

  cancelResponse() {
    this.pendingResponseCreate = false
    if (this.isResponseActive && !this.pendingResponseCancel) {
      this.pendingResponseCancel = true
      this.turnWasInterrupted = true
      this.sendUpstream({ type: "response.cancel" })
    }
  }

  sendToolResult(callId: string, output: string) {
    this.pendingToolCalls = Math.max(0, this.pendingToolCalls - 1)
    this.sendUpstream({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output,
      },
    })
    // The function_call lives inside the current response; in GA, queuing
    // its output doesn't stop the response and we must NOT send
    // response.cancel — that would cut the model's still-streaming audio
    // mid-sentence (and on async tools like ask_brain the relay sends a
    // "searching…" placeholder right after the call lands, so this race is
    // common). Just queue the next response.create; flushPendingResponseCreate
    // fires it after response.done lands naturally.
    if (this.isResponseActive) {
      log(`[${this.providerName}] Tool result (${callId}) queued; will fire response.create after response.done`)
      this.pendingResponseCreate = true
    } else {
      this.requestResponse(`tool:${callId}`)
    }
    if (this.pendingToolCalls === 0) {
      this.resetWatchdog()
    }
  }

  getTranscript() {
    return [...this.transcript]
  }

  getResumePreamble() {
    return this.resumeSummary ? formatSummaryPreamble(this.resumeSummary) : ""
  }

  getResumeHistory() {
    return [...this.resumeRecentTurns]
  }

  disconnect() {
    this.isClosing = true
    this.clearTimers()
    if (this.upstream && this.upstream.readyState !== WebSocket.CLOSED) {
      this.upstream.close(1000, "client disconnected")
    }
    this.upstream = null
    this.sendToClient = null
  }

  private async openUpstream(config: SessionConfigEvent): Promise<void> {
    const apiKey = process.env[this.apiKeyEnv]
    if (!apiKey) throw new Error(`${this.providerName} API key not configured`)

    this.isClosing = false
    this.resetResponseState()

    const model = config.model || this.defaultModel
    const url = `${this.realtimeUrl}?model=${model}`

    return new Promise((resolve, reject) => {
      this.upstream = new WebSocket(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          ...this.authHeaders,
        },
      })

      this.upstream.on("open", () => {
        log(`[${this.providerName}] Upstream WebSocket connected (model=${model})`)
        this.configureSession(config)
        resolve()
      })

      this.upstream.on("message", (raw) => {
        try {
          this.handleUpstreamEvent(JSON.parse(String(raw)))
        } catch (err) {
          logError(`[${this.providerName}] Failed to parse upstream message:`, err)
        }
      })

      this.upstream.on("unexpected-response", (_req, res: IncomingMessage) => {
        const httpStatus = res.statusCode ?? null
        logError(`[${this.providerName}] Upstream unexpected response: HTTP ${httpStatus}`)
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () => {
          const bodyExcerpt = Buffer.concat(chunks).toString("utf8").slice(0, 500) || null
          const mapped = mapAdapterError(this.providerName, httpStatus, bodyExcerpt)
          const err = Object.assign(
            new Error(`Unexpected server response: ${httpStatus}`),
            { httpStatus, bodyExcerpt, userMessage: mapped.userMessage, actionUrl: mapped.actionUrl, actionLabel: mapped.actionLabel },
          )
          if (!this.isRotating) {
            this.sendToClient?.({
              type: "error",
              message: mapped.userMessage,
              code: httpStatus ?? 502,
              userMessage: mapped.userMessage,
              actionUrl: mapped.actionUrl,
              actionLabel: mapped.actionLabel,
              httpStatus,
            })
            reject(err)
          }
        })
      })

      this.upstream.on("error", (err) => {
        logError(`[${this.providerName}] Upstream error:`, err.message)
        if (!this.isRotating) reject(err)
      })

      this.upstream.on("close", (code, reason) => {
        const reasonText = reason instanceof Buffer ? reason.toString("utf8") : String(reason)
        log(`[${this.providerName}] Upstream closed: ${code} ${reasonText}`)
        // Treat 1000 (normal) and 1005 (no-status — our own ws.close()
        // round-tripped) as clean. Anything else, only when we did not
        // initiate the close ourselves, gets surfaced to the client.
        const isCleanCode = code === 1000 || code === 1005
        if (!this.isRotating && !this.isClosing && !isCleanCode) {
          const mapped = mapAdapterError(this.providerName, null, reasonText || null)
          this.sendToClient?.({
            type: "error",
            message: mapped.userMessage,
            code: 502,
            userMessage: mapped.userMessage,
            actionUrl: mapped.actionUrl,
            actionLabel: mapped.actionLabel,
            httpStatus: null,
          })
        }
      })
    })
  }

  private configureSession(config: SessionConfigEvent) {
    let instructions = buildInstructions(config)

    if (this.resumeSummary) {
      instructions += `\n\n${formatSummaryPreamble(this.resumeSummary)}`
    }

    const tools = getTools(config)

    this.sendUpstream({
      type: "session.update",
      session: this.buildSessionConfig(config, instructions, tools),
    })

    this.injectResumeTurns()
  }

  private injectResumeTurns() {
    if (this.resumeContextInjected) return
    this.resumeContextInjected = true
    if (this.resumeRecentTurns.length === 0) return

    log(`[${this.providerName}] Injecting ${this.resumeRecentTurns.length} recent turn(s) via conversation.item.create`)
    for (const turn of this.resumeRecentTurns) {
      const contentType = turn.role === "user" ? "input_text" : "output_text"
      this.sendUpstream({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: turn.role,
          content: [{ type: contentType, text: formatStampedTurnText(turn) }],
        },
      })
    }
  }

  // Session rotation — seamlessly swap the upstream OpenAI session
  async rotate(): Promise<void> {
    if (!this.config || this.isRotating) return
    this.isRotating = true

    log(`[${this.providerName}] Starting session rotation...`)
    this.sendToClient?.({ type: "session.rotating" })

    const summary = this.summarizeTranscript()
    log(`[${this.providerName}] Transcript summary (${summary.length} chars): ${summary.substring(0, 100)}...`)

    // Fold the just-closed session's transcript into the resume context that
    // configureSession() reads — single source of truth so getResumePreamble
    // and the next session.update both see the post-rotation summary.
    this.resumeSummary = summary
    this.resumeRecentTurns = []
    this.resumeContextInjected = false

    if (this.upstream && this.upstream.readyState !== WebSocket.CLOSED) {
      this.upstream.close()
    }
    this.upstream = null

    try {
      await this.openUpstream(this.config)
      this.transcript = []
      this.startRotationTimer()
      this.sendToClient?.({ type: "session.rotated", sessionId: `rotated-${Date.now()}` })
      log(`[${this.providerName}] Session rotation complete`)
    } catch (err) {
      logError(`[${this.providerName}] Rotation failed:`, err)
      const errObj = err as Record<string, unknown>
      const httpStatus = (typeof errObj?.httpStatus === "number" ? errObj.httpStatus : null)
      const bodyExcerpt = (typeof errObj?.bodyExcerpt === "string" ? errObj.bodyExcerpt : null)
      const mapped = mapAdapterError(this.providerName, httpStatus, bodyExcerpt)
      this.sendToClient?.({
        type: "error",
        message: mapped.userMessage,
        code: httpStatus ?? 502,
        userMessage: mapped.userMessage,
        actionUrl: mapped.actionUrl,
        actionLabel: mapped.actionLabel,
        httpStatus,
      })
    } finally {
      this.isRotating = false
    }
  }

  private summarizeTranscript(): string {
    if (this.transcript.length === 0) return "No conversation yet."

    // Build a condensed summary of the conversation
    const lines = this.transcript.map(
      (t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`
    )

    // Keep last ~2000 chars of transcript as context
    let summary = lines.join("\n")
    if (summary.length > 2000) {
      summary = "...(earlier conversation omitted)...\n" + summary.slice(-2000)
    }

    return summary
  }

  private startRotationTimer() {
    this.clearRotationTimer()
    this.rotationTimer = setTimeout(() => {
      log(`[${this.providerName}] Rotation timer fired after ${ROTATION_INTERVAL_MS / 1000}s`)
      this.rotate()
    }, ROTATION_INTERVAL_MS)
  }

  private clearRotationTimer() {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer)
      this.rotationTimer = null
    }
  }

  private pauseWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }

  private resetWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer)
      this.watchdogTimer = null
    }
    if (!this.watchdogEnabled) return
    this.watchdogTimer = setTimeout(() => this.handleWatchdogTimeout(), WATCHDOG_TIMEOUT_MS)
  }

  private clearTimers() {
    this.clearRotationTimer()
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleUpstreamEvent(event: any) {
    switch (event.type) {
      // Session lifecycle
      case "session.created":
        log(`[${this.providerName}] Session created: ${event.session?.id}`)
        break
      case "session.updated":
        log(`[${this.providerName}] Session updated`)
        break
      case "ping":
      case "conversation.created":
      case "conversation.item.added":
      case "response.output_item.added":
      case "response.output_item.done":
      case "response.content_part.added":
      case "response.content_part.done":
        break

      // Audio output
      case "response.audio.delta":
      case "response.output_audio.delta":
        if (this.firstAudioDeltaAtMs == null) {
          this.firstAudioDeltaAtMs = Date.now()
        }
        this.sendToClient?.({ type: "audio.delta", data: event.delta })
        this.resetWatchdog()
        break

      // Transcripts (audio modality) and text-only output. GA emits
      // response.output_text.* when the model replies in text — we treat
      // those identically to audio transcripts so downstream sees a
      // single "assistant said this" stream regardless of modality.
      case "response.audio_transcript.delta":
      case "response.output_audio_transcript.delta":
      case "response.text.delta":
      case "response.output_text.delta":
        if (this.firstTextDeltaAtMs == null) {
          this.firstTextDeltaAtMs = Date.now()
        }
        this.sendToClient?.({
          type: "transcript.delta",
          text: event.delta,
          role: "assistant",
        })
        break
      case "response.audio_transcript.done":
      case "response.output_audio_transcript.done":
      case "response.text.done":
      case "response.output_text.done": {
        const finalText = event.transcript ?? event.text ?? ""
        if (finalText) this.transcript.push({ role: "assistant", text: finalText })
        this.sendToClient?.({
          type: "transcript.done",
          text: finalText,
          role: "assistant",
        })
        break
      }

      // User speech transcription (streaming deltas)
      case "conversation.item.input_audio_transcription.delta":
        this.sendToClient?.({
          type: "transcript.delta",
          text: event.delta,
          role: "user",
        })
        break

      // User speech transcription (final)
      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          this.transcript.push({ role: "user", text: event.transcript })
        }
        this.sendToClient?.({
          type: "transcript.done",
          text: event.transcript,
          role: "user",
        })
        break

      // Turn detection
      case "input_audio_buffer.speech_started":
        // Reset per-turn marks here (not response.done) because response.done
        // races the next turn's speech_started on quick-reply scenarios.
        this.resetLatencyMarks()
        this.turnStartedAtMs = Date.now()
        this.sendToClient?.({ type: "turn.started" })
        break
      case "input_audio_buffer.speech_stopped":
        // Explicit end-of-speech — the provider's VAD has decided the user
        // is done. This is our endpoint-start boundary.
        this.speechStoppedAtMs = Date.now()
        break

      // Function calls
      case "response.function_call_arguments.done":
        log(`[${this.providerName}] Tool call: ${event.name} (${event.call_id})`)
        this.pendingToolCalls++
        this.pauseWatchdog()
        this.sendToClient?.({
          type: "tool.call",
          callId: event.call_id,
          name: event.name,
          arguments: event.arguments,
        })
        break

      // Response lifecycle
      case "response.created":
        this.isResponseActive = true
        this.pendingResponseCancel = false
        this.pendingResponseCreate = false
        break
      case "response.done": {
        this.isResponseActive = false
        this.pendingResponseCancel = false
        // Emit latency metrics BEFORE turn.ended so the tracer's active
        // generation is still the correct target (turn.ended flips the active
        // turn to the pendingEnd bucket, but attachLatency handles both).
        this.emitLatencyMetrics(event.response?.status)
        this.sendToClient?.({ type: "turn.ended" })
        const usage = event.response?.usage
        if (usage) {
          this.sendToClient?.({
            type: "usage.metrics",
            promptTokens: usage.input_tokens,
            completionTokens: usage.output_tokens,
            totalTokens: usage.total_tokens,
            inputAudioTokens: usage.input_token_details?.audio_tokens,
            outputAudioTokens: usage.output_token_details?.audio_tokens,
          })
        }
        this.flushPendingResponseCreate()
        break
      }

      // Errors
      case "error": {
        const errorMessage: string = event.error?.message ?? "upstream error"
        logError(`[${this.providerName}] Error: ${errorMessage}`)
        this.resetResponseState()
        const parsedStatus = parseStatusFromMessage(errorMessage)
        const mapped = mapAdapterError(this.providerName, parsedStatus, errorMessage)
        this.sendToClient?.({
          type: "error",
          message: errorMessage,
          code: parsedStatus ?? 502,
          userMessage: mapped.userMessage,
          actionUrl: mapped.actionUrl,
          actionLabel: mapped.actionLabel,
          httpStatus: parsedStatus,
        })
        break
      }

      // Rate limits (log only)
      case "rate_limits.updated":
        break

      // Everything else — log for debugging
      default:
        if (event.type && !event.type.startsWith("response.content_part") &&
            !event.type.startsWith("response.output_item") &&
            event.type !== "input_audio_buffer.committed" &&
            event.type !== "input_audio_buffer.cleared" &&
            event.type !== "conversation.item.created" &&
            event.type !== "response.audio.done" &&
            event.type !== "response.output_audio.done" &&
            event.type !== "response.function_call_arguments.delta") {
          log(`[${this.providerName}] Unhandled event: ${event.type}`)
        }
    }
  }

  private sendUpstream(event: Record<string, unknown>): boolean {
    if (this.upstream?.readyState === WebSocket.OPEN) {
      this.upstream.send(JSON.stringify(event))
      return true
    }

    return false
  }

  private handleWatchdogTimeout() {
    if (this.isResponseActive) {
      log(`[${this.providerName}] Watchdog fired during active response, deferring`)
      this.resetWatchdog()
      return
    }

    log(`[${this.providerName}] Watchdog: no audio for 20s, injecting prompt`)
    this.sendUpstream({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "(The user has been silent for a while. If you were mid-conversation, gently check if they're still there. If the conversation had naturally ended, stay quiet.)" }],
      },
    })
    this.requestResponse("watchdog")
  }

  private requestResponse(reason: string) {
    if (this.isResponseActive) {
      this.pendingResponseCreate = true
      log(`[${this.providerName}] Skipping response.create (${reason}) because a response is already active`)
      return
    }

    this.pendingResponseCreate = false
    if (this.sendUpstream({ type: "response.create" })) {
      this.isResponseActive = true
      this.pendingResponseCancel = false
    }
  }

  private flushPendingResponseCreate() {
    if (!this.pendingResponseCreate) return

    log(`[${this.providerName}] Flushing queued response.create`)
    this.pendingResponseCreate = false
    if (this.sendUpstream({ type: "response.create" })) {
      this.isResponseActive = true
      this.pendingResponseCancel = false
    }
  }

  private resetResponseState() {
    this.isResponseActive = false
    this.pendingResponseCancel = false
    this.pendingResponseCreate = false
  }

  private resetLatencyMarks() {
    this.turnStartedAtMs = null
    this.speechStoppedAtMs = null
    this.lastUpstreamAudioAtMs = null
    this.firstAudioDeltaAtMs = null
    this.firstTextDeltaAtMs = null
    this.turnWasInterrupted = false
  }

  private emitLatencyMetrics(responseStatus?: string) {
    // Skip interrupted turns — barge-ins don't have a meaningful "first
    // output" boundary. "cancelled" / "failed" statuses similarly.
    if (this.turnWasInterrupted) {
      this.resetLatencyMarks()
      return
    }
    if (typeof responseStatus === "string" && responseStatus !== "completed") {
      this.resetLatencyMarks()
      return
    }
    // VoiceClaw accepts either modality — users sometimes paste links or
    // ask for text output, and voice turns still land. Stamp whichever
    // modality came first as the "first output" anchor; emit both specific
    // marks separately too so dashboards can distinguish.
    const firstAudioAt = this.firstAudioDeltaAtMs
    const firstTextAt = this.firstTextDeltaAtMs
    const firstOutputAt = pickEarliest(firstAudioAt, firstTextAt)
    if (firstOutputAt == null) {
      // No output at all — nothing meaningful to measure against.
      this.resetLatencyMarks()
      return
    }
    const firstOutputModality =
      firstAudioAt != null && (firstTextAt == null || firstAudioAt <= firstTextAt)
        ? "audio"
        : "text"
    const endpointStart = this.speechStoppedAtMs ?? this.lastUpstreamAudioAtMs ?? null
    const endpointSource = this.speechStoppedAtMs != null
      ? "server_eos"
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

  private buildSessionConfig(
    config: SessionConfigEvent,
    instructions: string,
    tools: ReturnType<typeof getTools>,
  ): Record<string, unknown> {
    const voice = config.voice || this.defaultVoice
    const model = config.model || this.defaultModel
    const turnDetection = {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 800,
    }
    const toolChoice = tools.length > 0 ? "auto" : "none"

    if (this.sessionFormat === "xai") {
      return {
        instructions,
        voice,
        turn_detection: turnDetection,
        tools,
        tool_choice: toolChoice,
        audio: {
          input: { format: { type: "audio/pcm", rate: 24000 } },
          output: { format: { type: "audio/pcm", rate: 24000 } },
        },
      }
    }

    return {
      type: "realtime",
      model,
      instructions,
      output_modalities: ["audio"],
      audio: {
        input: {
          format: { type: "audio/pcm", rate: 24000 },
          turn_detection: turnDetection,
          transcription: { model: DEFAULT_TRANSCRIPTION_MODEL },
        },
        output: {
          format: { type: "audio/pcm", rate: 24000 },
          voice,
        },
      },
      tools,
      tool_choice: toolChoice,
    }
  }
}

function pickEarliest(a: number | null, b: number | null): number | null {
  if (a == null) return b
  if (b == null) return a
  return Math.min(a, b)
}

// Extract an HTTP status code embedded in a WebSocket error message.
// xAI and OpenAI sometimes embed status codes as trailing numbers, e.g.
// "Unexpected server response: 429".
function parseStatusFromMessage(message: string): number | null {
  const m = message.match(/(\d{3})\s*$/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return n >= 400 && n < 600 ? n : null
}
