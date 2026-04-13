export type AudioCapturedEvent = {
  data: string // base64 PCM16 24kHz mono
}

export type AudioErrorEvent = {
  message: string
}

export type ExpoRealtimeAudioModuleEvents = {
  onAudioCaptured: (event: AudioCapturedEvent) => void
  onError: (event: AudioErrorEvent) => void
}
