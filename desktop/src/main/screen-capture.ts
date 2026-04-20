import { ipcMain, desktopCapturer, systemPreferences, shell, session } from 'electron'

export function registerScreenCaptureHandlers() {
  ipcMain.handle('screen:getSources', async () => {
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
      thumbnailSize: { width: 320, height: 240 },
    })
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnailDataURL: s.thumbnail.toDataURL(),
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
