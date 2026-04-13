// OpenAI Realtime adapter — translates relay protocol ↔ OpenAI Realtime WebSocket events

import WebSocket from "ws"
import type { SessionConfigEvent } from "../types.js"
import type { ProviderAdapter, SendToClient } from "./types.js"
import { buildInstructions } from "../instructions.js"
import { getTools } from "../tools/index.js"

const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"
const MODEL = "gpt-4o-mini-realtime-preview"
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

  async connect(config: SessionConfigEvent, sendToClient: SendToClient): Promise<void> {
    this.sendToClient = sendToClient
    this.config = config

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

  commitAudio() {
    this.sendUpstream({ type: "input_audio_buffer.commit" })
  }

  createResponse() {
    this.sendUpstream({ type: "response.create" })
  }

  cancelResponse() {
    this.sendUpstream({ type: "response.cancel" })
  }

  sendToolResult(callId: string, output: string) {
    this.sendUpstream({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output,
      },
    })
    this.sendUpstream({ type: "response.create" })
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

    const url = `${OPENAI_REALTIME_URL}?model=${MODEL}`

    return new Promise((resolve, reject) => {
      this.upstream = new WebSocket(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      })

      this.upstream.on("open", () => {
        console.log("[openai] Upstream WebSocket connected")
        this.configureSession(config)
        resolve()
      })

      this.upstream.on("message", (raw) => {
        this.handleUpstreamEvent(JSON.parse(String(raw)))
      })

      this.upstream.on("error", (err) => {
        console.error("[openai] Upstream error:", err.message)
        if (!this.isRotating) reject(err)
      })

      this.upstream.on("close", (code, reason) => {
        console.log(`[openai] Upstream closed: ${code} ${String(reason)}`)
        if (!this.isRotating) {
          this.sendToClient?.({ type: "error", message: "upstream connection closed", code: 502 })
        }
      })
    })
  }

  private configureSession(config: SessionConfigEvent, contextSummary?: string) {
    let instructions = buildInstructions(config)

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
        voice: config.voice || "alloy",
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

    console.log("[openai] Starting session rotation...")
    this.sendToClient?.({ type: "session.rotating" })

    // Summarize transcript for context injection
    const summary = this.summarizeTranscript()
    console.log(`[openai] Transcript summary (${summary.length} chars): ${summary.substring(0, 100)}...`)

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
      console.log("[openai] Session rotation complete")
    } catch (err) {
      console.error("[openai] Rotation failed:", err)
      this.sendToClient?.({ type: "error", message: "session rotation failed", code: 502 })
    } finally {
      this.isRotating = false
    }
  }

  private async openUpstreamWithSummary(config: SessionConfigEvent, summary: string): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY not set")

    const url = `${OPENAI_REALTIME_URL}?model=${MODEL}`

    return new Promise((resolve, reject) => {
      this.upstream = new WebSocket(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      })

      this.upstream.on("open", () => {
        console.log("[openai] New upstream connected after rotation")
        this.configureSession(config, summary)
        resolve()
      })

      this.upstream.on("message", (raw) => {
        this.handleUpstreamEvent(JSON.parse(String(raw)))
      })

      this.upstream.on("error", (err) => {
        console.error("[openai] New upstream error:", err.message)
        reject(err)
      })

      this.upstream.on("close", (code, reason) => {
        console.log(`[openai] Upstream closed: ${code} ${String(reason)}`)
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
      console.log(`[openai] Rotation timer fired after ${ROTATION_INTERVAL_MS / 1000}s`)
      this.rotate()
    }, ROTATION_INTERVAL_MS)
  }

  private clearRotationTimer() {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer)
      this.rotationTimer = null
    }
  }

  private resetWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer)
    }
    this.watchdogTimer = setTimeout(() => {
      console.log("[openai] Watchdog: no audio for 20s, injecting prompt")
      // Inject a system message to check if user is still there
      this.sendUpstream({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "(The user has been silent for a while. If you were mid-conversation, gently check if they're still there. If the conversation had naturally ended, stay quiet.)" }],
        },
      })
      this.sendUpstream({ type: "response.create" })
    }, WATCHDOG_TIMEOUT_MS)
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
        console.log("[openai] Session created:", event.session?.id)
        break
      case "session.updated":
        console.log("[openai] Session updated")
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

      // User speech transcription
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
        console.log(`[openai] Tool call: ${event.name} (${event.call_id})`)
        this.sendToClient?.({
          type: "tool.call",
          callId: event.call_id,
          name: event.name,
          arguments: event.arguments,
        })
        break

      // Response lifecycle
      case "response.created":
        break
      case "response.done":
        this.sendToClient?.({ type: "turn.ended" })
        break

      // Errors
      case "error":
        console.error("[openai] Error:", event.error?.message ?? event)
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
          console.log(`[openai] Unhandled event: ${event.type}`)
        }
    }
  }

  private sendUpstream(event: Record<string, unknown>) {
    if (this.upstream?.readyState === WebSocket.OPEN) {
      this.upstream.send(JSON.stringify(event))
    }
  }
}
