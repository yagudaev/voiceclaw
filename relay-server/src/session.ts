// Relay session — manages the lifecycle of a single client connection

import { randomUUID } from "node:crypto"
import type { WebSocket } from "ws"
import type {
  ClientEvent,
  SessionConfigEvent,
  RelayEvent,
} from "./types.js"
import type { ProviderAdapter, SendToClient } from "./adapters/types.js"
import { createAdapter } from "./adapters/index.js"
import { handleToolCall } from "./tools/index.js"
import { askBrain } from "./tools/brain.js"
import { log, error as logError } from "./log.js"
const SERVER_SIDE_TOOLS = new Set(["echo_tool", "ask_brain"])

export class RelaySession {
  readonly id = randomUUID()
  private ws: WebSocket
  private adapter: ProviderAdapter | null = null
  private config: SessionConfigEvent | null = null
  private startedAt: number = Date.now()
  private turnCount: number = 0

  constructor(ws: WebSocket) {
    this.ws = ws
    this.ws.on("message", (raw) => this.handleMessage(raw))
    this.ws.on("close", () => this.cleanup())
    this.ws.on("error", (err) => {
      logError(`[session:${this.id}] WebSocket error:`, err.message)
      this.cleanup()
    })
    log(`[session:${this.id}] Client connected`)
  }

  private send(event: RelayEvent) {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(event))
    }
  }

  private sendError(message: string, code: number) {
    this.send({ type: "error", message, code })
  }

  private handleRelayEvent(event: RelayEvent) {
    // Intercept tool calls — handle server-side tools, forward the rest to client
    if (event.type === "tool.call" && SERVER_SIDE_TOOLS.has(event.name)) {
      this.handleServerToolCall(event.callId, event.name, event.arguments)
      return
    }

    // Track turns
    if (event.type === "turn.ended") {
      this.turnCount++
    }

    this.send(event)
  }

  private handleServerToolCall(callId: string, name: string, args: string) {
    log(`[session:${this.id}] Handling server-side tool: ${name}`)

    // Synchronous tools
    const syncResult = handleToolCall(name, args)
    if (syncResult !== null) {
      this.adapter?.sendToolResult(callId, syncResult)
      return
    }

    // Async tools
    if (name === "ask_brain") {
      this.handleAskBrain(callId, args)
      return
    }

  }

  private async handleAskBrain(callId: string, args: string) {
    if (!this.config) return

    try {
      const parsed = JSON.parse(args)
      const query = parsed.query

      // Send progress so the user knows the agent is thinking
      this.send({
        type: "transcript.delta",
        text: "Let me check on that...\n",
        role: "assistant",
      })

      const sendToClient: SendToClient = (event) => this.send(event)

      const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789"
      const authToken = process.env.OPENCLAW_GATEWAY_AUTH_TOKEN || this.config.apiKey

      const brainStart = Date.now()
      log(`[session:${this.id}] ask_brain → ${gatewayUrl}`)

      const result = await askBrain(query, {
        gatewayUrl,
        authToken,
        sessionId: this.id,
      }, sendToClient, callId)

      const brainMs = Date.now() - brainStart
      log(`[session:${this.id}] ask_brain completed in ${brainMs}ms`)
      this.adapter?.sendToolResult(callId, result)
    } catch (err) {
      const message = err instanceof Error ? err.message : "brain agent call failed"
      logError(`[session:${this.id}] ask_brain error:`, message)
      this.adapter?.sendToolResult(callId, JSON.stringify({ error: message }))
    }
  }

  private async handleMessage(raw: unknown) {
    let event: ClientEvent
    try {
      event = JSON.parse(String(raw))
    } catch {
      this.sendError("invalid JSON", 400)
      return
    }

    switch (event.type) {
      case "session.config":
        await this.handleSessionConfig(event)
        break
      case "audio.append":
        this.adapter?.sendAudio(event.data)
        break
      case "audio.commit":
        this.adapter?.commitAudio()
        break
      case "response.create":
        this.adapter?.createResponse()
        break
      case "response.cancel":
        this.adapter?.cancelResponse()
        break
      case "tool.result":
        this.adapter?.sendToolResult(event.callId, event.output)
        break
      default:
        this.sendError(`unknown event type: ${(event as { type: string }).type}`, 400)
    }
  }

  private async handleSessionConfig(config: SessionConfigEvent) {
    // Disconnect previous adapter if session.config is sent again
    if (this.adapter) {
      log(`[session:${this.id}] Replacing existing adapter`)
      this.adapter.disconnect()
      this.adapter = null
    }

    // Validate API key
    const expectedKey = process.env.RELAY_API_KEY
    if (!config.apiKey || (expectedKey && config.apiKey !== expectedKey)) {
      log(`[session:${this.id}] Auth failed — invalid API key`)
      this.sendError("unauthorized", 401)
      this.ws.close()
      return
    }

    log(`[session:${this.id}] Auth passed, creating ${config.provider} adapter (model=${config.model || "default"})`)
    this.config = config
    this.startedAt = Date.now()

    try {
      this.adapter = createAdapter(config.provider)
      await this.adapter.connect(config, (event) => this.handleRelayEvent(event))
      this.send({ type: "session.ready", sessionId: this.id })
      log(`[session:${this.id}] Session ready`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "adapter connection failed"
      logError(`[session:${this.id}] Adapter error:`, message)
      this.sendError(message, 500)
      this.ws.close()
    }
  }

  private cleanup() {
    log(`[session:${this.id}] Disconnecting`)
    this.syncTranscriptToBrain()
    this.adapter?.disconnect()
    this.adapter = null
  }

  private syncTranscriptToBrain() {
    if (!this.config || !this.adapter) return

    const transcript = this.adapter.getTranscript()
    if (transcript.length === 0) return

    const lines = transcript.map(
      (t) => `${t.role === "user" ? "User" : "Kira"}: ${t.text}`
    ).join("\n")

    const durationMin = Math.round((Date.now() - this.startedAt) / 60_000)
    const prompt = [
      "The following is a transcript of a voice conversation that just ended.",
      `Duration: ~${durationMin} minute(s), ${this.turnCount} turn(s).`,
      "Please remember the key facts, decisions, action items, and anything the user shared about themselves.",
      "Do NOT repeat the transcript back. Just quietly store what matters.\n",
      lines,
    ].join("\n")

    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789"
    const authToken = process.env.OPENCLAW_GATEWAY_AUTH_TOKEN || this.config.apiKey

    log(`[session:${this.id}] Syncing transcript to brain (${transcript.length} turns, ${durationMin}min)`)

    // Fire-and-forget — don't block cleanup
    const noop: SendToClient = () => {}
    askBrain(prompt, { gatewayUrl, authToken, sessionId: this.id }, noop, "transcript-sync").catch((err) => {
      logError(`[session:${this.id}] Transcript sync failed:`, err instanceof Error ? err.message : err)
    })
  }
}
