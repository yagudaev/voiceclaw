import { useAudioPlayer } from 'expo-audio'
import { useCallback, useEffect, useRef } from 'react'

const joinSound = require('@/assets/sounds/call-join.wav')
const endSound = require('@/assets/sounds/call-end.wav')
const thinkingSound = require('@/assets/sounds/thinking.wav')

export function useCallSounds() {
  const joinPlayer = useAudioPlayer(joinSound)
  const endPlayer = useAudioPlayer(endSound)
  const thinkingPlayer = useAudioPlayer(thinkingSound)
  const thinkingActive = useRef(false)

  useEffect(() => {
    joinPlayer.volume = 0.4
    endPlayer.volume = 0.3
    thinkingPlayer.volume = 0.15
    thinkingPlayer.loop = true
  }, [joinPlayer, endPlayer, thinkingPlayer])

  const playJoin = useCallback(() => {
    joinPlayer.seekTo(0)
    joinPlayer.play()
  }, [joinPlayer])

  const playEnd = useCallback(() => {
    endPlayer.seekTo(0)
    endPlayer.play()
  }, [endPlayer])

  const startThinking = useCallback(() => {
    if (thinkingActive.current) return
    thinkingActive.current = true
    thinkingPlayer.seekTo(0)
    thinkingPlayer.play()
  }, [thinkingPlayer])

  const stopThinking = useCallback(() => {
    if (!thinkingActive.current) return
    thinkingActive.current = false
    thinkingPlayer.pause()
  }, [thinkingPlayer])

  return { playJoin, playEnd, startThinking, stopThinking }
}
