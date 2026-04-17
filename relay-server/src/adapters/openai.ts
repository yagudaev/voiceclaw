// OpenAI Realtime adapter — translates relay protocol ↔ OpenAI Realtime WebSocket events

import WebSocket from "ws"
import type { SessionConfigEvent } from "../types.js"
import type { ProviderAdapter, SendToClient } from "./types.js"
import { buildInstructions } from "../instructions.js"
import { getTools } from "../tools/index.js"
import { log, error as logError } from "../log.js"

const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"
const DEFAULT_MODEL = "gpt-realtime-mini"

const ROTATION_INTERVAL_MS = parseInt(process.env.ROTATION_INTERVAL_MS ?? String(50 * 60 * 1000), 10) // 50 min default
const WATCHDOG_TIMEOUT_MS = 20_000 // 20 seconds with no audio out

export class OpenAIAdapter implements ProviderAdapter {
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

  async connect(config: SessionConfigEvent, sendToClient: SendToClient): Promise<void> {
    this.sendToClient = sendToClient
    this.config = config
    this.watchdogEnabled = config.watchdog === "enabled"

    await this.openUpstream(config)
    this.startRotationTimer()
    this.resetWatchdog()
  }

  sendAudio(data: string) {
    this.sendUpstream({
      type: "input_audio_buffer.append",
      audio: data,
    })
    this.resetWatchdog()
  }

  sendFrame(_data: string, _mimeType?: string) {
    // OpenAI Realtime does not support video input
  }

  injectContext(text: string) {
    log(`[openai] Injecting context via conversation.item.create (${text.length} chars)`)
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
      log(`[openai] Tool result (${callId}) arrived mid-response, canceling current response before continuing`)
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
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY not set")

    this.resetResponseState()

    const model = config.model || DEFAULT_MODEL
    const url = `${OPENAI_REALTIME_URL}?model=${model}`

    return new Promise((resolve, reject) => {
      this.upstream = new WebSocket(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      })

      this.upstream.on("open", () => {
        log(`[openai] Upstream WebSocket connected (model=${model})`)
        this.configureSession(config)
        resolve()
      })

      this.upstream.on("message", (raw) => {
        try {
          this.handleUpstreamEvent(JSON.parse(String(raw)))
        } catch (err) {
          logError("[openai] Failed to parse upstream message:", err)
        }
      })

      this.upstream.on("error", (err) => {
        logError("[openai] Upstream error:", err.message)
        if (!this.isRotating) reject(err)
      })

      this.upstream.on("close", (code, reason) => {
        log(`[openai] Upstream closed: ${code} ${String(reason)}`)
        if (!this.isRotating) {
          this.sendToClient?.({ type: "error", message: "upstream connection closed", code: 502 })
        }
      })
    })
  }

  private configureSession(config: SessionConfigEvent, contextSummary?: string) {
    let instructions = buildInstructions(config)

    // Inject conversation history from prior messages in this conversation
    if (config.conversationHistory && config.conversationHistory.length > 0) {
      const lines = config.conversationHistory.map(
        (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`
      ).join("\n")
      // Keep last ~3000 chars to stay within instruction limits
      const trimmed = lines.length > 3000 ? "...\n" + lines.slice(-3000) : lines
      instructions += `\n\n## Prior Conversation (this session continues an ongoing chat)\n${trimmed}`
    }

    // Inject context summary from previous session rotation
    if (contextSummary) {
      instructions += `\n\n## Conversation Context (from previous session)\n${contextSummary}`
    }

    const tools = getTools(config)

    this.sendUpstream({
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: config.voice || "marin",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "gpt-4o-mini-transcribe",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
        },
        tools,
        tool_choice: tools.length > 0 ? "auto" : "none",
        temperature: 0.8,
      },
    })
  }

  // Session rotation — seamlessly swap the upstream OpenAI session
  async rotate(): Promise<void> {
    if (!this.config || this.isRotating) return
    this.isRotating = true

    log("[openai] Starting session rotation...")
    this.sendToClient?.({ type: "session.rotating" })

    // Summarize transcript for context injection
    const summary = this.summarizeTranscript()
    log(`[openai] Transcript summary (${summary.length} chars): ${summary.substring(0, 100)}...`)

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
      log("[openai] Session rotation complete")
    } catch (err) {
      logError("[openai] Rotation failed:", err)
      this.sendToClient?.({ type: "error", message: "session rotation failed", code: 502 })
    } finally {
      this.isRotating = false
    }
  }

  private async openUpstreamWithSummary(config: SessionConfigEvent, summary: string): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY not set")

    this.resetResponseState()

    const model = config.model || DEFAULT_MODEL
    const url = `${OPENAI_REALTIME_URL}?model=${model}`

    return new Promise((resolve, reject) => {
      this.upstream = new WebSocket(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      })

      this.upstream.on("open", () => {
        log("[openai] New upstream connected after rotation")
        this.configureSession(config, summary)
        resolve()
      })

      this.upstream.on("message", (raw) => {
        try {
          this.handleUpstreamEvent(JSON.parse(String(raw)))
        } catch (err) {
          logError("[openai] Failed to parse upstream message:", err)
        }
      })

      this.upstream.on("error", (err) => {
        logError("[openai] New upstream error:", err.message)
        reject(err)
      })

      this.upstream.on("close", (code, reason) => {
        log(`[openai] Upstream closed: ${code} ${String(reason)}`)
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
      log(`[openai] Rotation timer fired after ${ROTATION_INTERVAL_MS / 1000}s`)
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
        log(`[openai] Session created: ${event.session?.id}`)
        break
      case "session.updated":
        log("[openai] Session updated")
        break

      // Audio output
      case "response.audio.delta":
        this.sendToClient?.({ type: "audio.delta", data: event.delta })
        this.resetWatchdog()
        break

      // Transcripts
      case "response.audio_transcript.delta":
        this.sendToClient?.({
          type: "transcript.delta",
          text: event.delta,
          role: "assistant",
        })
        break
      case "response.audio_transcript.done":
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
        this.transcript.push({ role: "user", text: event.transcript })
        this.sendToClient?.({
          type: "transcript.done",
          text: event.transcript,
          role: "user",
        })
        break

      // Turn detection
      case "input_audio_buffer.speech_started":
        this.sendToClient?.({ type: "turn.started" })
        break
      case "input_audio_buffer.speech_stopped":
        break

      // Function calls
      case "response.function_call_arguments.done":
        log(`[openai] Tool call: ${event.name} (${event.call_id})`)
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
        logError(`[openai] Error: ${event.error?.message ?? event}`)
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
            event.type !== "response.function_call_arguments.delta") {
          log(`[openai] Unhandled event: ${event.type}`)
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
      log("[openai] Watchdog fired during active response, deferring")
      this.resetWatchdog()
      return
    }

    log("[openai] Watchdog: no audio for 20s, injecting prompt")
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
      log(`[openai] Skipping response.create (${reason}) because a response is already active`)
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

    log("[openai] Flushing queued response.create")
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
}
