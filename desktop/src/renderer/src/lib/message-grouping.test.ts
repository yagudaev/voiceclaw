import { describe, expect, it } from 'vitest'
import { groupMessages, formatExactTimestamp } from './message-grouping'
import type { Message } from './db'

const BASE = new Date('2026-04-30T12:00:00').getTime()

describe('groupMessages', () => {
  it('returns empty for an empty list', () => {
    expect(groupMessages([], { now: BASE })).toEqual([])
  })

  it('emits a separator + single message for a list of one', () => {
    const out = groupMessages([msg(1, 'user', 0)], { now: BASE })
    expect(out).toHaveLength(2)
    expect(out[0].kind).toBe('separator')
    expect(out[1]).toMatchObject({
      kind: 'message',
      isFirstInBurst: true,
      isLastInBurst: true,
    })
  })

  it('groups two same-role messages 30s apart in one burst', () => {
    const out = groupMessages(
      [msg(1, 'user', 0), msg(2, 'user', 30_000)],
      { now: BASE + 60_000 },
    )
    const messages = out.filter((i) => i.kind === 'message')
    const separators = out.filter((i) => i.kind === 'separator')
    expect(separators).toHaveLength(1)
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ isFirstInBurst: true, isLastInBurst: false })
    expect(messages[1]).toMatchObject({ isFirstInBurst: false, isLastInBurst: true })
  })

  it('splits two same-role messages 90s apart into two bursts', () => {
    const out = groupMessages(
      [msg(1, 'user', 0), msg(2, 'user', 90_000)],
      { now: BASE + 120_000 },
    )
    expect(out.filter((i) => i.kind === 'separator')).toHaveLength(2)
    const messages = out.filter((i) => i.kind === 'message')
    expect(messages[0]).toMatchObject({ isFirstInBurst: true, isLastInBurst: true })
    expect(messages[1]).toMatchObject({ isFirstInBurst: true, isLastInBurst: true })
  })

  it('inserts a day separator across day boundaries', () => {
    const day1 = new Date('2026-04-29T20:00:00').getTime()
    const day2 = new Date('2026-04-30T08:00:00').getTime()
    const m1: Message = { ...msg(1, 'user', 0), created_at: day1 }
    const m2: Message = { ...msg(2, 'user', 0), created_at: day2 }

    const out = groupMessages([m1, m2], { now: day2 + 10_000 })
    const seps = out.filter((i) => i.kind === 'separator') as Extract<typeof out[number], { kind: 'separator' }>[]
    expect(seps).toHaveLength(2)
    expect(seps[0].label).toMatch(/Yesterday/)
    expect(seps[1].label).toMatch(/Today/)
  })

  it('breaks a burst on role transition even within the threshold', () => {
    const out = groupMessages(
      [msg(1, 'user', 0), msg(2, 'assistant', 5_000)],
      { now: BASE + 10_000 },
    )
    const messages = out.filter((i) => i.kind === 'message')
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ isFirstInBurst: true, isLastInBurst: true })
    expect(messages[1]).toMatchObject({ isFirstInBurst: true, isLastInBurst: true })
  })

  it('dedupes consecutive role-transition separators that share a label', () => {
    const out = groupMessages(
      [
        msg(1, 'user', 0),
        msg(2, 'assistant', 5_000),
        msg(3, 'user', 10_000),
        msg(4, 'assistant', 15_000),
      ],
      { now: BASE + 20_000 },
    )
    const seps = out.filter((i) => i.kind === 'separator') as Extract<
      typeof out[number],
      { kind: 'separator' }
    >[]
    expect(seps).toHaveLength(2)
    expect(seps[1].label).toBe('just now')
    const messages = out.filter((i) => i.kind === 'message')
    expect(messages).toHaveLength(4)
    for (const m of messages) {
      expect(m).toMatchObject({ isFirstInBurst: true, isLastInBurst: true })
    }
  })

  it('uses configurable burst threshold', () => {
    const out = groupMessages(
      [msg(1, 'user', 0), msg(2, 'user', 90_000)],
      { now: BASE + 120_000, burstThresholdMs: 120_000 },
    )
    expect(out.filter((i) => i.kind === 'separator')).toHaveLength(1)
    const messages = out.filter((i) => i.kind === 'message')
    expect(messages[0]).toMatchObject({ isFirstInBurst: true, isLastInBurst: false })
    expect(messages[1]).toMatchObject({ isFirstInBurst: false, isLastInBurst: true })
  })
})

describe('formatExactTimestamp', () => {
  it('formats same-day as time only', () => {
    const out = formatExactTimestamp(BASE, BASE + 5_000)
    expect(out).not.toMatch(/Yesterday/)
    expect(out).toMatch(/\d/)
  })

  it('formats yesterday with the Yesterday prefix', () => {
    const yesterday = new Date('2026-04-29T20:00:00').getTime()
    const today = new Date('2026-04-30T10:00:00').getTime()
    expect(formatExactTimestamp(yesterday, today)).toMatch(/Yesterday/)
  })
})

// --- Helpers ---

function msg(id: number, role: 'user' | 'assistant', offsetMs: number, content = 'hi'): Message {
  return {
    id,
    conversation_id: 1,
    role,
    content,
    created_at: BASE + offsetMs,
    stt_latency_ms: null,
    llm_latency_ms: null,
    tts_latency_ms: null,
    stt_provider: null,
    llm_provider: null,
    tts_provider: null,
  }
}
