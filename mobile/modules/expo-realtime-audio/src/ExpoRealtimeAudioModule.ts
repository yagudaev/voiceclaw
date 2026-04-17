import { NativeModule, requireNativeModule } from 'expo'

import { ExpoRealtimeAudioModuleEvents } from './ExpoRealtimeAudio.types'

declare class ExpoRealtimeAudioModule extends NativeModule<ExpoRealtimeAudioModuleEvents> {
  /** Start capturing microphone audio — emits onAudioCaptured events with base64 PCM16 chunks */
  startCapture(): void

  /** Stop capturing microphone audio */
  stopCapture(): void

  /** Play a base64-encoded PCM16 24kHz mono audio chunk through the speaker */
  playAudio(data: string): void

  /** Stop any audio currently playing (barge-in) */
  stopPlayback(): void

  /** Set speaker output volume (0.0 = silent, 1.0 = normal, >1.0 = boosted) */
  setVolume(volume: number): void

  /** Enable or disable the client-side echo gate */
  setEchoGateEnabled(enabled: boolean): void

  /** Set the RMS threshold for the echo gate (0.0–1.0) */
  setEchoGateThreshold(threshold: number): void

  /** Enable or disable RMS debug metrics emission (~10Hz onRmsMetrics events) */
  setDebugMetricsEnabled(enabled: boolean): void
}

export default requireNativeModule<ExpoRealtimeAudioModule>('ExpoRealtimeAudio')
