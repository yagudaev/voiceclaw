import { NativeModule, requireNativeModule } from 'expo'

import { ExpoVapiModuleEvents, CallResult } from './ExpoVapi.types'

declare class ExpoVapiModule extends NativeModule<ExpoVapiModuleEvents> {
  initialize(publicKey: string): Promise<void>
  startCall(assistantId: string, overrides?: Record<string, unknown>): Promise<CallResult>
  stopCall(): Promise<void>
  setMuted(muted: boolean): Promise<void>
  isCallActive(): boolean
  isMuted(): boolean
  sendMessage(content: string): Promise<void>
  sendFunctionCallResult(name: string, result: string): Promise<void>
}

export default requireNativeModule<ExpoVapiModule>('ExpoVapi')
