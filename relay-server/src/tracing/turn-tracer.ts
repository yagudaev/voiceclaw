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
import { propagateAttributes, startObservation, type LangfuseGeneration, type LangfuseTool } from "@langfuse/tracing"
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

  private activeGeneration: LangfuseGeneration | null = null
  private activeTurnId: string | null = null
  private activeToolSpans = new Map<string, LangfuseTool>()
  private pendingEnd: { generation: LangfuseGeneration, turnId: string, timer: ReturnType<typeof setTimeout> } | null = null

  private currentUserText = ""
  private currentAssistantText = ""

  getActiveTurnId(): string | null {
    return this.activeTurnId
  }

  startSession(sessionId: string, userId: string | null, model: string | null) {
    this.sessionId = sessionId
    this.userId = userId
    this.model = model
  }

  startTurn() {
    if (!isLangfuseEnabled()) return
    // Close any leftover generation (defensive — shouldn't happen if turn.ended fires)
    this.endTurn()
    // Any still-pending trailing updates from the prior turn must be flushed
    // before a new generation takes over as the target for attach* calls.
    this.flushPending()

    this.currentUserText = ""
    this.currentAssistantText = ""

    // propagateAttributes writes sessionId/userId onto the OTel context so the
    // span created inside the callback (and its children) inherit them. Setting
    // them via metadata.langfuseSessionId is the Langchain integration pattern
    // and does NOT populate the trace's session field in the @langfuse/tracing
    // direct SDK.
    this.activeTurnId = randomUUID()
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
            metadata: { turnId: this.activeTurnId },
          },
          { asType: "generation" },
        )
      },
    )
  }

  appendUserText(text: string) {
    if (!this.activeGeneration) return
    this.currentUserText += text
  }

  appendAssistantText(text: string) {
    if (!this.activeGeneration) return
    this.currentAssistantText += text
  }

  startToolCall(callId: string, name: string, args: string) {
    if (!isLangfuseEnabled() || !this.activeGeneration) return
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

  attachClientTiming(phase: string, ms: number, turnId?: string) {
    const target = this.resolveTarget(turnId)
    if (!target) return
    target.update({ metadata: { [`client.${phase}_ms`]: ms } })
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
    if (!this.activeGeneration) return
    // Tool spans may legitimately outlive the turn they started in — async tools
    // (e.g. ask_brain) often resolve on a later turn. Leave them open; endSession
    // will WARNING-close anything still dangling when the socket closes.
    this.activeGeneration.update({
      input: this.currentUserText || undefined,
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
