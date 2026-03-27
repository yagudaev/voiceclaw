import { useCallback, useEffect, useRef, useState } from 'react'

type Role = 'user' | 'assistant'

type PartialTranscript = {
  role: Role
  text: string
}

/** Delay (ms) after onSpeechEnd before we flush -- gives late final transcripts time to arrive */
const FLUSH_DELAY_MS = 300

type TranscriptBufferActions = {
  /** Call when a speaker starts talking. Initializes/resets buffer for that role. */
  onSpeechStart: (role: Role) => void
  /** Call on each final transcript fragment. Appends to the buffer for that role. */
  onTranscriptFinal: (role: Role, text: string) => void
  /**
   * Call when a speaker stops talking. Marks the buffer as pending flush.
   * The actual flush happens after a short delay to capture any late-arriving
   * final transcripts. The flushed text is delivered via the onFlush callback.
   */
  onSpeechEnd: (role: Role) => void
  /** Flush all active buffers (e.g. when call ends mid-speech). Returns any pending text per role. */
  flushAll: () => Array<{ role: Role, text: string }>
  /** Current partial transcripts being accumulated (for real-time UI display). */
  partials: PartialTranscript[]
}

type UseTranscriptBufferOptions = {
  /** Called when a speech turn is finalized with the accumulated transcript text. */
  onFlush: (role: Role, text: string) => void | Promise<void>
}

export function useTranscriptBuffer(options: UseTranscriptBufferOptions): TranscriptBufferActions {
  const buffersRef = useRef<Map<Role, string>>(new Map())
  const pendingFlushRef = useRef<Map<Role, ReturnType<typeof setTimeout>>>(new Map())
  const onFlushRef = useRef(options.onFlush)
  onFlushRef.current = options.onFlush
  const [partials, setPartials] = useState<PartialTranscript[]>([])

  const syncPartials = useCallback(() => {
    const next: PartialTranscript[] = []
    for (const [role, text] of buffersRef.current.entries()) {
      if (text.length > 0) {
        next.push({ role, text })
      }
    }
    setPartials(next)
  }, [])

  const flushRole = useCallback((role: Role) => {
    const timer = pendingFlushRef.current.get(role)
    if (timer) {
      clearTimeout(timer)
      pendingFlushRef.current.delete(role)
    }
    const text = buffersRef.current.get(role) ?? null
    buffersRef.current.delete(role)
    syncPartials()
    if (text && text.trim().length > 0) {
      try {
        const result = onFlushRef.current(role, text.trim())
        if (result && typeof result.catch === 'function') {
          result.catch((err: unknown) => {
            console.warn('[TranscriptBuffer] onFlush error:', err)
          })
        }
      } catch (err) {
        console.warn('[TranscriptBuffer] onFlush error:', err)
      }
    }
  }, [syncPartials])

  const onSpeechStart = useCallback((role: Role) => {
    // If there is a pending flush for this role, flush it immediately before
    // starting a new buffer -- a new speech turn has begun.
    if (pendingFlushRef.current.has(role)) {
      flushRole(role)
    }
    buffersRef.current.set(role, '')
    syncPartials()
  }, [syncPartials, flushRole])

  const onTranscriptFinal = useCallback((role: Role, text: string) => {
    const existing = buffersRef.current.get(role)
    if (existing === undefined) {
      // Speech start may not have fired yet -- initialize buffer
      buffersRef.current.set(role, text)
    } else {
      const separator = existing.length > 0 ? ' ' : ''
      buffersRef.current.set(role, existing + separator + text)
    }
    syncPartials()

    // If this role is pending flush, a late transcript just arrived.
    // Reset the timer so we wait a bit more for any additional fragments.
    if (pendingFlushRef.current.has(role)) {
      clearTimeout(pendingFlushRef.current.get(role))
      pendingFlushRef.current.set(role, setTimeout(() => flushRole(role), FLUSH_DELAY_MS))
    }
  }, [syncPartials, flushRole])

  const onSpeechEnd = useCallback((role: Role) => {
    // Don't flush immediately -- wait for any late-arriving final transcripts
    const existingTimer = pendingFlushRef.current.get(role)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    pendingFlushRef.current.set(role, setTimeout(() => flushRole(role), FLUSH_DELAY_MS))
  }, [flushRole])

  const flushAll = useCallback((): Array<{ role: Role, text: string }> => {
    // Clear all pending flush timers
    for (const timer of pendingFlushRef.current.values()) {
      clearTimeout(timer)
    }
    pendingFlushRef.current.clear()

    const results: Array<{ role: Role, text: string }> = []
    for (const [role, text] of buffersRef.current.entries()) {
      const trimmed = text.trim()
      if (trimmed.length > 0) {
        results.push({ role, text: trimmed })
      }
    }
    buffersRef.current.clear()
    syncPartials()
    return results
  }, [syncPartials])

  // Clean up pending timers on unmount to prevent calling onFlush after unmount
  useEffect(() => {
    return () => {
      for (const timer of pendingFlushRef.current.values()) {
        clearTimeout(timer)
      }
      pendingFlushRef.current.clear()
    }
  }, [])

  return { onSpeechStart, onTranscriptFinal, onSpeechEnd, flushAll, partials }
}
