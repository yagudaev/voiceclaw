export type ScreenFrameEvent = {
  data: string // base64 JPEG (no data: prefix)
  width: number
  height: number
}

export type ScreenCaptureErrorEvent = {
  message: string
  code?: string
}

export type ScreenCaptureStateEvent = {
  state: 'idle' | 'starting' | 'active' | 'stopping'
  source: 'in-app' | 'broadcast' | 'none'
}

export type ExpoScreenCaptureModuleEvents = {
  onFrame: (event: ScreenFrameEvent) => void
  onError: (event: ScreenCaptureErrorEvent) => void
  onStateChange: (event: ScreenCaptureStateEvent) => void
}
