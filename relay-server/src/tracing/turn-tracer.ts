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

import { startObservation, type LangfuseGeneration, type LangfuseTool } from "@langfuse/tracing"
import { isLangfuseEnabled } from "./langfuse.js"

export class TurnTracer {
  private sessionId: string | null = null
  private userId: string | null = null
  private model: string | null = null

  private activeGeneration: LangfuseGeneration | null = null
  private activeToolSpans = new Map<string, LangfuseTool>()

  private currentUserText = ""
  private currentAssistantText = ""

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

    this.activeGeneration = startObservation(
      "voice-turn",
      {
        model: this.model ?? undefined,
        metadata: {
          langfuseSessionId: this.sessionId,
          langfuseUserId: this.userId,
        },
      },
      { asType: "generation" },
    )
  }

  appendUserText(text: string) {
    this.currentUserText += text
  }

  appendAssistantText(text: string) {
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

  attachClientTiming(phase: string, ms: number) {
    if (!this.activeGeneration) return
    this.activeGeneration.update({
      metadata: { [`client.${phase}_ms`]: ms },
    })
  }

  endTurn(errorMessage?: string) {
    if (!this.activeGeneration) return
    // Any dangling tool spans mean we lost the result — mark them and close.
    for (const [callId, span] of this.activeToolSpans) {
      span.update({ level: "WARNING", statusMessage: "tool span closed without result" })
      span.end()
      this.activeToolSpans.delete(callId)
    }
    this.activeGeneration.update({
      input: this.currentUserText || undefined,
      output: this.currentAssistantText || undefined,
      ...(errorMessage ? { level: "ERROR" as const, statusMessage: errorMessage } : {}),
    })
    this.activeGeneration.end()
    this.activeGeneration = null
  }

  endSession() {
    this.endTurn()
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}
