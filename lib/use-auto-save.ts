import { setSetting } from '@/db'
import { useCallback, useEffect, useRef, useState } from 'react'

type SaveStatus = 'idle' | 'saving' | 'saved'

/**
 * Hook that provides auto-save behavior for settings.
 * - Immediate saves for toggles/dropdowns via `saveImmediate`
 * - Debounced saves for text inputs via `saveDebounced`
 * - Tracks save status for showing a brief "Saved" indicator
 */
export function useAutoSave(debounceMs = 500) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timerRefs.current.values()) {
        clearTimeout(timer)
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
      }
    }
  }, [])

  const showSavedIndicator = useCallback(() => {
    setSaveStatus('saved')
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current)
    }
    fadeTimerRef.current = setTimeout(() => {
      setSaveStatus('idle')
      fadeTimerRef.current = null
    }, 1500)
  }, [])

  const persistSetting = useCallback(async (key: string, value: string) => {
    setSaveStatus('saving')
    try {
      await setSetting(key, value)
      showSavedIndicator()
    } catch (err) {
      console.warn('[useAutoSave] Failed to save setting:', key, err)
      setSaveStatus('idle')
    }
  }, [showSavedIndicator])

  /** Save immediately - use for toggles, dropdowns, segmented controls */
  const saveImmediate = useCallback((key: string, value: string) => {
    // Cancel any pending debounced save for this key
    const existing = timerRefs.current.get(key)
    if (existing) {
      clearTimeout(existing)
      timerRefs.current.delete(key)
    }
    persistSetting(key, value)
  }, [persistSetting])

  /** Save with debounce - use for text inputs */
  const saveDebounced = useCallback((key: string, value: string) => {
    const existing = timerRefs.current.get(key)
    if (existing) {
      clearTimeout(existing)
    }
    timerRefs.current.set(key, setTimeout(() => {
      timerRefs.current.delete(key)
      persistSetting(key, value)
    }, debounceMs))
  }, [debounceMs, persistSetting])

  return { saveStatus, saveImmediate, saveDebounced }
}

export type { SaveStatus }
