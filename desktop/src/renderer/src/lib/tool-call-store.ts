export type ToolCallStatus = 'in-progress' | 'success' | 'error' | 'cancelled'

export interface ToolCallEntry {
  callId: string
  name: string
  args: string
  status: ToolCallStatus
  startedAt: number
  durationMs?: number
  result?: string
  error?: string
  step?: string
}

export interface ToolCallProgressDelta {
  textDelta?: string
  step?: string
}

export function applyToolCallStarted(
  entries: ToolCallEntry[],
  callId: string,
  name: string,
  args: string,
): ToolCallEntry[] {
  if (entries.some((e) => e.callId === callId)) return entries
  return [
    ...entries,
    { callId, name, args, status: 'in-progress', startedAt: Date.now() },
  ]
}

export function applyToolCallProgress(
  entries: ToolCallEntry[],
  callId: string,
  delta: ToolCallProgressDelta,
): ToolCallEntry[] {
  if (!entries.some((e) => e.callId === callId)) return entries
  return entries.map((e) => {
    if (e.callId !== callId) return e
    const next: ToolCallEntry = { ...e }
    if (delta.textDelta) {
      next.result = (e.result ?? '') + delta.textDelta
    }
    if (delta.step !== undefined) {
      next.step = delta.step
    }
    return next
  })
}

export function applyToolCallCompleted(
  entries: ToolCallEntry[],
  callId: string,
  durationMs: number,
  result: string,
): ToolCallEntry[] {
  return entries.map((e) => {
    if (e.callId !== callId) return e
    const finalResult = pickFinalResult(e.result, result)
    return { ...e, status: 'success', durationMs, result: finalResult, step: undefined }
  })
}

export function applyToolCallFailed(
  entries: ToolCallEntry[],
  callId: string,
  durationMs: number,
  error: string,
  cancelled: boolean,
): ToolCallEntry[] {
  return entries.map((e) =>
    e.callId === callId
      ? { ...e, status: cancelled ? 'cancelled' : 'error', durationMs, error, step: undefined }
      : e,
  )
}

export function applyToolCallCancelled(
  entries: ToolCallEntry[],
  callIds: string[],
): ToolCallEntry[] {
  return entries.map((e) =>
    callIds.includes(e.callId) && e.status === 'in-progress'
      ? { ...e, status: 'cancelled', durationMs: Date.now() - e.startedAt, step: undefined }
      : e,
  )
}

function pickFinalResult(streamed: string | undefined, completion: string): string {
  if (!completion) return streamed ?? completion
  if (streamed === undefined) return completion
  if (streamed.trim() === completion.trim()) return streamed
  return completion
}
