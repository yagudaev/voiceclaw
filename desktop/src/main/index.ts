import { app, BrowserWindow, ipcMain, nativeImage } from 'electron'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc-handlers'
import { registerScreenCaptureHandlers } from './screen-capture'
import { closeDb, getDb } from './db'
import { createTray, destroyTray, setTrayState } from './tray'
import {
  createMainWindow,
  getMainWindow,
  hideMainWindow,
  isQuitting,
  markQuitting,
  showMainWindow,
} from './window-lifecycle'
import {
  createCallBar,
  destroyCallBar,
  focusMainFromCallBar,
  getCallBarWindow,
  hideCallBar,
  markCallBarReady,
  registerCallBarHooks,
  setAudioLevels,
  showCallBar,
  showCallBarContextMenu,
} from './call-bar'
import {
  createScreenFrame,
  destroyScreenFrame,
  getScreenFrameWindow,
  hideScreenFrame,
  markScreenFrameReady,
  showScreenFrame,
} from './screen-frame'
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
  // Packaged builds get their dock icon from the bundled .icns; dev needs it set explicitly.
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

  // Launched via login-items with openAsHidden? Suppress the window so
  // we never steal focus on login, but leave the dock icon visible so
  // the user can still find VoiceClaw in Cmd+Tab and the Dock — same
  // pattern Slack, Linear, etc. use for "open at login, hidden".
  if (wasOpenedAsHidden) {
    mainWindow.once('show', () => {
      mainWindow.hide()
    })
  }

  createTray({
    onOpenWindow: () => showMainWindow(),
    onQuit: () => {
      markQuitting()
      app.quit()
    },
  })

  serviceManager.on('change', () => refreshTrayState())

  ipcMain.handle('tray:setCallActive', (_e, active: boolean) => {
    setCallActive(Boolean(active))
  })

  // Floating call bar ------------------------------------------------------
  // Create the window up front so show/hide is instant when a session
  // opens. The window is hidden until setCallActive(true) fires.
  createCallBar({ isDev, rendererUrl: process.env.ELECTRON_RENDERER_URL })

  registerCallBarHooks({
    onFocusMain: () => {
      if (!getMainWindow()) {
        createMainWindow({ isDev, rendererUrl: process.env.ELECTRON_RENDERER_URL })
      }
      showMainWindow()
    },
    onMuteToggle: () => {
      getMainWindow()?.webContents.send('call-bar:request-mute-toggle')
    },
    onEndCall: () => {
      getMainWindow()?.webContents.send('call-bar:request-end-call')
    },
    onHideRequested: () => {
      sessionHiddenByUser = true
      hideCallBar()
    },
  })

  ipcMain.handle('call-bar:ready', () => {
    markCallBarReady()
  })

  // Screen-share indicator -------------------------------------------------
  // Capture-frame BrowserWindow + the rust pip on the call-bar Mark are
  // both driven by a single signal: when the chat renderer starts a
  // share, it fires `screen-share:setActive`; when the share ends (user
  // clicks Stop, track.onended, or session ends), it fires it again
  // with active=false. The handler:
  //   1. shows / hides the perimeter frame on the chosen display
  //   2. forwards the same state to the call-bar window so its CSS pip
  //      lights up live (no DB / settings round-trip needed)
  createScreenFrame({ isDev, rendererUrl: process.env.ELECTRON_RENDERER_URL })

  // Lifecycle signal owned by the screen-frame renderer only — reject
  // anything coming from the main app or any other webContents so a
  // compromised renderer can't flush a queued show on our behalf.
  ipcMain.handle('screen-frame:ready', (event) => {
    const frame = getScreenFrameWindow()
    if (!frame || event.sender !== frame.webContents) return
    markScreenFrameReady()
  })

  // Privileged: this handler controls an alwaysOnTop screen-saver-level
  // BrowserWindow plus call-bar pip state. Only the main chat window
  // is allowed to call it, and the payload shape must be exact.
  ipcMain.handle(
    'screen-share:setActive',
    (event, payload: unknown) => {
      const main = getMainWindow()
      if (!main || event.sender !== main.webContents) return
      if (!payload || typeof payload !== 'object') return

      const p = payload as { active?: unknown; displayId?: unknown }
      if (typeof p.active !== 'boolean') return
      const displayId =
        typeof p.displayId === 'number' && Number.isFinite(p.displayId)
          ? p.displayId
          : undefined

      if (p.active && isScreenFrameEnabled()) {
        showScreenFrame(displayId)
      } else {
        hideScreenFrame()
      }

      // Mirror state into the call-bar so its rust pip can react in
      // real time. Use .send (not the queued visibility broadcaster)
      // because the bar may be hidden — we still want it to remember
      // the latest state the next time it shows.
      const bar = getCallBarWindow()
      bar?.webContents.send('call-bar:screen-share', { active: p.active })
    },
  )

  ipcMain.handle('call-bar:focus-main', () => {
    focusMainFromCallBar()
  })

  ipcMain.handle('call-bar:open-context-menu', () => {
    showCallBarContextMenu()
  })

  ipcMain.on('call-bar:audio-levels', (_e, payload: { input: number; output: number }) => {
    // Use .on instead of .handle — we don't need a reply, and this
    // fires up to 30 Hz.
    setAudioLevels(
      typeof payload?.input === 'number' ? payload.input : 0,
      typeof payload?.output === 'number' ? payload.output : 0,
    )
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
  // On darwin: hide the window but keep the dock icon, tray, and
  // services running so the user can still bring VoiceClaw back via
  // Cmd+Tab, the Dock, or the tray menu.
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
  destroyCallBar()
  destroyScreenFrame()
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

let callActive = false
// "Hide bar" from the context menu hides the floating pill for the
// rest of the current session. A new call re-arms the bar.
let sessionHiddenByUser = false

export function setCallActive(active: boolean): void {
  callActive = active
  refreshTrayState()
  if (active) {
    sessionHiddenByUser = false
    if (isCallBarEnabled()) {
      showCallBar()
    }
  } else {
    hideCallBar()
  }
}

function isCallBarEnabled(): boolean {
  if (sessionHiddenByUser) return false
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('call_bar_enabled') as { value: string } | undefined
    // Default ON — explicit opt-out only.
    return row?.value !== 'false'
  } catch {
    return true
  }
}

function isScreenFrameEnabled(): boolean {
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('screen_frame_enabled') as { value: string } | undefined
    // Default ON — explicit opt-out only.
    return row?.value !== 'false'
  } catch {
    return true
  }
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
