import { useCallback, useRef, useState } from 'react'

export type ReconnectState =
  | { status: 'idle' }
  | { status: 'reconnecting', attempt: number, maxAttempts: number }
  | { status: 'failed' }

type ReconnectConfig = {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  onReconnect: () => Promise<void>
}

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_INITIAL_DELAY_MS = 1000
const DEFAULT_MAX_DELAY_MS = 30000

export function useAutoReconnect(config: ReconnectConfig) {
  const [state, setState] = useState<ReconnectState>({ status: 'idle' })
  const attemptRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)
  const onReconnectRef = useRef(config.onReconnect)
  onReconnectRef.current = config.onReconnect

  const maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const initialDelay = config.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS
  const maxDelay = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS

  const cancel = useCallback(() => {
    cancelledRef.current = true
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    attemptRef.current = 0
    setState({ status: 'idle' })
  }, [])

  const scheduleAttempt = useCallback(() => {
    const attempt = attemptRef.current + 1
    attemptRef.current = attempt

    if (attempt > maxAttempts) {
      setState({ status: 'failed' })
      return
    }

    const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay)
    setState({ status: 'reconnecting', attempt, maxAttempts })

    console.log(`[AutoReconnect] Attempt ${attempt}/${maxAttempts} in ${delay}ms`)

    timerRef.current = setTimeout(async () => {
      if (cancelledRef.current) return

      try {
        await onReconnectRef.current()
        // If startCall succeeds, the onCallStart event will fire and
        // the caller should call cancel() to reset state
      } catch (e) {
        console.warn(`[AutoReconnect] Attempt ${attempt} failed:`, e)
        if (!cancelledRef.current) {
          scheduleAttempt()
        }
      }
    }, delay)
  }, [maxAttempts, initialDelay, maxDelay])

  const trigger = useCallback(() => {
    cancelledRef.current = false
    attemptRef.current = 0
    scheduleAttempt()
  }, [scheduleAttempt])

  const retry = useCallback(() => {
    cancelledRef.current = false
    attemptRef.current = 0
    scheduleAttempt()
  }, [scheduleAttempt])

  return { state, trigger, cancel, retry }
}
