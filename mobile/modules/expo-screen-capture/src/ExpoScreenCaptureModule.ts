import { NativeModule, requireNativeModule } from 'expo'

import { ExpoScreenCaptureModuleEvents } from './ExpoScreenCapture.types'

declare class ExpoScreenCaptureModule extends NativeModule<ExpoScreenCaptureModuleEvents> {
  /** true if ReplayKit is available on this device */
  isAvailable(): boolean

  /** Start in-app screen capture via RPScreenRecorder. Emits onFrame at ~1 FPS as base64 JPEG. */
  startInAppCapture(): Promise<void>

  /** Stop in-app screen capture. */
  stopInAppCapture(): Promise<void>

  /** Present the system broadcast picker (RPSystemBroadcastPickerView) so the user can start the broadcast extension. */
  presentBroadcastPicker(): void

  /** Start the polling bridge that reads frames written to the shared App Group by the broadcast extension. */
  startBroadcastBridge(): void

  /** Stop the broadcast bridge. */
  stopBroadcastBridge(): void

  /** Returns true when the broadcast extension is currently running (based on heartbeat in shared container). */
  isBroadcasting(): boolean
}

export default requireNativeModule<ExpoScreenCaptureModule>('ExpoScreenCapture')
