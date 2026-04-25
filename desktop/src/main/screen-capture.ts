import { ipcMain, desktopCapturer, systemPreferences, shell, session } from 'electron'

export type ScreenSourceIPC = {
  id: string
  name: string
  thumbnailDataURL: string | null
  appIconDataURL: string | null
}

export function registerScreenCaptureHandlers() {
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
      .sort((a, b) => a.name.localeCompare(b.name))

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
}
