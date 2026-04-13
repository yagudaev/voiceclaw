// OpenAI Realtime adapter — translates relay protocol ↔ OpenAI Realtime WebSocket events

import WebSocket from "ws"
import type { SessionConfigEvent } from "../types.js"
import type { ProviderAdapter, SendToClient } from "./types.js"
import { buildInstructions } from "../instructions.js"
import { getTools } from "../tools/index.js"

const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"
const MODEL = "gpt-4o-mini-realtime-preview"

export class OpenAIAdapter implements ProviderAdapter {
  private upstream: WebSocket | null = null
  private sendToClient: SendToClient | null = null
  private config: SessionConfigEvent | null = null

  async connect(config: SessionConfigEvent, sendToClient: SendToClient): Promise<void> {
    this.sendToClient = sendToClient
    this.config = config

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
        reject(err)
      })

      this.upstream.on("close", (code, reason) => {
        console.log(`[openai] Upstream closed: ${code} ${String(reason)}`)
        this.sendToClient?.({ type: "error", message: "upstream connection closed", code: 502 })
      })
    })
  }

  sendAudio(data: string) {
    this.sendUpstream({
      type: "input_audio_buffer.append",
      audio: data,
    })
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
    // After sending tool result, trigger a new response so the model speaks the result
    this.sendUpstream({ type: "response.create" })
  }

  disconnect() {
    if (this.upstream && this.upstream.readyState !== WebSocket.CLOSED) {
      this.upstream.close()
    }
    this.upstream = null
    this.sendToClient = null
  }

  private configureSession(config: SessionConfigEvent) {
    const instructions = buildInstructions(config)
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
        this.sendToClient?.({
          type: "transcript.done",
          text: event.transcript,
          role: "assistant",
        })
        break

      // User speech transcription
      case "conversation.item.input_audio_transcription.completed":
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
        // Speech stopped, but turn isn't fully ended until response completes
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
