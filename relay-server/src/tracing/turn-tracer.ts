// Per-session Langfuse tracer. One instance per RelaySession.
//
// Maps the relay event stream to Langfuse observations:
//   turn.started      → open a generation span for this turn
//   transcript.delta  → accumulate input/output on the active generation
//   turn.ended        → close the generation
//   tool.call / result → nested tool spans
//   client.timing     → attrs on the active generation
//
// All methods no-op when Langfuse is not initialized, so callers don't
// need to guard every site.

import { randomUUID } from "node:crypto"
import { propagateAttributes, startObservation, type LangfuseGeneration, type LangfuseTool } from "@langfuse/tracing"
import { isLangfuseEnabled } from "./langfuse.js"

export class TurnTracer {
  private sessionId: string | null = null
  private userId: string | null = null
  private model: string | null = null

  private activeGeneration: LangfuseGeneration | null = null
  private activeTurnId: string | null = null
  private activeToolSpans = new Map<string, LangfuseTool>()

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
    if (!this.activeGeneration) return
    // Drop timings for a stale turn rather than attributing them to the wrong
    // generation. Missing turnId means legacy client — best-effort attach.
    if (turnId && turnId !== this.activeTurnId) return
    this.activeGeneration.update({
      metadata: { [`client.${phase}_ms`]: ms },
    })
  }

  attachUsage(usage: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    inputAudioTokens?: number
    outputAudioTokens?: number
  }) {
    if (!this.activeGeneration) return
    const usageDetails: Record<string, number> = {}
    if (usage.promptTokens != null) usageDetails.input = usage.promptTokens
    if (usage.completionTokens != null) usageDetails.output = usage.completionTokens
    if (usage.totalTokens != null) usageDetails.total = usage.totalTokens
    if (usage.inputAudioTokens != null) usageDetails.input_audio = usage.inputAudioTokens
    if (usage.outputAudioTokens != null) usageDetails.output_audio = usage.outputAudioTokens
    this.activeGeneration.update({ usageDetails })
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
    this.activeGeneration.end()
    this.activeGeneration = null
    this.activeTurnId = null
  }

  endSession() {
    this.endTurn()
    for (const [callId, span] of this.activeToolSpans) {
      span.update({ level: "WARNING", statusMessage: "tool span closed without result" })
      span.end()
      this.activeToolSpans.delete(callId)
    }
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}
