import { app, BrowserWindow } from 'electron'
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

function refreshTrayState() {
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
