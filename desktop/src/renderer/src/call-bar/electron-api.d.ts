// Ambient typings that describe the slice of preload the call-bar
// renderer needs. Kept local to avoid cross-cutting the main renderer's
// typings — the two surfaces happen to share the same preload but have
// very different usage patterns.

export {}

declare global {
  interface Window {
    electronAPI: Window['electronAPI'] & {
      tray: {
        setCallActive: (active: boolean) => Promise<void>
      }
      callBar: {
        sendAudioLevels: (input: number, output: number) => void
        onMuteToggleRequest: (handler: () => void) => () => void
        onEndCallRequest: (handler: () => void) => () => void
        ready: () => Promise<void>
        focusMain: () => Promise<void>
        openContextMenu: () => Promise<void>
        onVisibility: (handler: (visible: boolean) => void) => () => void
        onAudioLevels: (
          handler: (payload: { input: number; output: number }) => void,
        ) => () => void
      }
    }
  }
}
