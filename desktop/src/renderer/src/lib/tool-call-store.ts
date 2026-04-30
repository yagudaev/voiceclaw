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

export function applyToolCallCompleted(
  entries: ToolCallEntry[],
  callId: string,
  durationMs: number,
  result: string,
): ToolCallEntry[] {
  return entries.map((e) =>
    e.callId === callId ? { ...e, status: 'success', durationMs, result } : e,
  )
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
      ? { ...e, status: cancelled ? 'cancelled' : 'error', durationMs, error }
      : e,
  )
}

export function applyToolCallCancelled(
  entries: ToolCallEntry[],
  callIds: string[],
): ToolCallEntry[] {
  return entries.map((e) =>
    callIds.includes(e.callId) && e.status === 'in-progress'
      ? { ...e, status: 'cancelled', durationMs: Date.now() - e.startedAt }
      : e,
  )
}
