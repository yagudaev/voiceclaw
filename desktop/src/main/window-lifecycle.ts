import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { captureException } from './telemetry'

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

  // Catch renderer crashes and report them to PostHog. The renderer's
  // own posthog-js init handles uncaught errors at the JS level; this
  // catches OS-level renderer process termination.
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    captureException(new Error(`render-process-gone: ${details.reason}`), {
      reason: details.reason,
      exitCode: details.exitCode,
      source: 'render-process-gone',
    })
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
  // Keep the dock icon so VoiceClaw stays in Cmd+Tab and the Dock
  // after the window is closed. Hiding the dock here switches the
  // app to accessory activation policy and removes it from the
  // application switcher, which surprises users who expect to bring
  // it back the same way they would any other macOS app.
}
