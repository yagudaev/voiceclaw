import { useCallback, useRef, useState } from 'react'

type Role = 'user' | 'assistant'

type PartialTranscript = {
  role: Role
  text: string
}

type TranscriptBufferActions = {
  /** Call when a speaker starts talking. Initializes/resets buffer for that role. */
  onSpeechStart: (role: Role) => void
  /** Call on each final transcript fragment. Appends to the buffer for that role. */
  onTranscriptFinal: (role: Role, text: string) => void
  /** Call when a speaker stops talking. Returns the accumulated text and clears the buffer. */
  onSpeechEnd: (role: Role) => string | null
  /** Flush all active buffers (e.g. when call ends mid-speech). Returns any pending text per role. */
  flushAll: () => Array<{ role: Role, text: string }>
  /** Current partial transcripts being accumulated (for real-time UI display). */
  partials: PartialTranscript[]
}

export function useTranscriptBuffer(): TranscriptBufferActions {
  const buffersRef = useRef<Map<Role, string>>(new Map())
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

  const onSpeechStart = useCallback((role: Role) => {
    buffersRef.current.set(role, '')
    syncPartials()
  }, [syncPartials])

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
  }, [syncPartials])

  const onSpeechEnd = useCallback((role: Role): string | null => {
    const text = buffersRef.current.get(role) ?? null
    buffersRef.current.delete(role)
    syncPartials()
    return text && text.trim().length > 0 ? text.trim() : null
  }, [syncPartials])

  const flushAll = useCallback((): Array<{ role: Role, text: string }> => {
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

  return { onSpeechStart, onTranscriptFinal, onSpeechEnd, flushAll, partials }
}
