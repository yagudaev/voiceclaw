// Relay session — manages the lifecycle of a single client connection

import { randomUUID } from "node:crypto"
import { context, ROOT_CONTEXT } from "@opentelemetry/api"
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
import { buildInstructions } from "./instructions.js"
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
      case "latency.metrics":
        this.tracer.attachLatency({
          endpointMs: event.endpointMs,
          endpointSource: event.endpointSource,
          providerFirstByteMs: event.providerFirstByteMs,
          firstAudioFromTurnStartMs: event.firstAudioFromTurnStartMs,
        })
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

  private handleAskBrain(callId: string, args: string) {
    if (!this.config) return

    const controller = new AbortController()
    this.inFlightTools.set(callId, controller)

    let query: string
    try {
      const parsed = JSON.parse(args)
      query = parsed.query
      if (typeof query !== "string" || query.trim() === "") {
        throw new Error("missing or empty query")
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid arguments"
      const errorPayload = JSON.stringify({ error: msg })
      this.tracer.endToolCall(callId, errorPayload, msg)
      this.adapter?.sendToolResult(callId, errorPayload)
      this.inFlightTools.delete(callId)
      return
    }

    // Immediately unblock Gemini so the user can keep talking.
    // Gemini will naturally say something like "Let me check on that."
    // The tool span stays OPEN past this point — it closes only when the real
    // brain response lands, so span duration reflects the actual brain call
    // and traceparent injection in askBrain() uses a live span as parent.
    this.adapter?.sendToolResult(callId, JSON.stringify({
      status: "searching",
      message: "Looking into it now. I'll share what I find in a moment.",
    }))

    // Run the brain agent in the background.
    // Keep the controller in inFlightTools so cleanup() can abort it on disconnect.
    const sendToClient: SendToClient = (event) => this.send(event)
    const gatewayUrl = process.env.BRAIN_GATEWAY_URL || process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789"
    const authToken = process.env.BRAIN_GATEWAY_AUTH_TOKEN || process.env.OPENCLAW_GATEWAY_AUTH_TOKEN || this.config.apiKey
    // Fall back to this connection's id so Langfuse Sessions show one entry
    // per real conversation instead of collapsing every anonymous client
    // into a single shared "voiceclaw:realtime" session.
    const sessionKey = this.config.sessionKey || this.id

    const brainStart = Date.now()
    log(`[session:${this.id}] ask_brain (async) → ${gatewayUrl}`)

    // Run the fetch inside the tool span's OTel context so `propagation.inject`
    // in brain.ts sees it as the active parent and writes a `traceparent`
    // header linking openclaw's incoming request back to this span. If the
    // tool span is missing for any reason, fall back to ROOT_CONTEXT — never
    // context.active(), which could be whatever ambient (unrelated) span
    // happens to be live at this moment and would produce a misleading trace.
    const brainCtx = this.tracer.getToolSpanContext(callId) ?? ROOT_CONTEXT
    const runAskBrain = () => askBrain(query, {
      gatewayUrl,
      authToken,
      sessionId: sessionKey,
    }, sendToClient, callId, controller.signal)

    context.with(brainCtx, runAskBrain).then((result) => {
      const brainMs = Date.now() - brainStart
      log(`[session:${this.id}] ask_brain completed in ${brainMs}ms`)

      if (controller.signal.aborted) {
        log(`[session:${this.id}] ask_brain (${callId}) was cancelled — discarding result`)
        this.tracer.endToolCall(callId, JSON.stringify({ status: "cancelled" }), "cancelled")
        return
      }

      this.tracer.endToolCall(callId, result)

      // Inject the result back into the conversation so Gemini speaks it
      this.adapter?.injectContext(
        `[Brain agent result for query: "${query}"]\n${result}\n\nPlease share this information with the user naturally.`
      )
    }).catch((err) => {
      const message = err instanceof Error ? err.message : "brain agent call failed"
      logError(`[session:${this.id}] ask_brain error:`, message)

      this.tracer.endToolCall(callId, JSON.stringify({ error: message }), message)

      if (!controller.signal.aborted) {
        this.adapter?.injectContext(
          `[Brain agent failed for query: "${query}": ${message}]\nLet the user know the search didn't work and offer to try again.`
        )
      }
    }).finally(() => {
      this.inFlightTools.delete(callId)
    })
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
    // Capture the assembled system prompt so every voice-turn span carries the
    // full context Gemini / OpenAI Realtime was configured with. Uses the same
    // buildInstructions the Gemini adapter feeds to the provider, so the trace
    // and the live session see the same string (minus anything the adapter
    // conditionally appends, e.g. tool schemas).
    const assembledInstructions = (() => {
      try {
        return buildInstructions(config)
      } catch {
        return null
      }
    })()
    this.tracer.startSession(
      config.sessionKey ?? this.id,
      config.userId ?? null,
      config.model ?? null,
      assembledInstructions,
    )

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

    const gatewayUrl = process.env.BRAIN_GATEWAY_URL || process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789"
    const authToken = process.env.BRAIN_GATEWAY_AUTH_TOKEN || process.env.OPENCLAW_GATEWAY_AUTH_TOKEN || this.config.apiKey
    const sessionKey = this.config.sessionKey || this.id
    const sessionId = this.id

    log(`[session:${sessionId}] Syncing transcript to brain (${transcript.length} turns, ${durationMin}min)`)

    // Wrap the transcript-sync in a background observation that shares this
    // session's id with the voice-turn traces, so the end-of-call memory save
    // appears under the same call in Langfuse's Sessions view (instead of as
    // an orphan trace). The ctx also propagates traceparent to openclaw so
    // openclaw's spans nest under this span.
    const bg = this.tracer.startBackgroundObservation("memory.save-transcript", {
      input: prompt,
    })

    // Fire-and-forget with bounded retries — gateway may be busy with the
    // tail of an ask_brain call that hadn't finished when the session ended.
    void context.with(bg.ctx, () =>
      retryTranscriptSync({ prompt, gatewayUrl, authToken, sessionKey, sessionId })
        .then((result) => bg.end({ output: result }))
        .catch((err) => bg.end({ error: err instanceof Error ? err.message : String(err) })),
    )
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
}): Promise<string> {
  const { prompt, gatewayUrl, authToken, sessionKey, sessionId } = opts
  for (let attempt = 1; attempt <= TRANSCRIPT_SYNC_BACKOFF_MS.length + 1; attempt++) {
    try {
      const result = await askBrain(
        prompt,
        { gatewayUrl, authToken, sessionId: sessionKey },
        noopSendToClient,
        "transcript-sync",
      )
      if (attempt > 1) {
        log(`[session:${sessionId}] Transcript sync succeeded on attempt ${attempt}`)
      }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const backoff = TRANSCRIPT_SYNC_BACKOFF_MS[attempt - 1]
      if (backoff === undefined) {
        logError(`[session:${sessionId}] Transcript sync gave up after ${attempt} attempts: ${message}`)
        throw err
      }
      logError(`[session:${sessionId}] Transcript sync attempt ${attempt} failed (${message}), retrying in ${backoff}ms`)
      await new Promise((resolve) => setTimeout(resolve, backoff))
    }
  }
  throw new Error("transcript sync loop exited without result")
}
