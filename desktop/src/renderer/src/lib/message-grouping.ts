import type { Message } from './db'

export interface GroupMessagesOptions {
  burstThresholdMs?: number
  now?: number
}

export type GroupedItem =
  | { kind: 'separator', label: string, timestamp: number }
  | {
      kind: 'message'
      message: Message
      isFirstInBurst: boolean
      isLastInBurst: boolean
    }

export const DEFAULT_BURST_THRESHOLD_MS = 60_000
const DAY_MS = 24 * 60 * 60 * 1000

export function groupMessages(
  messages: Message[],
  options: GroupMessagesOptions = {},
): GroupedItem[] {
  const burstThreshold = options.burstThresholdMs ?? DEFAULT_BURST_THRESHOLD_MS
  const now = options.now ?? Date.now()

  if (messages.length === 0) return []

  const sorted = [...messages].sort((a, b) => a.created_at - b.created_at)
  const out: GroupedItem[] = []

  let burstStart = 0
  let lastSeparatorLabel: string | null = null
  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i]
    const prev = i > 0 ? sorted[i - 1] : null

    const sameDay = prev != null && isSameLocalDay(prev.created_at, msg.created_at)
    const sameBurst =
      prev != null &&
      sameDay &&
      prev.role === msg.role &&
      msg.created_at - prev.created_at < burstThreshold

    if (!sameBurst) {
      const label = !sameDay
        ? formatDaySeparator(msg.created_at, now)
        : formatBurstSeparator(msg.created_at, now)
      if (label !== lastSeparatorLabel) {
        out.push({ kind: 'separator', label, timestamp: msg.created_at })
        lastSeparatorLabel = label
      }
      burstStart = i
    }

    const next = i < sorted.length - 1 ? sorted[i + 1] : null
    const nextSameBurst =
      next != null &&
      isSameLocalDay(msg.created_at, next.created_at) &&
      next.role === msg.role &&
      next.created_at - msg.created_at < burstThreshold

    out.push({
      kind: 'message',
      message: msg,
      isFirstInBurst: i === burstStart,
      isLastInBurst: !nextSameBurst,
    })
  }

  return out
}

export function formatExactTimestamp(ts: number, now: number = Date.now()): string {
  const d = new Date(ts)
  const sameDay = isSameLocalDay(ts, now)
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  const diffDays = floorLocalDayDiff(now, ts)
  if (diffDays === 1) {
    return `Yesterday ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  if (diffDays < 7) {
    return `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSameLocalDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function floorLocalDayDiff(later: number, earlier: number): number {
  const a = startOfLocalDay(later)
  const b = startOfLocalDay(earlier)
  return Math.round((a - b) / DAY_MS)
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function formatDaySeparator(ts: number, now: number): string {
  const d = new Date(ts)
  const diffDays = floorLocalDayDiff(now, ts)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  if (diffDays <= 0) return `Today ${time}`
  if (diffDays === 1) return `Yesterday ${time}`
  if (diffDays < 7) {
    return `${d.toLocaleDateString(undefined, { weekday: 'long' })} ${time}`
  }
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return d.toLocaleDateString(undefined, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' })
    + ` ${time}`
}

function formatBurstSeparator(ts: number, now: number): string {
  const diffMs = now - ts
  if (diffMs < 60_000) return 'just now'
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMs / 3_600_000)
  if (diffHr < 6) return `${diffHr} hr ago`
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
