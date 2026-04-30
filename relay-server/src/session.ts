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
import { executeSyncTool, findRelayTool, getRelayTools, resolveTavilyKey } from "./tools/index.js"
import { askBrain } from "./tools/brain.js"
import { webSearch } from "./tools/web-search.js"
import { buildInstructions } from "./instructions.js"
import { log, error as logError } from "./log.js"
import { TurnTracer } from "./tracing/turn-tracer.js"
import { MediaCapture } from "./media/capture.js"
import { trackBackgroundTask } from "./shutdown.js"

export class RelaySession {
  readonly id = randomUUID()
  private ws: WebSocket
  private adapter: ProviderAdapter | null = null
  private config: SessionConfigEvent | null = null
  private startedAt: number = Date.now()
  private turnCount: number = 0
  private tracer = new TurnTracer()
  private media = new MediaCapture()
  // Wall-clock timestamp of the current turn's start, used for video frame
  // offset_ms values (turn-relative, not session-relative — playback aligns
  // each turn's video to its own audio).
  private currentTurnStartMs = 0
  private inFlightTools = new Map<string, AbortController>()
  private toolCallStartMs = new Map<string, number>()

  constructor(ws: WebSocket) {
    this.ws = ws
    this.ws.on("message", (raw) => this.handleMessage(raw))
    this.ws.on("close", () => {
      trackBackgroundTask(this.cleanup(), `session-cleanup:${this.id}`)
    })
    this.ws.on("error", (err) => {
      logError(`[session:${this.id}] WebSocket error:`, err.message)
      trackBackgroundTask(this.cleanup(), `session-cleanup:${this.id}`)
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
        this.startMediaTurn()
        break
      case "transcript.delta":
        if (event.role === "user") this.tracer.appendUserText(event.text)
        else this.tracer.appendAssistantText(event.text)
        break
      case "tool.call":
        this.tracer.startToolCall(event.callId, event.name, event.arguments)
        this.toolCallStartMs.set(event.callId, Date.now())
        break
      case "audio.delta":
        // Tee the model's outbound audio into the assistant capture file BEFORE
        // forwarding. Doing it pre-send keeps the wire format unchanged and
        // the file contents exactly match what the client hears.
        this.media.onAssistantAudioChunk(event.data)
        break
      case "turn.ended": {
        // Capture the turnId BEFORE endTurn() clears it so the async media
        // finalize (which races against the next turn starting) can target
        // the correct voice-turn span via attachMediaAttrs(attrs, turnId).
        const endingTurnId = this.tracer.getActiveTurnId()
        trackBackgroundTask(
          this.finalizeMediaTurn(endingTurnId),
          `media-finalize:${this.id}:${endingTurnId ?? "unknown"}`,
        )
        this.tracer.endTurn()
        break
      }
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
          firstTextFromTurnStartMs: event.firstTextFromTurnStartMs,
          firstOutputFromTurnStartMs: event.firstOutputFromTurnStartMs,
          firstOutputModality: event.firstOutputModality,
        })
        // Internal only — do not forward to client
        return
      case "tool.cancelled":
        this.handleToolCancelled(event.callIds)
        // Fall through — also forward to client so it can update UI
        // (drop the "Let me check on that..." prefix, clear spinners, etc.)
        break
      case "session.rotated":
        // Adapter just rebuilt the upstream with a fresh resume context
        // (rotation summary). Re-pull so post-rotation traces don't echo
        // the original pre-rotation preamble/history.
        if (this.adapter) {
          const preamble = this.adapter.getResumePreamble?.() ?? ""
          const resumeHistory = this.adapter.getResumeHistory?.() ?? []
          this.tracer.setSessionPreamble(preamble || null)
          this.tracer.setResumeHistory(resumeHistory)
        }
        break
    }

    if (event.type === "tool.call" && this.isServerSideTool(event.name)) {
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

    const tool = this.config ? findRelayTool(this.config, name) : null

    const syncResult = executeSyncTool(name, args)
    if (syncResult !== null) {
      this.tracer.endToolCall(callId, syncResult)
      this.emitToolCompleted(callId, name, syncResult)
      this.adapter?.sendToolResult(callId, syncResult)
      return
    }

    const blocking = tool?.blocking ?? false
    const adapterSupportsBlocking = this.adapter?.capabilities.blockingToolResponse ?? true
    if (blocking && adapterSupportsBlocking) {
      this.handleBlockingTool(callId, name, args)
      return
    }

    this.handleAsyncTool(callId, name, args)
  }

  private handleBlockingTool(callId: string, name: string, args: string) {
    if (name === "web_search") {
      this.runWebSearch(callId, args)
      return
    }
    if (name === "ask_brain") {
      this.runBlockingAskBrain(callId, args)
      return
    }
    log(`[session:${this.id}] No blocking executor registered for tool: ${name}`)
  }

  private handleAsyncTool(callId: string, name: string, args: string) {
    if (name === "ask_brain") {
      this.handleAskBrain(callId, args)
      return
    }
    if (name === "web_search") {
      this.handleAsyncWebSearch(callId, args)
      return
    }
    log(`[session:${this.id}] No async handler registered for tool: ${name}`)
  }

  private runWebSearch(callId: string, args: string) {
    if (!this.config) return

    // Resolve the Tavily key with the same precedence the tool registry used
    // (config first, env fallback). The model only sees web_search advertised
    // when this resolves, so a missing key here is a guard against stale
    // tool calls (e.g., the user cleared the key mid-session).
    const tavilyKey = resolveTavilyKey(this.config)
    if (!tavilyKey) {
      const errorPayload = JSON.stringify({ error: "Tavily API key not configured" })
      this.tracer.endToolCall(callId, errorPayload, "no tavily key")
      this.adapter?.sendToolResult(callId, errorPayload)
      return
    }

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
      this.emitToolFailed(callId, "web_search", msg, false)
      this.adapter?.sendToolResult(callId, errorPayload)
      return
    }

    const controller = new AbortController()
    this.inFlightTools.set(callId, controller)

    const start = Date.now()
    log(`[session:${this.id}] web_search → tavily`)

    // Run inside the tool span's OTel context so any future child spans (e.g.
    // if we add per-result tracing) attach to the right parent. Same pattern
    // as runBlockingAskBrain — never use context.active() as a fallback.
    const ctx = this.tracer.getToolSpanContext(callId) ?? ROOT_CONTEXT
    const run = () => webSearch(query, { apiKey: tavilyKey }, controller.signal)

    context.with(ctx, run).then((result) => {
      const ms = Date.now() - start
      log(`[session:${this.id}] web_search completed in ${ms}ms`)

      if (controller.signal.aborted) {
        log(`[session:${this.id}] web_search (${callId}) was cancelled — discarding result`)
        const cancelledPayload = JSON.stringify({ status: "cancelled" })
        this.tracer.endToolCall(callId, cancelledPayload, "cancelled")
        this.emitToolFailed(callId, "web_search", "cancelled", true)
        this.adapter?.sendToolResult(callId, cancelledPayload)
        return
      }

      this.tracer.endToolCall(callId, result)
      this.emitToolCompleted(callId, "web_search", result)
      this.adapter?.sendToolResult(callId, result)
    }).catch((err) => {
      const message = err instanceof Error ? err.message : "web search failed"
      logError(`[session:${this.id}] web_search error:`, message)

      const errorPayload = JSON.stringify({ error: message })
      this.tracer.endToolCall(callId, errorPayload, message)

      if (controller.signal.aborted) {
        this.emitToolFailed(callId, "web_search", message, true)
        this.adapter?.sendToolResult(callId, JSON.stringify({ status: "cancelled" }))
      } else {
        this.emitToolFailed(callId, "web_search", message, false)
        this.adapter?.sendToolResult(callId, errorPayload)
      }
    }).finally(() => {
      this.inFlightTools.delete(callId)
    })
  }

  private runBlockingAskBrain(callId: string, args: string) {
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
      this.emitToolFailed(callId, "ask_brain", msg, false)
      this.adapter?.sendToolResult(callId, errorPayload)
      this.inFlightTools.delete(callId)
      return
    }

    const sendToClient: SendToClient = (event) => this.send(event)
    const gatewayUrl = process.env.BRAIN_GATEWAY_URL || process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789"
    const authToken = process.env.BRAIN_GATEWAY_AUTH_TOKEN || process.env.OPENCLAW_GATEWAY_AUTH_TOKEN || this.config.apiKey
    const sessionKey = this.config.sessionKey || this.id

    const brainStart = Date.now()
    log(`[session:${this.id}] ask_brain (blocking) → ${gatewayUrl}`)

    const brainCtx = this.tracer.getToolSpanContext(callId) ?? ROOT_CONTEXT
    const runAskBrain = () => askBrain(query, {
      gatewayUrl,
      authToken,
      sessionId: sessionKey,
    }, sendToClient, callId, controller.signal)

    context.with(brainCtx, runAskBrain).then((result) => {
      const brainMs = Date.now() - brainStart
      log(`[session:${this.id}] ask_brain (blocking) completed in ${brainMs}ms`)

      if (controller.signal.aborted) {
        const cancelledPayload = JSON.stringify({ status: "cancelled" })
        this.tracer.endToolCall(callId, cancelledPayload, "cancelled")
        this.emitToolFailed(callId, "ask_brain", "cancelled", true)
        this.adapter?.sendToolResult(callId, cancelledPayload)
        return
      }

      this.tracer.endToolCall(callId, result)
      this.emitToolCompleted(callId, "ask_brain", result)
      this.send({ type: "brain.result", callId, query, result })
      this.adapter?.sendToolResult(callId, result)
    }).catch((err) => {
      const message = err instanceof Error ? err.message : "brain agent call failed"
      logError(`[session:${this.id}] ask_brain (blocking) error:`, message)

      const errorPayload = JSON.stringify({ error: message })
      this.tracer.endToolCall(callId, errorPayload, message)

      if (controller.signal.aborted) {
        this.emitToolFailed(callId, "ask_brain", message, true)
        this.adapter?.sendToolResult(callId, JSON.stringify({ status: "cancelled" }))
      } else {
        this.emitToolFailed(callId, "ask_brain", message, false)
        this.send({ type: "brain.result", callId, query, error: message })
        this.adapter?.sendToolResult(callId, errorPayload)
      }
    }).finally(() => {
      this.inFlightTools.delete(callId)
    })
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
      this.emitToolFailed(callId, "ask_brain", msg, false)
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
        this.emitToolFailed(callId, "ask_brain", "cancelled", true)
        return
      }

      this.tracer.endToolCall(callId, result)
      this.emitToolCompleted(callId, "ask_brain", result)

      this.send({ type: "brain.result", callId, query, result })

      this.adapter?.injectContext(
        `[Brain agent result for query: "${query}"]\n${result}\n\nPlease share this information with the user naturally.`
      )
    }).catch((err) => {
      const message = err instanceof Error ? err.message : "brain agent call failed"
      logError(`[session:${this.id}] ask_brain error:`, message)

      this.tracer.endToolCall(callId, JSON.stringify({ error: message }), message)

      if (!controller.signal.aborted) {
        this.emitToolFailed(callId, "ask_brain", message, false)
        this.send({ type: "brain.result", callId, query, error: message })
        this.adapter?.injectContext(
          `[Brain agent failed for query: "${query}": ${message}]\nLet the user know the search didn't work and offer to try again.`
        )
      } else {
        this.emitToolFailed(callId, "ask_brain", message, true)
      }
    }).finally(() => {
      this.inFlightTools.delete(callId)
    })
  }

  private handleAsyncWebSearch(callId: string, args: string) {
    if (!this.config) return

    const tavilyKey = resolveTavilyKey(this.config)
    if (!tavilyKey) {
      const errorPayload = JSON.stringify({ error: "Tavily API key not configured" })
      this.tracer.endToolCall(callId, errorPayload, "no tavily key")
      this.emitToolFailed(callId, "web_search", "Tavily API key not configured", false)
      this.adapter?.sendToolResult(callId, errorPayload)
      return
    }

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
      this.emitToolFailed(callId, "web_search", msg, false)
      this.adapter?.sendToolResult(callId, errorPayload)
      return
    }

    const controller = new AbortController()
    this.inFlightTools.set(callId, controller)

    this.adapter?.sendToolResult(callId, JSON.stringify({
      status: "searching",
      message: "Looking that up now. I'll share what I find in a moment.",
    }))

    const start = Date.now()
    log(`[session:${this.id}] web_search (async) → tavily`)

    const ctx = this.tracer.getToolSpanContext(callId) ?? ROOT_CONTEXT
    const run = () => webSearch(query, { apiKey: tavilyKey }, controller.signal)

    context.with(ctx, run).then((result) => {
      const ms = Date.now() - start
      log(`[session:${this.id}] web_search (async) completed in ${ms}ms`)

      if (controller.signal.aborted) {
        this.tracer.endToolCall(callId, JSON.stringify({ status: "cancelled" }), "cancelled")
        this.emitToolFailed(callId, "web_search", "cancelled", true)
        return
      }

      this.tracer.endToolCall(callId, result)
      this.emitToolCompleted(callId, "web_search", result)
      this.adapter?.injectContext(
        `[Web search result for query: "${query}"]\n${result}\n\nPlease share this information with the user naturally.`
      )
    }).catch((err) => {
      const message = err instanceof Error ? err.message : "web search failed"
      logError(`[session:${this.id}] web_search (async) error:`, message)

      this.tracer.endToolCall(callId, JSON.stringify({ error: message }), message)

      if (!controller.signal.aborted) {
        this.emitToolFailed(callId, "web_search", message, false)
        this.adapter?.injectContext(
          `[Web search failed for query: "${query}": ${message}]\nLet the user know the search didn't work and offer to try again.`
        )
      } else {
        this.emitToolFailed(callId, "web_search", message, true)
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
        // Tee mic PCM into the user capture file before forwarding upstream.
        this.media.onUserAudioChunk(event.data)
        this.adapter?.sendAudio(event.data)
        break
      case "audio.append_capture_only":
        // Raw mic capture for recordings only. Do not forward upstream; Gemini
        // should keep receiving the echo-gated stream via audio.append.
        this.media.onUserAudioChunkCaptureOnly(event.data)
        break
      case "audio.commit":
        this.adapter?.commitAudio()
        break
      case "frame.append":
        // Tee video frames (JPEG base64) into the per-turn frame sequence.
        // Offset is turn-relative so playback aligns with the turn's audio.
        this.media.onVideoFrame(
          event.data,
          Math.max(0, Date.now() - this.currentTurnStartMs),
        )
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
      case "text.input":
        // Text-only user turn. Both adapters' injectContext implementations
        // accept the text and trigger a model response (Gemini via
        // realtimeInput.text, OpenAI via conversation.item.create + response.create),
        // so transcript.delta / transcript.done flow back through the existing
        // pipeline without needing a separate "go" signal here.
        if (event.text && event.text.trim().length > 0) {
          this.adapter?.injectContext(event.text)
        }
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
      // Order matters: flush capture + attach media attrs BEFORE the tracer
      // closes. Otherwise finalize resolves against a dead tracer and the
      // media.* attrs never reach the span.
      await this.finalizeMediaTurn(this.tracer.getActiveTurnId()).catch(() => undefined)
      await this.finalizeSessionMedia().catch(() => undefined)
      await this.media.endSession().catch(() => undefined)
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
    // full context Gemini / Grok Voice / OpenAI Realtime was configured with. Uses the same
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
    this.media.startSession(config.sessionKey ?? this.id)

    try {
      this.adapter = createAdapter(config.provider)
      await this.adapter.connect(config, (event) => this.handleRelayEvent(event))
      const preamble = this.adapter.getResumePreamble?.() ?? ""
      const resumeHistory = this.adapter.getResumeHistory?.() ?? []
      this.tracer.setSessionPreamble(preamble || null)
      this.tracer.setResumeHistory(resumeHistory)
      this.send({ type: "session.ready", sessionId: this.id })
      log(`[session:${this.id}] Session ready`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "adapter connection failed"
      logError(`[session:${this.id}] Adapter error:`, message)
      this.sendError(message, 500)
      this.ws.close()
    }
  }

  private async cleanup() {
    log(`[session:${this.id}] Disconnecting`)
    this.abortAllInFlightTools("session ended")
    // Order matters: flush turn capture + close media BEFORE the tracer ends
    // so media.* attrs can attach to the still-open voice-turn span.
    await this.finalizeMediaTurn(this.tracer.getActiveTurnId()).catch(() => undefined)
    // Session-level stitch (user.wav, assistant.wav, peaks.json, thumbnails.json)
    // lands on whichever turn is still attachable — typically the just-ended
    // final turn sitting in pendingEnds for PENDING_FLUSH_MS.
    await this.finalizeSessionMedia().catch(() => undefined)
    await this.media.endSession().catch(() => undefined)
    this.tracer.endSession()
    this.syncTranscriptToBrain()
    this.adapter?.disconnect()
    this.adapter = null
  }

  private startMediaTurn() {
    if (!this.media.isEnabled()) return
    const turnId = this.tracer.getActiveTurnId()
    if (!turnId) return
    this.currentTurnStartMs = Date.now()
    this.media.startTurn(turnId)
  }

  private async finalizeMediaTurn(turnId: string | null) {
    if (!this.media.isEnabled()) return
    if (!turnId) return
    try {
      const attrs = await this.media.finalizeTurn()
      if (attrs && Object.keys(attrs).length > 0) {
        this.tracer.attachMediaAttrs(attrs, turnId)
      }
    } catch (err) {
      logError(`[session:${this.id}] media finalize failed:`, err instanceof Error ? err.message : err)
    }
  }

  // Stitch per-turn captures into session-level files (user.wav, assistant.wav,
  // peaks.json, thumbnails.json) and stamp the resulting `media.session_*`
  // attrs on the most-recent-attachable voice-turn span. Called from cleanup()
  // and handleSessionConfig() (session-replace path).
  private async finalizeSessionMedia() {
    if (!this.media.isEnabled()) return
    const turnId = this.tracer.getRecentTurnIdForAttrs()
    if (!turnId) return
    try {
      const attrs = await this.media.finalizeSession()
      if (attrs && Object.keys(attrs).length > 0) {
        this.tracer.attachMediaAttrs(attrs, turnId)
      }
    } catch (err) {
      logError(`[session:${this.id}] session media finalize failed:`, err instanceof Error ? err.message : err)
    }
  }

  private emitToolCompleted(callId: string, name: string, result: string) {
    const startMs = this.toolCallStartMs.get(callId) ?? Date.now()
    this.toolCallStartMs.delete(callId)
    const truncated = result.length > 4096 ? result.slice(0, 4096) + "…" : result
    this.send({ type: "tool_call.completed", callId, name, durationMs: Date.now() - startMs, result: truncated })
  }

  private emitToolFailed(callId: string, name: string, error: string, cancelled: boolean) {
    const startMs = this.toolCallStartMs.get(callId) ?? Date.now()
    this.toolCallStartMs.delete(callId)
    this.send({ type: "tool_call.failed", callId, name, durationMs: Date.now() - startMs, error, cancelled })
  }

  private isServerSideTool(name: string): boolean {
    if (!this.config) return false
    return getRelayTools(this.config).some((tool) => tool.name === name)
  }

  private abortAllInFlightTools(reason: string) {
    if (this.inFlightTools.size === 0) return
    log(`[session:${this.id}] Aborting ${this.inFlightTools.size} in-flight tool(s): ${reason}`)
    for (const controller of this.inFlightTools.values()) {
      controller.abort(new Error(reason))
    }
    this.inFlightTools.clear()
    this.toolCallStartMs.clear()
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

    const syncPromise = context.with(bg.ctx, () =>
      retryTranscriptSync({ prompt, gatewayUrl, authToken, sessionKey, sessionId })
        .then((result) => bg.end({ output: result }))
        .catch((err) => bg.end({ error: err instanceof Error ? err.message : String(err) })),
    )
    trackBackgroundTask(syncPromise, `transcript-sync:${sessionId}`)
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
