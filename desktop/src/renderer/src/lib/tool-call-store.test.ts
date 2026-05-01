import { describe, expect, it } from 'vitest'
import {
  applyToolCallCancelled,
  applyToolCallCompleted,
  applyToolCallFailed,
  applyToolCallProgress,
  applyToolCallStarted,
  type ToolCallEntry,
} from './tool-call-store'

const baseEntry = (overrides: Partial<ToolCallEntry> = {}): ToolCallEntry => ({
  callId: 'call-1',
  name: 'ask_brain',
  args: '{"query":"hi"}',
  status: 'in-progress',
  startedAt: 1_000_000,
  ...overrides,
})

describe('applyToolCallStarted', () => {
  it('appends a new in-progress entry', () => {
    const next = applyToolCallStarted([], 'call-1', 'ask_brain', '{"q":1}')
    expect(next).toHaveLength(1)
    expect(next[0].status).toBe('in-progress')
    expect(next[0].callId).toBe('call-1')
    expect(next[0].name).toBe('ask_brain')
  })

  it('is idempotent for the same callId', () => {
    const start = applyToolCallStarted([], 'call-1', 'ask_brain', '{}')
    const again = applyToolCallStarted(start, 'call-1', 'ask_brain', '{}')
    expect(again).toBe(start)
  })
})

describe('applyToolCallProgress', () => {
  it('appends textDelta to an empty result', () => {
    const entries: ToolCallEntry[] = [baseEntry()]
    const next = applyToolCallProgress(entries, 'call-1', { textDelta: 'Hello' })
    expect(next[0].result).toBe('Hello')
    expect(next[0].status).toBe('in-progress')
  })

  it('appends successive textDeltas to existing result', () => {
    let entries: ToolCallEntry[] = [baseEntry()]
    entries = applyToolCallProgress(entries, 'call-1', { textDelta: 'Hello, ' })
    entries = applyToolCallProgress(entries, 'call-1', { textDelta: 'world' })
    expect(entries[0].result).toBe('Hello, world')
  })

  it('sets step caption without touching result', () => {
    const entries: ToolCallEntry[] = [baseEntry({ result: 'partial' })]
    const next = applyToolCallProgress(entries, 'call-1', { step: 'Searching documents' })
    expect(next[0].step).toBe('Searching documents')
    expect(next[0].result).toBe('partial')
  })

  it('updates step and appends text together', () => {
    const entries: ToolCallEntry[] = [baseEntry()]
    const next = applyToolCallProgress(entries, 'call-1', {
      step: 'Reading file',
      textDelta: 'Opening README.md',
    })
    expect(next[0].step).toBe('Reading file')
    expect(next[0].result).toBe('Opening README.md')
  })

  it('is a no-op when callId is not present', () => {
    const entries: ToolCallEntry[] = [baseEntry()]
    const next = applyToolCallProgress(entries, 'unknown-id', { textDelta: 'x' })
    expect(next).toBe(entries)
  })

  it('ignores empty textDelta without clobbering existing result', () => {
    const entries: ToolCallEntry[] = [baseEntry({ result: 'kept' })]
    const next = applyToolCallProgress(entries, 'call-1', { textDelta: '' })
    expect(next[0].result).toBe('kept')
  })

  it('preserves other entries', () => {
    const entries: ToolCallEntry[] = [
      baseEntry({ callId: 'call-1', result: 'a' }),
      baseEntry({ callId: 'call-2', result: 'b' }),
    ]
    const next = applyToolCallProgress(entries, 'call-1', { textDelta: 'c' })
    expect(next[0].result).toBe('ac')
    expect(next[1].result).toBe('b')
  })
})

describe('applyToolCallCompleted', () => {
  it('marks the entry success and records duration', () => {
    const entries: ToolCallEntry[] = [baseEntry()]
    const next = applyToolCallCompleted(entries, 'call-1', 1234, 'final')
    expect(next[0].status).toBe('success')
    expect(next[0].durationMs).toBe(1234)
    expect(next[0].result).toBe('final')
  })

  it('keeps streamed text when completion result matches what we already have', () => {
    const streamed = 'streamed-by-deltas'
    const entries: ToolCallEntry[] = [baseEntry({ result: streamed })]
    const next = applyToolCallCompleted(entries, 'call-1', 50, streamed)
    expect(next[0].result).toBe(streamed)
  })

  it('keeps streamed text when completion only differs by trailing whitespace', () => {
    const streamed = 'streamed-text'
    const entries: ToolCallEntry[] = [baseEntry({ result: streamed })]
    const next = applyToolCallCompleted(entries, 'call-1', 50, `${streamed}\n`)
    expect(next[0].result).toBe(streamed)
  })

  it('keeps streamed text when completion result is empty', () => {
    const streamed = 'streamed-only'
    const entries: ToolCallEntry[] = [baseEntry({ result: streamed })]
    const next = applyToolCallCompleted(entries, 'call-1', 50, '')
    expect(next[0].result).toBe(streamed)
  })

  it('overrides streamed text when completion result is different and non-empty', () => {
    const entries: ToolCallEntry[] = [baseEntry({ result: 'partial' })]
    const next = applyToolCallCompleted(entries, 'call-1', 50, 'final-canonical')
    expect(next[0].result).toBe('final-canonical')
  })

  it('clears the step caption', () => {
    const entries: ToolCallEntry[] = [baseEntry({ step: 'Searching documents' })]
    const next = applyToolCallCompleted(entries, 'call-1', 10, 'done')
    expect(next[0].step).toBeUndefined()
  })
})

describe('applyToolCallFailed', () => {
  it('records error status and clears step', () => {
    const entries: ToolCallEntry[] = [baseEntry({ step: 'Reading file' })]
    const next = applyToolCallFailed(entries, 'call-1', 9, 'boom', false)
    expect(next[0].status).toBe('error')
    expect(next[0].error).toBe('boom')
    expect(next[0].step).toBeUndefined()
  })

  it('marks cancelled when cancelled=true', () => {
    const entries: ToolCallEntry[] = [baseEntry()]
    const next = applyToolCallFailed(entries, 'call-1', 9, 'aborted', true)
    expect(next[0].status).toBe('cancelled')
  })
})

describe('applyToolCallCancelled', () => {
  it('cancels in-progress entries and clears step', () => {
    const entries: ToolCallEntry[] = [baseEntry({ step: 'Searching documents' })]
    const next = applyToolCallCancelled(entries, ['call-1'])
    expect(next[0].status).toBe('cancelled')
    expect(next[0].step).toBeUndefined()
  })

  it('leaves completed entries alone', () => {
    const entries: ToolCallEntry[] = [
      baseEntry({ status: 'success', durationMs: 12, result: 'r' }),
    ]
    const next = applyToolCallCancelled(entries, ['call-1'])
    expect(next[0].status).toBe('success')
  })
})
