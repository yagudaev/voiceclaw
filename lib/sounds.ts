import ExpoVapiModule from '@/modules/expo-vapi'
import { useCallback, useRef } from 'react'

export function useCallSounds() {
  const thinkingActive = useRef(false)

  const playJoin = useCallback(() => {
    ExpoVapiModule.playSound('call-join', 0.4)
  }, [])

  const playEnd = useCallback(() => {
    ExpoVapiModule.playSound('call-end', 0.3)
  }, [])

  const startThinking = useCallback(() => {
    if (thinkingActive.current) return
    thinkingActive.current = true
    // TODO: looping thinking sound — for now just play once
    ExpoVapiModule.playSound('thinking', 0.15)
  }, [])

  const stopThinking = useCallback(() => {
    if (!thinkingActive.current) return
    thinkingActive.current = false
    ExpoVapiModule.stopSound()
  }, [])

  return { playJoin, playEnd, startThinking, stopThinking }
}
