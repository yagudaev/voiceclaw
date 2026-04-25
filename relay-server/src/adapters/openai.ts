// OpenAI Realtime adapter — translates relay protocol ↔ OpenAI Realtime WebSocket events

import WebSocket from "ws"
import type { SessionConfigEvent } from "../types.js"
import type { ProviderAdapter, SendToClient } from "./types.js"
import { buildInstructions } from "../instructions.js"
import { getTools } from "../tools/index.js"
import { buildHistorySplit, formatSummaryPreamble, type HistoryMessage } from "../history.js"
import { log, error as logError } from "../log.js"

const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"
const DEFAULT_MODEL = "gpt-realtime-mini"
const DEFAULT_VOICE = "marin"

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
  // Conversation history populated on connect() and consumed once after the
  // first session.update. Cleared after injection so rotations don't replay
  // (they have their own summarizeTranscript() path).
  private resumeRecentTurns: HistoryMessage[] = []
  private resumeSummary: string | null = null

  constructor(options: OpenAICompatibleAdapterOptions = {}) {
    this.providerName = options.providerName ?? "openai"
    this.realtimeUrl = options.realtimeUrl ?? OPENAI_REALTIME_URL
    this.apiKeyEnv = options.apiKeyEnv ?? "OPENAI_API_KEY"
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL
    this.defaultVoice = options.defaultVoice ?? DEFAULT_VOICE
    this.authHeaders = options.authHeaders ?? { "OpenAI-Beta": "realtime=v1" }
    this.sessionFormat = options.sessionFormat ?? "openai"
  }

  async connect(config: SessionConfigEvent, sendToClient: SendToClient): Promise<void> {
    this.sendToClient = sendToClient
    this.config = config
    this.watchdogEnabled = config.watchdog === "enabled"

    const split = await buildHistorySplit(config.conversationHistory, "openai")
    this.resumeRecentTurns = split.recent
    this.resumeSummary = split.summary
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

  sendFrame(_data: string, _mimeType?: string) {
    // OpenAI Realtime does not support video input
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
    if (this.isResponseActive) {
      log(`[${this.providerName}] Tool result (${callId}) arrived mid-response, canceling current response before continuing`)
      this.pendingResponseCreate = true
      if (!this.pendingResponseCancel) {
        this.pendingResponseCancel = true
        this.sendUpstream({ type: "response.cancel" })
      }
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

  disconnect() {
    this.clearTimers()
    if (this.upstream && this.upstream.readyState !== WebSocket.CLOSED) {
      this.upstream.close()
    }
    this.upstream = null
    this.sendToClient = null
  }

  private async openUpstream(config: SessionConfigEvent): Promise<void> {
    const apiKey = process.env[this.apiKeyEnv]
    if (!apiKey) throw new Error(`${this.providerName} API key not configured`)

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

      this.upstream.on("error", (err) => {
        logError(`[${this.providerName}] Upstream error:`, err.message)
        if (!this.isRotating) reject(err)
      })

      this.upstream.on("close", (code, reason) => {
        log(`[${this.providerName}] Upstream closed: ${code} ${String(reason)}`)
        if (!this.isRotating) {
          this.sendToClient?.({ type: "error", message: "upstream connection closed", code: 502 })
        }
      })
    })
  }

  private configureSession(config: SessionConfigEvent, contextSummary?: string) {
    let instructions = buildInstructions(config)

    if (this.resumeSummary) {
      instructions += `\n\n${formatSummaryPreamble(this.resumeSummary)}`
    }

    if (contextSummary) {
      instructions += `\n\n## Conversation Context (from previous session)\n${contextSummary}`
    }

    const tools = getTools(config)

    this.sendUpstream({
      type: "session.update",
      session: this.buildSessionConfig(config, instructions, tools),
    })

    this.injectResumeTurns()
  }

  private injectResumeTurns() {
    if (this.resumeRecentTurns.length === 0) return

    log(`[${this.providerName}] Injecting ${this.resumeRecentTurns.length} recent turn(s) via conversation.item.create`)
    for (const turn of this.resumeRecentTurns) {
      const contentType = turn.role === "user" ? "input_text" : "output_text"
      this.sendUpstream({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: turn.role,
          content: [{ type: contentType, text: turn.text }],
        },
      })
    }

    this.resumeRecentTurns = []
    this.resumeSummary = null
  }

  // Session rotation — seamlessly swap the upstream OpenAI session
  async rotate(): Promise<void> {
    if (!this.config || this.isRotating) return
    this.isRotating = true

    log(`[${this.providerName}] Starting session rotation...`)
    this.sendToClient?.({ type: "session.rotating" })

    // Summarize transcript for context injection
    const summary = this.summarizeTranscript()
    log(`[${this.providerName}] Transcript summary (${summary.length} chars): ${summary.substring(0, 100)}...`)

    // Close old upstream
    if (this.upstream && this.upstream.readyState !== WebSocket.CLOSED) {
      this.upstream.close()
    }
    this.upstream = null

    // Open new upstream with summary injected
    try {
      await this.openUpstreamWithSummary(this.config, summary)
      this.transcript = [] // Clear transcript for new session
      this.startRotationTimer()
      this.sendToClient?.({ type: "session.rotated", sessionId: `rotated-${Date.now()}` })
      log(`[${this.providerName}] Session rotation complete`)
    } catch (err) {
      logError(`[${this.providerName}] Rotation failed:`, err)
      this.sendToClient?.({ type: "error", message: "session rotation failed", code: 502 })
    } finally {
      this.isRotating = false
    }
  }

  private async openUpstreamWithSummary(config: SessionConfigEvent, summary: string): Promise<void> {
    const apiKey = process.env[this.apiKeyEnv]
    if (!apiKey) throw new Error(`${this.providerName} API key not configured`)

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
        log(`[${this.providerName}] New upstream connected after rotation`)
        this.configureSession(config, summary)
        resolve()
      })

      this.upstream.on("message", (raw) => {
        try {
          this.handleUpstreamEvent(JSON.parse(String(raw)))
        } catch (err) {
          logError(`[${this.providerName}] Failed to parse upstream message:`, err)
        }
      })

      this.upstream.on("error", (err) => {
        logError(`[${this.providerName}] New upstream error:`, err.message)
        reject(err)
      })

      this.upstream.on("close", (code, reason) => {
        log(`[${this.providerName}] Upstream closed: ${code} ${String(reason)}`)
        if (!this.isRotating) {
          this.sendToClient?.({ type: "error", message: "upstream connection closed", code: 502 })
        }
      })
    })
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

      // Transcripts
      case "response.audio_transcript.delta":
      case "response.output_audio_transcript.delta":
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
        this.transcript.push({ role: "assistant", text: event.transcript })
        this.sendToClient?.({
          type: "transcript.done",
          text: event.transcript,
          role: "assistant",
        })
        break

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
      case "error":
        logError(`[${this.providerName}] Error: ${event.error?.message ?? event}`)
        this.resetResponseState()
        this.sendToClient?.({
          type: "error",
          message: event.error?.message ?? "upstream error",
          code: 502,
        })
        break

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
            event.type !== "response.text.delta" &&
            event.type !== "response.text.done" &&
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
    const common = {
      instructions,
      voice: config.voice || this.defaultVoice,
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 800,
      },
      tools,
      tool_choice: tools.length > 0 ? "auto" : "none",
    }

    if (this.sessionFormat === "xai") {
      return {
        ...common,
        audio: {
          input: { format: { type: "audio/pcm", rate: 24000 } },
          output: { format: { type: "audio/pcm", rate: 24000 } },
        },
      }
    }

    return {
      ...common,
      modalities: ["text", "audio"],
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: {
        model: "gpt-4o-mini-transcribe",
      },
      temperature: 0.8,
    }
  }
}

function pickEarliest(a: number | null, b: number | null): number | null {
  if (a == null) return b
  if (b == null) return a
  return Math.min(a, b)
}
