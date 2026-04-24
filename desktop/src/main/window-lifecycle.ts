import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'

// Window lifecycle for menu-bar mode. Quitting the window hides it but
// keeps the process alive (services stay running so mobile can reach
// this Mac). Cmd-Q actually quits. Re-open from the tray's "Open
// VoiceClaw" reveals the window again.

let mainWindow: BrowserWindow | null = null
let quitting = false

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function isQuitting(): boolean {
  return quitting
}

export function markQuitting(): void {
  quitting = true
}

export function createMainWindow(options: { isDev: boolean; rendererUrl?: string }): BrowserWindow {
  if (mainWindow) {
    showMainWindow()
    return mainWindow
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Intercept close: hide instead of destroy unless we're actually quitting.
  mainWindow.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    hideMainWindow()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (options.isDev && options.rendererUrl) {
    mainWindow.loadURL(options.rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

export function showMainWindow(): void {
  if (!mainWindow) return
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
  app.dock?.show().catch(() => {
    // dock.show() can reject in rare CI / headless states; ignore.
  })
}

export function hideMainWindow(): void {
  if (!mainWindow) return
  mainWindow.hide()
  // Hide dock icon so the app lives quietly in the menu bar. The user
  // can still open a window via the tray at any time.
  app.dock?.hide()
}
