import { NativeModule, requireNativeModule } from 'expo'

import { ExpoCustomPipelineModuleEvents, LatencyStats } from './ExpoCustomPipeline.types'

declare class ExpoCustomPipelineModule extends NativeModule<ExpoCustomPipelineModuleEvents> {
  setSTTProvider(name: string, apiKey?: string): void
  setTTSProvider(name: string): void
  startListening(): void
  stopListening(): void
  speak(text: string): void
  stopSpeaking(): void
  startConversation(apiUrl: string, apiKey: string, model: string): void
  stopConversation(): void
  getLatencyStats(): LatencyStats
}

export default requireNativeModule<ExpoCustomPipelineModule>('ExpoCustomPipeline')
