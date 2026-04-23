// Per-session Langfuse tracer. One instance per RelaySession.
//
// Maps the relay event stream to Langfuse observations:
//   turn.started      → open a generation span for this turn
//   transcript.delta  → accumulate input/output on the active generation
//   turn.ended        → close the generation
//   tool.call / result → nested tool spans
//   client.timing     → attrs on the active generation
//   usage.metrics     → attrs on the active generation (buffered briefly
//                       after turn.ended since providers emit usage
//                       metadata separately from the end-of-turn marker)
//
// All methods no-op when Langfuse is not initialized, so callers don't
// need to guard every site.

import { randomUUID } from "node:crypto"
import { context, trace, type Context } from "@opentelemetry/api"
import { propagateAttributes, startObservation, type LangfuseGeneration, type LangfuseSpan, type LangfuseTool } from "@langfuse/tracing"
import { isLangfuseEnabled } from "./langfuse.js"

// How long to keep the generation object around after endTurn() so trailing
// usage.metrics / client.timing events from the same turn can still attach.
// Gemini in particular fans usageMetadata as an independent upstream message
// that can land milliseconds after turnComplete. Keep this small — tokens
// dropped on a 2s flush are far cheaper than blocking a turn's visibility
// in Langfuse for seconds.
const PENDING_FLUSH_MS = 2000

export class TurnTracer {
  private sessionId: string | null = null
  private userId: string | null = null
  private model: string | null = null
  // Assembled system prompt that the realtime provider was configured with —
  // attached to every voice-turn span so the trace is self-contained and a
  // reader can see exactly what instructions Gemini / OpenAI Realtime was
  // running under without cross-referencing the relay code.
  private sessionInstructions: string | null = null

  private activeGeneration: LangfuseGeneration | null = null
  private activeTurnId: string | null = null
  private activeToolSpans = new Map<string, LangfuseTool>()
  private pendingEnd: { generation: LangfuseGeneration, turnId: string, timer: ReturnType<typeof setTimeout> } | null = null
  // Monotonic per-session counter so a Langfuse session's traces sort
  // chronologically at a glance even without timestamp math.
  private turnIndex = 0
  // Lazy-creation state. A voice turn is recorded in startTurn but the
  // LangfuseGeneration is not materialized until the first piece of real
  // content (user/assistant text or a tool call) arrives — that way
  // VAD / false-positive turns that fire turn.started + turn.ended with
  // no content don't pollute the session with empty traces.
  private pendingTurn: {
    turnId: string
    turnIndex: number
    turnStartedAt: string
  } | null = null

  private currentUserText = ""
  private currentAssistantText = ""

  getActiveTurnId(): string | null {
    return this.activeTurnId
  }

  startSession(
    sessionId: string,
    userId: string | null,
    model: string | null,
    instructions: string | null = null,
  ) {
    this.sessionId = sessionId
    this.userId = userId
    this.model = model
    this.sessionInstructions = instructions
    this.turnIndex = 0
  }

  startTurn() {
    if (!isLangfuseEnabled()) return
    // Close any leftover generation (defensive — shouldn't happen if turn.ended fires)
    this.endTurn()
    this.flushPending()

    this.currentUserText = ""
    this.currentAssistantText = ""
    this.activeTurnId = randomUUID()
    this.turnIndex += 1
    // Intentionally defer startObservation until the first real event arrives.
    this.pendingTurn = {
      turnId: this.activeTurnId,
      turnIndex: this.turnIndex,
      turnStartedAt: new Date().toISOString(),
    }
  }

  private ensureActiveGeneration() {
    if (this.activeGeneration || !this.pendingTurn) return
    const pending = this.pendingTurn
    this.pendingTurn = null
    const metadata: Record<string, unknown> = {
      turnId: pending.turnId,
      turnIndex: pending.turnIndex,
      "client.turnStartedAt": pending.turnStartedAt,
    }
    // propagateAttributes writes sessionId/userId onto the OTel context so the
    // span created inside the callback (and its children) inherit them. Setting
    // them via metadata.langfuseSessionId is the Langchain integration pattern
    // and does NOT populate the trace's session field in the @langfuse/tracing
    // direct SDK.
    propagateAttributes(
      {
        ...(this.sessionId ? { sessionId: this.sessionId } : {}),
        ...(this.userId ? { userId: this.userId } : {}),
      },
      () => {
        this.activeGeneration = startObservation(
          "voice-turn",
          {
            model: this.model ?? undefined,
            metadata,
          },
          { asType: "generation" },
        )
      },
    )
  }

  appendUserText(text: string) {
    if (!text) return
    this.ensureActiveGeneration()
    if (!this.activeGeneration) return
    this.currentUserText += text
  }

  appendAssistantText(text: string) {
    if (!text) return
    this.ensureActiveGeneration()
    if (!this.activeGeneration) return
    this.currentAssistantText += text
  }

  startToolCall(callId: string, name: string, args: string) {
    if (!isLangfuseEnabled()) return
    this.ensureActiveGeneration()
    if (!this.activeGeneration) return
    const span = this.activeGeneration.startObservation(
      name,
      {
        input: safeParse(args),
        metadata: { callId },
      },
      { asType: "tool" },
    )
    this.activeToolSpans.set(callId, span)
  }

  endToolCall(callId: string, output: string, error?: string) {
    const span = this.activeToolSpans.get(callId)
    if (!span) return
    span.update({
      output: safeParse(output),
      ...(error ? { level: "ERROR" as const, statusMessage: error } : {}),
    })
    span.end()
    this.activeToolSpans.delete(callId)
  }

  // Returns an OTel Context rooted at the tool span for `callId`, or null if no
  // such span exists. Callers run outbound work (e.g. the ask_brain fetch)
  // inside `context.with(ctx, …)` so W3C traceparent headers injected by
  // `propagation.inject` attribute to this span — downstream services (the
  // openclaw gateway) then build their spans as children of it, producing a
  // single unified trace across the two services.
  getToolSpanContext(callId: string): Context | null {
    const span = this.activeToolSpans.get(callId)
    if (!span) return null
    return trace.setSpan(context.active(), span.otelSpan)
  }

  // Start a top-level observation outside the turn lifecycle — for background
  // work like the end-of-call transcript-sync that isn't tied to a specific
  // voice-turn but still belongs in the same Langfuse session. Returned
  // context propagates sessionId/userId so downstream (openclaw) spans land
  // on this trace and the whole thing groups under the call in Sessions view.
  startBackgroundObservation(
    name: string,
    opts?: { input?: unknown },
  ): { ctx: Context, end: (params?: { output?: unknown, error?: string }) => void } {
    if (!isLangfuseEnabled()) {
      return { ctx: context.active(), end: () => {} }
    }
    let span: LangfuseSpan | null = null
    propagateAttributes(
      {
        ...(this.sessionId ? { sessionId: this.sessionId } : {}),
        ...(this.userId ? { userId: this.userId } : {}),
      },
      () => {
        span = startObservation(name, {
          ...(opts?.input !== undefined ? { input: opts.input } : {}),
        })
      },
    )
    if (!span) {
      return { ctx: context.active(), end: () => {} }
    }
    const openedSpan: LangfuseSpan = span
    const ctx = trace.setSpan(context.active(), openedSpan.otelSpan)
    return {
      ctx,
      end: (params) => {
        if (params?.output !== undefined || params?.error) {
          openedSpan.update({
            ...(params?.output !== undefined ? { output: params.output } : {}),
            ...(params?.error
              ? { level: "ERROR" as const, statusMessage: params.error }
              : {}),
          })
        }
        openedSpan.end()
      },
    }
  }

  attachClientTiming(phase: string, ms: number, turnId?: string) {
    const target = this.resolveTarget(turnId)
    if (!target) return
    target.update({ metadata: { [`client.${phase}_ms`]: ms } })
  }

  // Attach adapter-measured latency samples to the voice-turn span as raw OTel
  // attributes (not Langfuse metadata — we want vendor-neutral keys so the
  // tracing UI can pluck them out of attributes_json directly). Called from
  // provider adapters that have the clock on both boundaries of the metric.
  //
  // Keys use a vendor-neutral voice.latency.* namespace. The OTel GenAI
  // semantic conventions don't cover voice endpointing yet, so squatting on
  // gen_ai.* for non-standard metrics would break when the spec lands real
  // conventions. voice.* is honest about scope.
  //
  // Semantics (single source of truth — callers compute the ms, we just stamp):
  //   endpoint_ms — end-of-speech signal → first model audio byte. Covers the
  //       provider's VAD endpoint wait plus model TTFT. What the user feels.
  //   endpoint.source — how end-of-speech was determined. Values:
  //     "server_eos"           — provider emitted an explicit end-of-speech
  //                              event (e.g. input_audio_buffer.speech_stopped).
  //     "transcription_proxy"  — no explicit event; derived from the last
  //                              input-transcription delta. Approximate.
  //     "last_audio_frame"     — derived from the last upstream audio write.
  //   provider_first_byte_ms — last upstream audio frame written → first model
  //       byte received. Provider-observed responsiveness once the relay has
  //       stopped talking; NOT a network RTT (includes provider queueing +
  //       any remaining VAD wait + initial generation).
  //   first_audio_from_turn_start_ms — turn.started → first model audio byte.
  //       TTFT-like, measured from the turn boundary we already stamp.
  attachLatency(metrics: {
    endpointMs?: number
    endpointSource?: string
    providerFirstByteMs?: number
    firstAudioFromTurnStartMs?: number
    firstTextFromTurnStartMs?: number
    firstOutputFromTurnStartMs?: number
    firstOutputModality?: string
  }, turnId?: string) {
    const target = this.resolveTarget(turnId) ?? this.resolveUsageTarget(turnId)
    if (!target) return
    const attrs: Record<string, string | number> = {}
    if (isNonNegativeFinite(metrics.endpointMs)) {
      attrs["voice.latency.endpoint_ms"] = Math.round(metrics.endpointMs)
    }
    if (metrics.endpointSource) {
      attrs["voice.latency.endpoint.source"] = metrics.endpointSource
    }
    if (isNonNegativeFinite(metrics.providerFirstByteMs)) {
      attrs["voice.latency.provider_first_byte_ms"] = Math.round(metrics.providerFirstByteMs)
    }
    if (isNonNegativeFinite(metrics.firstAudioFromTurnStartMs)) {
      attrs["voice.latency.first_audio_from_turn_start_ms"] = Math.round(metrics.firstAudioFromTurnStartMs)
    }
    if (isNonNegativeFinite(metrics.firstTextFromTurnStartMs)) {
      attrs["voice.latency.first_text_from_turn_start_ms"] = Math.round(metrics.firstTextFromTurnStartMs)
    }
    if (isNonNegativeFinite(metrics.firstOutputFromTurnStartMs)) {
      attrs["voice.latency.first_output_from_turn_start_ms"] = Math.round(metrics.firstOutputFromTurnStartMs)
    }
    if (metrics.firstOutputModality) {
      attrs["voice.latency.first_output.modality"] = metrics.firstOutputModality
    }
    if (Object.keys(attrs).length === 0) return
    target.otelSpan.setAttributes(attrs)
  }

  attachUsage(usage: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    inputAudioTokens?: number
    outputAudioTokens?: number
  }, turnId?: string) {
    // Providers emit usage for the turn that just finished, not the one in
    // progress. Prefer pendingEnd so a late usageMetadata arriving after the
    // next turn has already started still lands on the correct generation
    // instead of being misattributed to the new active turn.
    const target = this.resolveUsageTarget(turnId)
    if (!target) return
    const usageDetails: Record<string, number> = {}
    if (usage.promptTokens != null) usageDetails.input = usage.promptTokens
    if (usage.completionTokens != null) usageDetails.output = usage.completionTokens
    if (usage.totalTokens != null) usageDetails.total = usage.totalTokens
    if (usage.inputAudioTokens != null) usageDetails.input_audio = usage.inputAudioTokens
    if (usage.outputAudioTokens != null) usageDetails.output_audio = usage.outputAudioTokens
    target.update({ usageDetails })
  }

  endTurn(errorMessage?: string) {
    if (!this.activeGeneration) {
      // Lazy-create path: the turn ended before any real content landed, so
      // we never materialized a span. Just drop the pending state — no empty
      // voice-turn trace will appear in Langfuse.
      this.pendingTurn = null
      this.activeTurnId = null
      return
    }
    // Compose the input as a chat conversation including the system prompt
    // Gemini / OpenAI Realtime was configured with, so each trace is self-
    // contained: a reader can see the full context the voice model ran under
    // without cross-referencing the relay code.
    const chatInput: Array<{ role: string; content: string }> = []
    if (this.sessionInstructions) {
      chatInput.push({ role: "system", content: this.sessionInstructions })
    }
    if (this.currentUserText) {
      chatInput.push({ role: "user", content: this.currentUserText })
    }
    const inputForSpan =
      chatInput.length > 0 ? chatInput : this.currentUserText || undefined
    // Tool spans may legitimately outlive the turn they started in — async tools
    // (e.g. ask_brain) often resolve on a later turn. Leave them open; endSession
    // will WARNING-close anything still dangling when the socket closes.
    this.activeGeneration.update({
      input: inputForSpan,
      output: this.currentAssistantText || undefined,
      ...(errorMessage ? { level: "ERROR" as const, statusMessage: errorMessage } : {}),
    })
    // Keep the generation around briefly so trailing usage.metrics /
    // client.timing can still attach before we call .end() and hand the
    // span off to the exporter. Any earlier pending flushes first.
    this.flushPending()
    const generation = this.activeGeneration
    const turnId = this.activeTurnId ?? ""
    this.pendingEnd = {
      generation,
      turnId,
      timer: setTimeout(() => this.flushPending(), PENDING_FLUSH_MS),
    }
    this.activeGeneration = null
    this.activeTurnId = null
  }

  endSession() {
    this.endTurn()
    this.flushPending()
    for (const [callId, span] of this.activeToolSpans) {
      span.update({ level: "WARNING", statusMessage: "tool span closed without result" })
      span.end()
      this.activeToolSpans.delete(callId)
    }
  }

  private resolveTarget(turnId?: string): LangfuseGeneration | null {
    // Live turn — if a turnId is supplied, must match.
    if (this.activeGeneration && (!turnId || turnId === this.activeTurnId)) {
      return this.activeGeneration
    }
    // Recently-ended turn — usage/timing from the tail of the last turn.
    if (this.pendingEnd && (!turnId || turnId === this.pendingEnd.turnId)) {
      return this.pendingEnd.generation
    }
    return null
  }

  private resolveUsageTarget(turnId?: string): LangfuseGeneration | null {
    // Usage telemetry describes the turn that just completed, so prefer the
    // just-ended generation over any new active one. This matters when a late
    // usageMetadata lands after the user has already started the next turn.
    if (this.pendingEnd && (!turnId || turnId === this.pendingEnd.turnId)) {
      return this.pendingEnd.generation
    }
    if (this.activeGeneration && (!turnId || turnId === this.activeTurnId)) {
      return this.activeGeneration
    }
    return null
  }

  private flushPending() {
    if (!this.pendingEnd) return
    clearTimeout(this.pendingEnd.timer)
    this.pendingEnd.generation.end()
    this.pendingEnd = null
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

function isNonNegativeFinite(v: number | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0
}
