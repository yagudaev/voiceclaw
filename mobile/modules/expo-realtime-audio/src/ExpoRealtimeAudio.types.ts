export type AudioCapturedEvent = {
  data: string // base64 PCM16 24kHz mono
}

export type AudioErrorEvent = {
  message: string
}

export type RmsMetricsEvent = {
  rms: number
  playbackActive: boolean
  gated: boolean
  threshold: number
  route: string
}

export type AudioLogEvent = {
  message: string
}

export type ExpoRealtimeAudioModuleEvents = {
  onAudioCaptured: (event: AudioCapturedEvent) => void
  onAudioCapturedRaw: (event: AudioCapturedEvent) => void
  onError: (event: AudioErrorEvent) => void
  onLog: (event: AudioLogEvent) => void
  onRmsMetrics: (event: RmsMetricsEvent) => void
}
