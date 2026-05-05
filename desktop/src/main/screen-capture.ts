import { ipcMain, desktopCapturer, systemPreferences, shell, session } from 'electron'
import { openWindows } from 'get-windows'

export type ScreenSourceIPC = {
  id: string
  name: string
  thumbnailDataURL: string | null
  appIconDataURL: string | null
}

export type WindowBoundsIPC = {
  x: number
  y: number
  width: number
  height: number
}

type SenderPredicate = (sender: Electron.WebContents) => boolean

export function registerScreenCaptureHandlers(
  isTrustedSender: SenderPredicate = () => true,
) {
  ipcMain.handle('screen:getSources', async (): Promise<ScreenSourceIPC[]> => {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen')
      if (status !== 'granted') {
        shell.openExternal(
          'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
        )
        throw new Error(
          `Screen Recording permission is ${status}. Grant it in System Settings → Privacy & Security → Screen Recording, then restart the app.`
        )
      }
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 640, height: 480 },
      fetchWindowIcons: true,
    })

    const screens = sources
      .filter((s) => s.id.startsWith('screen:'))
      .sort((a, b) => a.id.localeCompare(b.id))
    const windows = sources
      .filter((s) => s.id.startsWith('window:'))
      .sort((a, b) => {
        const byName = a.name.localeCompare(b.name)
        return byName !== 0 ? byName : a.id.localeCompare(b.id)
      })

    return [...screens, ...windows].map((s) => ({
      id: s.id,
      name: s.name,
      thumbnailDataURL: s.thumbnail.isEmpty() ? null : s.thumbnail.toDataURL(),
      appIconDataURL:
        s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : null,
    }))
  })

  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen', 'window'] })
        .then((sources) => callback({ video: sources[0] }))
        .catch(() => callback({}))
    },
    { useSystemPicker: false }
  )

  ipcMain.handle(
    'screen:getWindowBounds',
    async (e, windowId: unknown): Promise<WindowBoundsIPC | null> => {
      // Window geometry is sensitive enough that we don't want any preload-
      // exposed renderer (e.g. an embedded webview, or a future overlay
      // window with a third-party iframe) calling this.
      if (!isTrustedSender(e.sender)) return null
      if (typeof windowId !== 'number' || !Number.isFinite(windowId)) return null
      try {
        const all = await openWindows()
        const found = all.find((w) => w.id === windowId)
        if (!found) return null
        return {
          x: found.bounds.x,
          y: found.bounds.y,
          width: found.bounds.width,
          height: found.bounds.height,
        }
      } catch {
        return null
      }
    },
  )
}
