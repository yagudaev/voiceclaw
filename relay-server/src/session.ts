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
import { TurnTracer } from "./tracing/turn-tracer.js"
const SERVER_SIDE_TOOLS = new Set(["echo_tool", "ask_brain"])

export class RelaySession {
  readonly id = randomUUID()
  private ws: WebSocket
  private adapter: ProviderAdapter | null = null
  private config: SessionConfigEvent | null = null
  private startedAt: number = Date.now()
  private turnCount: number = 0
  private tracer = new TurnTracer()
  private inFlightTools = new Map<string, AbortController>()

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
    // Tracing side-effects — don't alter the forwarded event stream.
    switch (event.type) {
      case "turn.started":
        this.tracer.startTurn()
        break
      case "transcript.delta":
        if (event.role === "user") this.tracer.appendUserText(event.text)
        else this.tracer.appendAssistantText(event.text)
        break
      case "tool.call":
        this.tracer.startToolCall(event.callId, event.name, event.arguments)
        break
      case "turn.ended":
        this.tracer.endTurn()
        break
      case "usage.metrics":
        this.tracer.attachUsage(event)
        // Internal only — do not forward to client
        return
      case "tool.cancelled":
        this.handleToolCancelled(event.callIds)
        // Fall through — also forward to client so it can update UI
        // (drop the "Let me check on that..." prefix, clear spinners, etc.)
        break
    }

    // Intercept tool calls — handle server-side tools, forward the rest to client
    if (event.type === "tool.call" && SERVER_SIDE_TOOLS.has(event.name)) {
      this.handleServerToolCall(event.callId, event.name, event.arguments)
      return
    }

    // Track turns
    if (event.type === "turn.ended") {
      this.turnCount++
    }

    // Stamp the active turnId onto outbound turn.started so the client can
    // echo it back in client.timing events and we can attribute correctly.
    if (event.type === "turn.started") {
      const turnId = this.tracer.getActiveTurnId()
      if (turnId) {
        this.send({ ...event, turnId })
        return
      }
    }

    this.send(event)
  }

  private handleServerToolCall(callId: string, name: string, args: string) {
    log(`[session:${this.id}] Handling server-side tool: ${name}`)

    // Synchronous tools
    const syncResult = handleToolCall(name, args)
    if (syncResult !== null) {
      this.tracer.endToolCall(callId, syncResult)
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

    const controller = new AbortController()
    this.inFlightTools.set(callId, controller)

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

      const sessionKey = this.config.sessionKey || `voiceclaw:realtime`
      const result = await askBrain(query, {
        gatewayUrl,
        authToken,
        sessionId: sessionKey,
      }, sendToClient, callId, controller.signal)

      const brainMs = Date.now() - brainStart
      log(`[session:${this.id}] ask_brain completed in ${brainMs}ms`)
      // If the upstream cancelled mid-flight, the callId is dead — don't echo
      // a result back; it would be rejected and may confuse the model state.
      if (controller.signal.aborted) {
        log(`[session:${this.id}] ask_brain (${callId}) was cancelled — discarding result`)
        this.tracer.endToolCall(callId, result, "cancelled")
        return
      }
      this.tracer.endToolCall(callId, result)
      this.adapter?.sendToolResult(callId, result)
    } catch (err) {
      const message = err instanceof Error ? err.message : "brain agent call failed"
      logError(`[session:${this.id}] ask_brain error:`, message)
      const errorPayload = JSON.stringify({ error: message })
      this.tracer.endToolCall(callId, errorPayload, message)
      this.adapter?.sendToolResult(callId, errorPayload)
    } finally {
      this.inFlightTools.delete(callId)
    }
  }

  private handleToolCancelled(callIds: string[]) {
    for (const callId of callIds) {
      const controller = this.inFlightTools.get(callId)
      if (!controller) continue
      log(`[session:${this.id}] Aborting in-flight tool ${callId}`)
      controller.abort(new Error("upstream cancelled tool call"))
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
      case "frame.append":
        this.adapter?.sendFrame(event.data, event.mimeType)
        break
      case "response.create":
        this.adapter?.createResponse()
        break
      case "response.cancel":
        this.adapter?.cancelResponse()
        break
      case "tool.result":
        this.tracer.endToolCall(event.callId, event.output)
        this.adapter?.sendToolResult(event.callId, event.output)
        break
      case "client.timing":
        this.tracer.attachClientTiming(event.phase, event.ms, event.turnId)
        break
      default:
        this.sendError(`unknown event type: ${(event as { type: string }).type}`, 400)
    }
  }

  private async handleSessionConfig(config: SessionConfigEvent) {
    // Disconnect previous adapter if session.config is sent again
    if (this.adapter) {
      log(`[session:${this.id}] Replacing existing adapter`)
      this.abortAllInFlightTools("session replaced")
      this.adapter.disconnect()
      this.adapter = null
      // Close out any spans still attributed to the old logical session before
      // startSession() overwrites session metadata. Otherwise leftover
      // generations/tool spans stay open and late tool results land on the
      // wrong session.
      this.tracer.endSession()
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
    this.tracer.startSession(config.sessionKey ?? this.id, null, config.model ?? null)

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
    this.abortAllInFlightTools("session ended")
    this.tracer.endSession()
    this.syncTranscriptToBrain()
    this.adapter?.disconnect()
    this.adapter = null
  }

  private abortAllInFlightTools(reason: string) {
    if (this.inFlightTools.size === 0) return
    log(`[session:${this.id}] Aborting ${this.inFlightTools.size} in-flight tool(s): ${reason}`)
    for (const controller of this.inFlightTools.values()) {
      controller.abort(new Error(reason))
    }
    this.inFlightTools.clear()
  }

  private syncTranscriptToBrain() {
    if (!this.config || !this.adapter) return

    const transcript = this.adapter.getTranscript()
    if (transcript.length === 0) return

    const lines = transcript.map(
      (t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`
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
    const sessionKey = this.config.sessionKey || `voiceclaw:realtime`
    const sessionId = this.id

    log(`[session:${sessionId}] Syncing transcript to brain (${transcript.length} turns, ${durationMin}min)`)

    // Fire-and-forget with bounded retries — gateway may be busy with the
    // tail of an ask_brain call that hadn't finished when the session ended.
    void retryTranscriptSync({ prompt, gatewayUrl, authToken, sessionKey, sessionId })
  }
}

const TRANSCRIPT_SYNC_BACKOFF_MS = [5_000, 30_000, 120_000]
const noopSendToClient: SendToClient = () => {}

async function retryTranscriptSync(opts: {
  prompt: string
  gatewayUrl: string
  authToken: string
  sessionKey: string
  sessionId: string
}) {
  const { prompt, gatewayUrl, authToken, sessionKey, sessionId } = opts
  for (let attempt = 1; attempt <= TRANSCRIPT_SYNC_BACKOFF_MS.length + 1; attempt++) {
    try {
      await askBrain(
        prompt,
        { gatewayUrl, authToken, sessionId: sessionKey },
        noopSendToClient,
        "transcript-sync",
      )
      if (attempt > 1) {
        log(`[session:${sessionId}] Transcript sync succeeded on attempt ${attempt}`)
      }
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const backoff = TRANSCRIPT_SYNC_BACKOFF_MS[attempt - 1]
      if (backoff === undefined) {
        logError(`[session:${sessionId}] Transcript sync gave up after ${attempt} attempts: ${message}`)
        return
      }
      logError(`[session:${sessionId}] Transcript sync attempt ${attempt} failed (${message}), retrying in ${backoff}ms`)
      await new Promise((resolve) => setTimeout(resolve, backoff))
    }
  }
}
