// Sounds temporarily disabled to debug microphone/audio session conflict with Daily.co
// TODO: Re-enable with expo-audio once the audio session conflict is resolved

export function useCallSounds() {
  return {
    playJoin: () => {},
    playEnd: () => {},
    startThinking: () => {},
    stopThinking: () => {},
  }
}
