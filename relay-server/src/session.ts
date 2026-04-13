// Relay session — manages the lifecycle of a single client connection

import { randomUUID } from "node:crypto"
import type { WebSocket } from "ws"
import type {
  ClientEvent,
  SessionConfigEvent,
  RelayEvent,
} from "./types.js"
import type { ProviderAdapter, SendToClient } from "./adapters/types.js"
import { validateOpenClawToken } from "./auth.js"
import { createAdapter } from "./adapters/index.js"
import { handleToolCall } from "./tools/index.js"
import { askBrain } from "./tools/brain.js"

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
      console.error(`[session:${this.id}] WebSocket error:`, err.message)
      this.cleanup()
    })
    console.log(`[session:${this.id}] Client connected`)
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
    console.log(`[session:${this.id}] Handling server-side tool: ${name}`)

    // Synchronous tools
    const syncResult = handleToolCall(name, args)
    if (syncResult !== null) {
      this.adapter?.sendToolResult(callId, syncResult)
      return
    }

    // Async tools (ask_brain)
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

      const sendToClient: SendToClient = (event) => this.send(event)

      const result = await askBrain(query, {
        gatewayUrl: this.config.openclawGatewayUrl,
        authToken: this.config.openclawAuthToken,
        sessionId: this.id,
      }, sendToClient, callId)

      this.adapter?.sendToolResult(callId, result)
    } catch (err) {
      const message = err instanceof Error ? err.message : "brain agent call failed"
      console.error(`[session:${this.id}] ask_brain error:`, message)
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
    // Reject if no auth credentials
    if (!config.openclawAuthToken || !config.openclawGatewayUrl) {
      this.sendError("unauthorized", 401)
      this.ws.close()
      return
    }

    // Validate token against OpenClaw gateway
    console.log(`[session:${this.id}] Validating auth token against ${config.openclawGatewayUrl}`)
    const valid = await validateOpenClawToken(
      config.openclawGatewayUrl,
      config.openclawAuthToken,
    )

    if (!valid) {
      console.log(`[session:${this.id}] Auth failed`)
      this.sendError("unauthorized", 401)
      this.ws.close()
      return
    }

    console.log(`[session:${this.id}] Auth passed, creating ${config.provider} adapter`)
    this.config = config
    this.startedAt = Date.now()

    try {
      this.adapter = createAdapter(config.provider)
      await this.adapter.connect(config, (event) => this.handleRelayEvent(event))
      this.send({ type: "session.ready", sessionId: this.id })
      console.log(`[session:${this.id}] Session ready`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "adapter connection failed"
      console.error(`[session:${this.id}] Adapter error:`, message)
      this.sendError(message, 500)
      this.ws.close()
    }
  }

  private cleanup() {
    console.log(`[session:${this.id}] Disconnecting`)
    this.adapter?.disconnect()
    this.adapter = null
  }
}
