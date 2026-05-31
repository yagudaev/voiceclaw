// Relay session — manages the lifecycle of a single client connection

import { randomUUID, timingSafeEqual } from "node:crypto"
import { context, ROOT_CONTEXT } from "@opentelemetry/api"
import type { WebSocket } from "ws"
import {
  checkDeviceToken,
  getBridgeConfig,
  identifyDeviceToken,
  touchDeviceToken,
} from "./device-tokens.js"
import type {
  ClientEvent,
  SessionConfigEvent,
  RelayEvent,
} from "./types.js"
import type { ProviderAdapter, SendToClient } from "./adapters/types.js"
import { createAdapter } from "./adapters/index.js"
import { effectiveVoiceMode, executeSyncTool, findRelayTool, getGeminiTools, getRelayTools, isBlockingLatencyClass, resolveTavilyKey } from "./tools/index.js"
import { logAgentBackendSelection } from "./agents.js"
import { noteSupervisorSelected } from "./supervisor.js"
import { resolveAgentBackend, resolveVoiceMode } from "./types.js"
import { askBrain } from "./tools/brain.js"
import { webSearch } from "./tools/web-search.js"
import { runRead, READ_TOOL_NAME } from "./tools/direct/read.js"
import { runWrite, WRITE_TOOL_NAME } from "./tools/direct/write.js"
import { runEdit, EDIT_TOOL_NAME } from "./tools/direct/edit.js"
import { runBash, BASH_TOOL_NAME } from "./tools/direct/bash.js"
import { executeStandaloneTool, STANDALONE_TOOL_NAMES } from "./tools/exec-standalone.js"
import { mintGeminiToken } from "./tools/mint-gemini-token.js"
import { buildInstructions } from "./instructions.js"
import { ensureWorkspace } from "./workspace.js"
import { log, error as logError } from "./log.js"
import { TurnTracer } from "./tracing/turn-tracer.js"
import { MediaCapture } from "./media/capture.js"
import { trackBackgroundTask } from "./shutdown.js"

export class RelaySession {
  readonly id = randomUUID()
  private ws: WebSocket
  private adapter: ProviderAdapter | null = null
  private config: SessionConfigEvent | null = null
  // Direct mode resolves the Tavily key at session.prep time (config first, env
  // fallback) and stashes it here, since the standalone tool.exec path carries
  // no session.config to resolve it from.
  private directTavilyKey: string | null = null
  // True once a valid RELAY_API_KEY has been presented (via session.auth or
  // session.config). All privileged handlers — mint_token, tool.exec,
  // session.prep, audio/frame/response/tool.result — require this. When
  // RELAY_ALLOW_UNAUTHENTICATED=true is set (local dev), the flag flips true
  // on first message so legacy fixtures still work.
  private authed = false
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
      this.send(event)
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

    const blocking = tool ? isBlockingLatencyClass(tool.latencyClass) : false
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
    if (name === READ_TOOL_NAME) {
      this.runReadTool(callId, args)
      return
    }
    if (name === WRITE_TOOL_NAME) {
      this.runWriteTool(callId, args)
      return
    }
    if (name === EDIT_TOOL_NAME) {
      this.runEditTool(callId, args)
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
    if (name === BASH_TOOL_NAME) {
      this.handleBashTool(callId, args)
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

      const brainErrorMsg = extractBrainError(result)
      if (brainErrorMsg !== null) {
        logError(`[session:${this.id}] ask_brain (blocking) returned error payload:`, brainErrorMsg)
        this.tracer.endToolCall(callId, result, brainErrorMsg)
        this.emitToolFailed(callId, "ask_brain", brainErrorMsg, false)
        this.send({ type: "brain.result", callId, query, error: result })
        this.adapter?.sendToolResult(callId, result)
      } else {
        this.tracer.endToolCall(callId, result)
        this.emitToolCompleted(callId, "ask_brain", result)
        this.send({ type: "brain.result", callId, query, result })
        this.adapter?.sendToolResult(callId, result)
      }
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

      const brainErrorMsg = extractBrainError(result)
      if (brainErrorMsg !== null) {
        logError(`[session:${this.id}] ask_brain returned error payload:`, brainErrorMsg)
        this.tracer.endToolCall(callId, result, brainErrorMsg)
        this.emitToolFailed(callId, "ask_brain", brainErrorMsg, false)
        this.send({ type: "brain.result", callId, query, error: result })
        this.adapter?.injectContext(
          `[Brain agent failed for query: "${query}": ${brainErrorMsg}]\nLet the user know the search didn't work and offer to try again.`
        )
      } else {
        this.tracer.endToolCall(callId, result)
        this.emitToolCompleted(callId, "ask_brain", result)

        this.send({ type: "brain.result", callId, query, result })

        this.adapter?.injectContext(
          `[Brain agent result for query: "${query}"]\n${result}\n\nPlease share this information with the user naturally.`
        )
      }
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

  private async runReadTool(callId: string, args: string) {
    let parsed: { path?: unknown, offset?: unknown, limit?: unknown }
    try {
      parsed = JSON.parse(args)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid arguments"
      const errorPayload = JSON.stringify({ error: msg })
      this.tracer.endToolCall(callId, errorPayload, msg)
      this.emitToolFailed(callId, READ_TOOL_NAME, msg, false)
      this.adapter?.sendToolResult(callId, errorPayload)
      return
    }
    const path = typeof parsed.path === "string" ? parsed.path : ""
    const offset = typeof parsed.offset === "number" ? parsed.offset : undefined
    const limit = typeof parsed.limit === "number" ? parsed.limit : undefined

    log(`[session:${this.id}] read → ${path.slice(0, 120)}`)
    const result = await runRead({ path, offset, limit })
    const payload = JSON.stringify(result)

    if ("error" in result) {
      this.tracer.endToolCall(callId, payload, result.error)
      this.emitToolFailed(callId, READ_TOOL_NAME, result.error, false)
      this.adapter?.sendToolResult(callId, payload)
      return
    }

    this.tracer.endToolCall(callId, payload)
    this.emitToolCompleted(callId, READ_TOOL_NAME, payload)
    this.adapter?.sendToolResult(callId, payload)
  }

  private async runEditTool(callId: string, args: string) {
    let parsed: { path?: unknown, old_string?: unknown, new_string?: unknown, replace_all?: unknown }
    try {
      parsed = JSON.parse(args)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid arguments"
      const errorPayload = JSON.stringify({ error: msg })
      this.tracer.endToolCall(callId, errorPayload, msg)
      this.emitToolFailed(callId, EDIT_TOOL_NAME, msg, false)
      this.adapter?.sendToolResult(callId, errorPayload)
      return
    }
    const path = typeof parsed.path === "string" ? parsed.path : ""
    const oldString = typeof parsed.old_string === "string" ? parsed.old_string : ""
    const newString = typeof parsed.new_string === "string" ? parsed.new_string : ""
    const replaceAll = parsed.replace_all === true

    log(`[session:${this.id}] edit → ${path.slice(0, 120)} (old=${oldString.length}c, new=${newString.length}c${replaceAll ? ", replace_all" : ""})`)
    const result = await runEdit({
      path,
      old_string: oldString,
      new_string: newString,
      replace_all: replaceAll,
    })
    const payload = JSON.stringify(result)

    if ("error" in result) {
      this.tracer.endToolCall(callId, payload, result.error)
      this.emitToolFailed(callId, EDIT_TOOL_NAME, result.error, false)
      this.adapter?.sendToolResult(callId, payload)
      return
    }

    this.tracer.endToolCall(callId, payload)
    this.emitToolCompleted(callId, EDIT_TOOL_NAME, payload)
    this.adapter?.sendToolResult(callId, payload)
  }

  private async runWriteTool(callId: string, args: string) {
    let parsed: { path?: unknown, content?: unknown }
    try {
      parsed = JSON.parse(args)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid arguments"
      const errorPayload = JSON.stringify({ error: msg })
      this.tracer.endToolCall(callId, errorPayload, msg)
      this.emitToolFailed(callId, WRITE_TOOL_NAME, msg, false)
      this.adapter?.sendToolResult(callId, errorPayload)
      return
    }
    const path = typeof parsed.path === "string" ? parsed.path : ""
    const content = typeof parsed.content === "string" ? parsed.content : ""

    log(`[session:${this.id}] write → ${path.slice(0, 120)} (${content.length} chars)`)
    const result = await runWrite({ path, content })
    const payload = JSON.stringify(result)

    if ("error" in result) {
      this.tracer.endToolCall(callId, payload, result.error)
      this.emitToolFailed(callId, WRITE_TOOL_NAME, result.error, false)
      this.adapter?.sendToolResult(callId, payload)
      return
    }

    this.tracer.endToolCall(callId, payload)
    this.emitToolCompleted(callId, WRITE_TOOL_NAME, payload)
    this.adapter?.sendToolResult(callId, payload)
  }

  private handleBashTool(callId: string, args: string) {
    if (!this.config) return

    let parsed: { command?: unknown, timeout_ms?: unknown, background?: unknown }
    try {
      parsed = JSON.parse(args)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid arguments"
      const errorPayload = JSON.stringify({ error: msg })
      this.tracer.endToolCall(callId, errorPayload, msg)
      this.emitToolFailed(callId, BASH_TOOL_NAME, msg, false)
      this.adapter?.sendToolResult(callId, errorPayload)
      return
    }
    const command = typeof parsed.command === "string" ? parsed.command : ""
    const timeoutMs = typeof parsed.timeout_ms === "number" ? parsed.timeout_ms : undefined
    const background = parsed.background === true

    if (command.trim().length === 0) {
      const msg = "command is required"
      const errorPayload = JSON.stringify({ error: msg })
      this.tracer.endToolCall(callId, errorPayload, msg)
      this.emitToolFailed(callId, BASH_TOOL_NAME, msg, false)
      this.adapter?.sendToolResult(callId, errorPayload)
      return
    }

    const controller = new AbortController()
    this.inFlightTools.set(callId, controller)

    this.adapter?.sendToolResult(callId, JSON.stringify({
      status: "running",
      message: "Running that now. I'll narrate output as it arrives.",
    }))

    log(`[session:${this.id}] bash → ${command.slice(0, 120)}`)
    const startedAt = Date.now()

    runBash({ command, timeout_ms: timeoutMs, background }, {
      signal: controller.signal,
      onProgress: (event) => {
        if (controller.signal.aborted) return
        this.send({
          type: "tool.progress",
          callId,
          textDelta: event.textDelta,
          step: event.step,
        })
      },
    }).then((result) => {
      const durationMs = Date.now() - startedAt
      log(`[session:${this.id}] bash completed in ${durationMs}ms`)
      const payload = JSON.stringify(result)

      if (controller.signal.aborted) {
        this.tracer.endToolCall(callId, payload, "cancelled")
        this.emitToolFailed(callId, BASH_TOOL_NAME, "cancelled", true)
        return
      }

      if ("error" in result) {
        this.tracer.endToolCall(callId, payload, result.error)
        this.emitToolFailed(callId, BASH_TOOL_NAME, result.error, false)
        this.adapter?.injectContext(
          `[bash failed: ${result.error}]\nLet the user know the command didn't run and why.`,
        )
        return
      }

      this.tracer.endToolCall(callId, payload)
      this.emitToolCompleted(callId, BASH_TOOL_NAME, payload)
      if ("background" in result && result.background) {
        this.adapter?.injectContext(
          `[bash launched in background: ${command.slice(0, 200)}]\njobId=${result.jobId} pid=${result.pid ?? "?"} logPath=${result.logPath}\n\nThe job is running detached. Tell the user briefly that it's started, then move on. When they ask how it's going (or after enough time), use the read tool on ${result.logPath} to check the latest output; a trailing "[task-exit N]" line means it finished.`,
        )
      } else {
        this.adapter?.injectContext(
          `[bash result for command: ${command.slice(0, 200)}]\n${payload}\n\nNarrate the outcome to the user.`,
        )
      }
    }).catch((err) => {
      const message = err instanceof Error ? err.message : "bash failed"
      logError(`[session:${this.id}] bash error:`, message)
      this.tracer.endToolCall(callId, JSON.stringify({ error: message }), message)
      if (!controller.signal.aborted) {
        this.emitToolFailed(callId, BASH_TOOL_NAME, message, false)
        this.adapter?.injectContext(
          `[bash failed: ${message}]\nLet the user know the command didn't run and why.`,
        )
      } else {
        this.emitToolFailed(callId, BASH_TOOL_NAME, message, true)
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

    // Auth gate. session.auth and session.config carry credentials and run
    // their own checks; everything else requires this.authed === true. A peer
    // that talks to the WS without authenticating is closed with 1008 before
    // any privileged work happens (mint_token, tool.exec, session.prep, tool
    // dispatch, audio/frame forwarding).
    if (!this.authed && event.type !== "session.auth" && event.type !== "session.config") {
      if (isUnauthenticatedAllowed()) {
        this.authed = true
      } else {
        log(`[session:${this.id}] Rejected ${event.type} from unauthenticated peer`)
        this.sendError("unauthorized", 401)
        try { this.ws.close(1008, "unauthorized") } catch { /* ignore */ }
        return
      }
    }

    switch (event.type) {
      case "session.auth":
        await this.handleSessionAuth(event.apiKey, event.deviceName)
        break
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
          event.annotation,
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
      case "mint_token":
        await this.handleMintToken(event.provider, event.model)
        break
      case "tool.exec":
        this.handleStandaloneToolExec(event.callId, event.name, event.arguments)
        break
      case "session.prep":
        await this.handleSessionPrep(event.config)
        break
      default:
        this.sendError(`unknown event type: ${(event as { type: string }).type}`, 400)
    }
  }

  private async handleSessionAuth(apiKey: unknown, deviceName?: string) {
    const credential = await checkRelayCredential(apiKey)
    if (!credential.ok) {
      log(
        `[session:${this.id}] session.auth failed (reason=${credential.reason}: ${describeRejectReason(credential.reason)})`,
      )
      this.sendError("unauthorized", 401)
      try { this.ws.close(1008, "unauthorized") } catch { /* ignore */ }
      return
    }
    this.authed = true
    this.send({ type: "session.auth.ok" })
    log(`[session:${this.id}] session.auth ok (path=${credential.via})`)
    if (credential.via === "device-token" && credential.deviceId) {
      void touchDeviceToken(credential.deviceId)
      if (typeof apiKey === "string" && typeof deviceName === "string" && deviceName.trim().length > 0) {
        void identifyDeviceToken(apiKey, deviceName)
      }
    }
  }

  // "Direct to provider" — assemble the systemInstruction string and the Gemini
  // function declarations the client needs to splice into its own setup message.
  // Workspace-aware bits (identity, FACTS, recent memory, tool registration)
  // live on the relay; the client just relays the result into Gemini's setup.
  // Standalone: no adapter, no upstream connection.
  private async handleSessionPrep(config: SessionConfigEvent) {
    try {
      await ensureWorkspace()
    } catch (err) {
      logError(`[session:${this.id}] session.prep ensureWorkspace failed:`, err instanceof Error ? err.message : err)
    }
    try {
      const instructions = buildInstructions(config)
      this.directTavilyKey = resolveTavilyKey(config)
      // Direct mode delegates tools via tool.exec, which runs the standalone
      // executors. Advertise exactly the tools that path can fulfill so the
      // model never calls one the direct path can't run.
      const tools = getGeminiTools(config).filter((t) => STANDALONE_TOOL_NAMES.has(t.name))
      log(`[session:${this.id}] session.prep: ${instructions.length} chars, ${tools.length} tools`)
      this.send({ type: "session.prep.result", instructions, tools })
    } catch (err) {
      const message = err instanceof Error ? err.message : "session.prep failed"
      logError(`[session:${this.id}] session.prep error: ${message}`)
      this.send({ type: "session.prep.error", message })
    }
  }

  // "Direct to provider" — mint a short-lived auth token for the mobile client
  // so it can open its own Gemini Live WebSocket without ever seeing the
  // long-lived GEMINI_API_KEY. Standalone: no session.config required.
  private async handleMintToken(provider: string, model?: string) {
    if (provider !== "gemini") {
      this.send({
        type: "token.error",
        provider: provider as "openai" | "xai",
        message: `direct mode not yet supported for ${provider}`,
      })
      return
    }

    const apiKey = process.env.GEMINI_API_KEY ?? ""
    if (apiKey.length === 0) {
      logError(`[session:${this.id}] mint_token: GEMINI_API_KEY not set`)
      this.send({
        type: "token.error",
        provider: "gemini",
        message: "GEMINI_API_KEY is not set on the relay",
      })
      return
    }

    const result = await mintGeminiToken({ apiKey, model })
    if (!result.ok) {
      logError(`[session:${this.id}] mint_token: ${result.error}`)
      this.send({ type: "token.error", provider: "gemini", message: result.error })
      return
    }

    if (result.warning) {
      log(`[session:${this.id}] mint_token: ${result.warning}`)
    } else {
      log(`[session:${this.id}] mint_token: minted ephemeral=${result.ephemeral} expiresAt=${result.expiresAt}`)
    }

    this.send({
      type: "token",
      provider: "gemini",
      token: result.token,
      expiresAt: result.expiresAt,
      ephemeral: result.ephemeral,
      model,
    })
  }

  // "Direct to provider" — execute one tool on behalf of a mobile client that
  // is talking straight to Gemini. Reuses runRead/runWrite/runEdit/runBash via
  // executeStandaloneTool so the workspace, denylist, path-scoping, and
  // timeout semantics are identical to the in-session path. Standalone: no
  // session.config / adapter required.
  private handleStandaloneToolExec(callId: string, name: string, args: string) {
    if (typeof callId !== "string" || callId.length === 0) {
      this.send({
        type: "tool.error",
        callId: callId ?? "",
        name: name ?? "",
        error: "callId is required",
      })
      return
    }
    if (!STANDALONE_TOOL_NAMES.has(name)) {
      this.send({
        type: "tool.error",
        callId,
        name,
        error: `unknown tool: ${name}`,
      })
      return
    }

    const controller = new AbortController()
    this.inFlightTools.set(callId, controller)

    log(`[session:${this.id}] tool.exec → ${name} (callId=${callId})`)

    executeStandaloneTool(name, args, {
      signal: controller.signal,
      tavilyApiKey: this.directTavilyKey ?? undefined,
      onProgress: (event) => {
        if (controller.signal.aborted) return
        this.send({
          type: "tool.progress",
          callId,
          textDelta: event.textDelta,
          step: event.step,
          summary: event.summary,
        })
      },
    }).then((outcome) => {
      if (controller.signal.aborted) {
        log(`[session:${this.id}] tool.exec ${callId} aborted`)
        this.send({
          type: "tool.error",
          callId,
          name,
          error: "cancelled",
          durationMs: outcome.durationMs,
        })
        return
      }

      if (outcome.ok) {
        this.send({
          type: "tool.result",
          callId,
          name,
          result: outcome.result,
          durationMs: outcome.durationMs,
        })
      } else {
        this.send({
          type: "tool.error",
          callId,
          name,
          error: outcome.error,
          durationMs: outcome.durationMs,
        })
      }
    }).catch((err) => {
      const message = err instanceof Error ? err.message : "tool exec failed"
      logError(`[session:${this.id}] tool.exec ${callId} error: ${message}`)
      this.send({ type: "tool.error", callId, name, error: message })
    }).finally(() => {
      this.inFlightTools.delete(callId)
    })
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

    // Validate API key — accepts the master RELAY_API_KEY (desktop self-connect
    // and `yarn dev`) OR a valid per-device token (paired mobile clients).
    const credential = await checkRelayCredential(config.apiKey)
    if (!credential.ok) {
      log(
        `[session:${this.id}] Auth failed — invalid API key (reason=${credential.reason}: ${describeRejectReason(credential.reason)})`,
      )
      this.sendError("unauthorized", 401)
      this.ws.close()
      return
    }
    this.authed = true
    if (credential.via === "device-token" && credential.deviceId) {
      void touchDeviceToken(credential.deviceId)
      if (typeof config.apiKey === "string" && typeof config.deviceName === "string" && config.deviceName.trim().length > 0) {
        void identifyDeviceToken(config.apiKey, config.deviceName)
      }
    }

    const requestedMode = resolveVoiceMode(config.voiceMode)
    const runtimeMode = effectiveVoiceMode(config)
    const backend = resolveAgentBackend(config.agentBackend)
    log(`[session:${this.id}] Auth passed, creating ${config.provider} adapter (model=${config.model || "default"}, voiceMode=${requestedMode}${runtimeMode !== requestedMode ? ` →${runtimeMode}` : ""}, agentBackend=${backend})`)
    if (requestedMode === "supervisor") {
      noteSupervisorSelected(this.id, backend)
    }
    if (runtimeMode === "operator") {
      // Operator mode currently routes ask_brain through the existing openclaw
      // gateway regardless of which backend is selected. Logged here so the
      // selection is visible in traces; the real per-backend wiring lives in
      // agents.ts as a TODO.
      logAgentBackendSelection(this.id, backend)
    }
    this.config = config
    // Reset direct mode state on every session.config so a second config
    // doesn't carry a stale tavily key from a prior session.prep.
    this.directTavilyKey = null
    this.startedAt = Date.now()

    // When direct tools are enabled, ensure the workspace + default AGENTS.md
    // exist before buildInstructions reads them (and before the model gets
    // its first chance to call write/edit). Best-effort: failures here
    // shouldn't block the session, the tools will surface clearer errors.
    try {
      await ensureWorkspace()
    } catch (err) {
      logError(`[session:${this.id}] ensureWorkspace failed:`, err instanceof Error ? err.message : err)
    }
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
      const alreadyMapped = typeof (err as Record<string, unknown>).userMessage === "string"
      if (!alreadyMapped) {
        this.sendError(message, 500)
      }
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

// Wire-level credential check. Order is load-bearing:
//   1. RELAY_ALLOW_UNAUTHENTICATED dev hatch — bypass everything.
//   2. Master RELAY_API_KEY (timing-safe compare) — desktop self-connect and
//      `yarn dev`. MUST be checked before any device-token lookup so the
//      desktop self-connect does not depend on the bridge being up.
//   3. Per-device token — calls the localhost bridge owned by the desktop
//      main process. Live revocation: the bridge re-checks SQLite on every
//      call, so flipping `revoked = 1` rejects the next reconnect.
export type CredentialRejectReason =
  | "no-credential"
  | "master-key-mismatch-no-bridge"
  | "master-key-mismatch-token-unknown"

type CredentialResult =
  | { ok: true; via: "dev-hatch" }
  | { ok: true; via: "master-key" }
  | { ok: true; via: "device-token"; deviceId: string }
  | { ok: false; reason: CredentialRejectReason }

export async function checkRelayCredential(provided: unknown): Promise<CredentialResult> {
  if (isUnauthenticatedAllowed()) {
    return { ok: true, via: "dev-hatch" }
  }
  if (typeof provided !== "string" || provided.length === 0) {
    return { ok: false, reason: "no-credential" }
  }
  const expected = process.env.RELAY_API_KEY?.trim()
  if (expected && constantTimeMatch(provided, expected)) {
    return { ok: true, via: "master-key" }
  }
  const token = await checkDeviceToken(provided)
  if (token.ok) {
    return { ok: true, via: "device-token", deviceId: token.deviceId }
  }
  const bridge = getBridgeConfig()
  return {
    ok: false,
    reason: bridge ? "master-key-mismatch-token-unknown" : "master-key-mismatch-no-bridge",
  }
}

export function describeRejectReason(reason: CredentialRejectReason): string {
  switch (reason) {
    case "no-credential":
      return "no apiKey on session.auth"
    case "master-key-mismatch-no-bridge":
      return "master key did not match and no device-token bridge is reachable (relay is not configured for paired devices — start the desktop app, or set VOICECLAW_DEVICE_TOKEN_CHECK_URL/_NONCE)"
    case "master-key-mismatch-token-unknown":
      return "master key did not match and the bridge does not recognize this device token (unpaired or revoked)"
  }
}

function constantTimeMatch(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8")
  const bBuf = Buffer.from(b, "utf8")
  // timingSafeEqual requires equal-length buffers. Bail when they differ so
  // length-based early exits never reach the comparison itself.
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

function isUnauthenticatedAllowed(): boolean {
  return process.env.RELAY_ALLOW_UNAUTHENTICATED === "true"
}

function extractBrainError(result: string): string | null {
  try {
    const parsed = JSON.parse(result) as Record<string, unknown>
    if (parsed && typeof parsed === "object" && typeof parsed.error === "string") {
      return parsed.error
    }
  } catch {
    // not JSON
  }
  return null
}
