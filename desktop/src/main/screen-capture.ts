import { ipcMain, desktopCapturer } from 'electron'

export function registerScreenCaptureHandlers() {
  ipcMain.handle('screen:getSources', async () => {
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
}
