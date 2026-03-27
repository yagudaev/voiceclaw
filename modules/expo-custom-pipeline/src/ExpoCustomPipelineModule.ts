import { NativeModule, requireNativeModule } from 'expo'

import { ExpoCustomPipelineModuleEvents } from './ExpoCustomPipeline.types'

declare class ExpoCustomPipelineModule extends NativeModule<ExpoCustomPipelineModuleEvents> {
  setSTTProvider(name: string, config?: Record<string, string>): void
  setTTSProvider(name: string, config?: Record<string, string>): void
  startListening(): void
  stopListening(): void
  speak(text: string): void
  stopSpeaking(): void
}

export default requireNativeModule<ExpoCustomPipelineModule>('ExpoCustomPipeline')
