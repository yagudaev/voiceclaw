import { app, BrowserWindow, ipcMain, nativeImage } from 'electron'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc-handlers'
import { registerScreenCaptureHandlers } from './screen-capture'
import { closeDb } from './db'
import { createTray, destroyTray, setTrayState } from './tray'
import {
  createMainWindow,
  hideMainWindow,
  isQuitting,
  markQuitting,
  showMainWindow,
} from './window-lifecycle'
import { serviceManager } from './services/service-manager'
import { startBundledOpenClaw } from './services/openclaw-gateway'
import { ensureDefault as ensureLaunchAtLoginDefault } from './login-items'
import { initAutoUpdater } from './updater'
import { ensureOnboardingSchema, resetOnboarding } from './onboarding'
import { registerAuthDeepLink } from './auth'
import {
  capture as telemetryCapture,
  captureException,
  flush as flushTelemetry,
  identify as telemetryIdentify,
  registerProcessHandlers as registerTelemetryHandlers,
  shutdown as shutdownTelemetry,
} from './telemetry'

const isDev = !app.isPackaged

// Prevent multiple instances so the tray stays singular.
const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
}

app.on('second-instance', () => {
  showMainWindow()
})

app.whenReady().then(async () => {
  // electron-builder bakes the .icns into the packaged .app, so the OS
  // uses the right icon in the dock / Finder / Spotlight automatically
  // for installed builds. In dev (`yarn dev`) Electron starts with its
  // own default atom icon — set the dock icon explicitly so the dev
  // dock matches what users will see in production.
  if (isDev) {
    const devDockIcon = nativeImage.createFromPath(
      join(app.getAppPath(), 'resources', 'dock', 'icon.png'),
    )
    if (!devDockIcon.isEmpty()) app.dock?.setIcon(devDockIcon)
  }

  ensureOnboardingSchema()
  // Dev escape hatch: VOICECLAW_RESET_ONBOARDING=1 yarn dev wipes the
  // wizard cursor before window creation so the wizard reappears at
  // step 1. Saved keys/devices stay intact.
  if (isDev && process.env.VOICECLAW_RESET_ONBOARDING === '1') {
    resetOnboarding()
  }

  registerAuthDeepLink()
  registerIpcHandlers()
  registerScreenCaptureHandlers()
  registerTelemetryHandlers()
  telemetryIdentify()
  telemetryCapture('app_launched', { dev: isDev })

  const wasOpenedAsHidden = app.getLoginItemSettings().wasOpenedAsHidden

  const mainWindow = createMainWindow({
    isDev,
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
  })

  // Launched via login-items with openAsHidden? Stay in the menu bar
  // until the user opens the window themselves. On any other launch,
  // show the window normally.
  if (wasOpenedAsHidden) {
    // ready-to-show will fire and try to show; suppress by hiding ASAP
    // after it shows so we never steal focus.
    mainWindow.once('show', () => {
      mainWindow.hide()
      app.dock?.hide()
    })
  }

  createTray({
    onOpenWindow: () => showMainWindow(),
    onQuit: () => {
      markQuitting()
      app.quit()
    },
  })

  // Reflect service state in the tray icon.
  serviceManager.on('change', () => refreshTrayState())

  // Renderer announces when a realtime session opens/closes so the tray
  // can show "On a call" instead of "Idle" while a session is live.
  ipcMain.handle('tray:setCallActive', (_e, active: boolean) => {
    setCallActive(Boolean(active))
  })

  // First-run: default launch-at-login to ON so mobile devices can
  // reach this Mac without the user opening the app first. User can
  // flip it off from Settings.
  if (!isDev) {
    ensureLaunchAtLoginDefault(true)
  }

  // Best-effort spawn of bundled services. Missing binary is fine in dev.
  startBundledOpenClaw().catch((err) => {
    console.warn('[openclaw] failed to start', err)
    captureException(err, { source: 'startBundledOpenClaw' })
  })

  // Check for app updates. No-op in dev or when disabled.
  initAutoUpdater().catch((err) => {
    console.warn('[updater] init failed', err)
    captureException(err, { source: 'initAutoUpdater' })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow({ isDev, rendererUrl: process.env.ELECTRON_RENDERER_URL })
    } else {
      showMainWindow()
    }
  })
})

// Do NOT quit when all windows close on macOS. The tray owns the
// process lifecycle now.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
  // On darwin: hide the dock but keep the tray + services running.
  hideMainWindow()
})

app.on('before-quit', async (event) => {
  markQuitting()
  // Flush queued telemetry before exit. Defer the actual quit one tick
  // so posthog-node can drain its buffer over the wire.
  if (!quittingFlushed) {
    event.preventDefault()
    quittingFlushed = true
    try {
      await flushTelemetry()
      await shutdownTelemetry()
    } finally {
      app.quit()
    }
  }
})

app.on('will-quit', () => {
  serviceManager.stopAll()
  destroyTray()
  closeDb()
})

let quittingFlushed = false

// Test hook — set VOICECLAW_TEST_ERROR=1 to throw early in main and
// verify error reporting end-to-end. Off in normal builds.
if (process.env.VOICECLAW_TEST_ERROR === '1') {
  setTimeout(() => {
    throw new Error('VOICECLAW_TEST_ERROR triggered (main)')
  }, 1500)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// An active voice call wins over service state — the user cares more
// about "am I live?" than "are background services healthy?" while a
// session is running.
let callActive = false

export function setCallActive(active: boolean): void {
  callActive = active
  refreshTrayState()
}

function refreshTrayState() {
  if (callActive) {
    setTrayState('on-call')
    return
  }
  const statuses = serviceManager.getAllStatuses()
  const values = Object.values(statuses)
  if (values.length === 0) {
    setTrayState('idle')
    return
  }
  if (values.some((s) => s.state === 'crashed')) {
    setTrayState('error')
    return
  }
  if (values.every((s) => s.state === 'running')) {
    setTrayState('ready')
    return
  }
  setTrayState('warn')
}
