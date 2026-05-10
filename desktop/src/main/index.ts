import { app, BrowserWindow, ipcMain, nativeImage } from 'electron'
import { join } from 'node:path'
import { installStartupCrashHandlers } from './startup-crash'
import { registerIpcHandlers } from './ipc-handlers'
import { registerScreenCaptureHandlers } from './screen-capture'
import { closeDb, getDb } from './db'
import { createTray, destroyTray, rebuildTrayMenu, setTrayState } from './tray'
import {
  createMainWindow,
  getMainWindow,
  hideMainWindow,
  isQuitting,
  markQuitting,
  showMainWindow,
} from './window-lifecycle'
import {
  broadcastMuted,
  createCallBar,
  destroyCallBar,
  focusMainFromCallBar,
  hideCallBar,
  markCallBarReady,
  registerCallBarHooks,
  setAudioLevels,
  showCallBar,
  showCallBarContextMenu,
} from './call-bar'
import {
  clearDrawOverlay,
  createDrawOverlay,
  destroyDrawOverlay,
  getDrawOverlayWindow,
  hideDrawOverlay,
  onDrawOverlayDisplayBounds,
  onDrawOverlayModeChanged,
  onDrawOverlayStrokesChanged,
  registerDrawOverlayHandlers,
  setDrawOverlayMode,
  showDrawOverlay,
} from './draw-overlay'
import { registerShortcutHandlers, unregisterAllShortcuts } from './shortcuts'
import { serviceManager } from './services/service-manager'
import {
  applyGeminiKeyToOpenClawConfig,
  startBundledOpenClaw,
} from './services/openclaw-gateway'
import { startBundledRelayServer } from './services/relay-server'
import { ensureDefault as ensureLaunchAtLoginDefault } from './login-items'
import { initAutoUpdater } from './updater'
import { setRebuildTray } from './services/auto-updater'
import {
  ensureBundledRelayDefaults,
  ensureOnboardingSchema,
  resetOnboarding,
} from './onboarding'
import { getProviderKey } from './provider-keys'
import { registerAuthDeepLink } from './auth'
import {
  capture as telemetryCapture,
  captureException,
  flush as flushTelemetry,
  getDistinctId,
  identify as telemetryIdentify,
  registerProcessHandlers as registerTelemetryHandlers,
  shutdown as shutdownTelemetry,
} from './telemetry'

const isDev = !app.isPackaged

// Hook process-level error handlers as the FIRST thing the app does so a
// startup crash (missing native module, broken DB schema, bad env) renders
// as the friendly dialog instead of Electron's raw-stack default. Static
// imports are hoisted, so this runs after the import graph evaluates but
// before any other top-level code or `whenReady` work.
installStartupCrashHandlers()

// Dev escape hatch: VOICECLAW_FORCE_CRASH=1 yarn dev throws once whenReady
// fires so the graceful crash UI can be exercised end-to-end. We wait for
// whenReady so dialog rendering has a live run loop — the same condition
// real startup crashes (db schema, missing module on require, etc.) hit.
if (isDev && process.env.VOICECLAW_FORCE_CRASH === '1') {
  app.whenReady().then(() => {
    throw new Error('VOICECLAW_FORCE_CRASH triggered')
  })
}

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
  ensureBundledRelayDefaults()
  // Re-apply the saved Gemini key to the openclaw config on every launch so
  // a stale or missing entry on disk recovers itself without forcing the
  // user back through the wizard. No-op when nothing changed.
  try {
    const geminiKey = getProviderKey('gemini')
    if (geminiKey) applyGeminiKeyToOpenClawConfig(geminiKey)
  } catch (err) {
    console.warn('[openclaw] failed to re-apply gemini key on launch', err)
  }
  // Dev escape hatch: VOICECLAW_RESET_ONBOARDING=1 yarn dev wipes the
  // wizard cursor before window creation so the wizard reappears at
  // step 1. Saved keys/devices stay intact.
  if (isDev && process.env.VOICECLAW_RESET_ONBOARDING === '1') {
    resetOnboarding()
  }

  // Predicate shared across handlers that should only accept calls from the
  // chat / settings renderer — never from the call-bar, draw-overlay, or any
  // future webview.
  const isMainRendererSender = (sender: Electron.WebContents) =>
    sender === getMainWindow()?.webContents

  registerAuthDeepLink()
  registerIpcHandlers()
  registerScreenCaptureHandlers(isMainRendererSender)
  registerDrawOverlayHandlers()
  registerShortcutHandlers((action) => {
    // Actions whose visible feedback lives inside the main window need it
    // forward when the shortcut fires from another app — e.g. screen-share's
    // source-picker modal, and the chat surface that shows call state.
    if (action === 'screenShare' || action === 'toggleCall') {
      showMainWindow()
    }
    getMainWindow()?.webContents.send('shortcuts:triggered', action)
  }, isMainRendererSender)
  registerTelemetryHandlers()
  const firstLaunch = isFirstLaunch()
  telemetryIdentify()
  telemetryCapture('app_launched', { dev: isDev, first_launch: firstLaunch })

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
  setRebuildTray(rebuildTrayMenu)

  serviceManager.on('change', () => refreshTrayState())

  ipcMain.handle('tray:setCallActive', (_e, active: boolean) => {
    setCallActive(Boolean(active))
  })

  // Floating call bar ------------------------------------------------------
  // Create the window up front so show/hide is instant when a session
  // opens. The window is hidden until setCallActive(true) fires.
  createCallBar({ isDev, rendererUrl: process.env.ELECTRON_RENDERER_URL })

  createDrawOverlay({ isDev, rendererUrl: process.env.ELECTRON_RENDERER_URL })
  onDrawOverlayStrokesChanged((strokes, bounds) => {
    getMainWindow()?.webContents.send('draw-overlay:strokes', { strokes, bounds })
  })
  onDrawOverlayDisplayBounds((bounds) => {
    getMainWindow()?.webContents.send('draw-overlay:display-bounds', bounds)
  })
  onDrawOverlayModeChanged((mode) => {
    getMainWindow()?.webContents.send('draw-overlay:mode', mode)
  })

  ipcMain.handle('draw-overlay:show', (e, displayId?: number) => {
    if (e.sender !== getMainWindow()?.webContents) return
    showDrawOverlay(typeof displayId === 'number' ? displayId : undefined)
  })
  ipcMain.handle('draw-overlay:hide', (e) => {
    if (e.sender !== getMainWindow()?.webContents) return
    hideDrawOverlay()
  })
  ipcMain.handle('draw-overlay:setMode', (e, mode: unknown) => {
    const main = getMainWindow()?.webContents
    const overlay = getDrawOverlayWindow()?.webContents
    if (e.sender !== main && e.sender !== overlay) return
    if (mode !== 'idle' && mode !== 'draw') return
    setDrawOverlayMode(mode)
  })
  ipcMain.handle('draw-overlay:clear', (e) => {
    const main = getMainWindow()?.webContents
    const overlay = getDrawOverlayWindow()?.webContents
    if (e.sender !== main && e.sender !== overlay) return
    clearDrawOverlay()
  })

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

  ipcMain.handle('call-bar:focus-main', () => {
    focusMainFromCallBar()
  })

  ipcMain.handle('call-bar:open-context-menu', () => {
    showCallBarContextMenu()
  })

  ipcMain.on('call-bar:muted', (e, muted: unknown) => {
    if (e.sender !== getMainWindow()?.webContents) return
    broadcastMuted(Boolean(muted))
  })

  ipcMain.on('call-bar:audio-levels', (e, payload: { input: number; output: number }) => {
    // Use .on instead of .handle — we don't need a reply, and this
    // fires up to 30 Hz.
    if (e.sender !== getMainWindow()?.webContents) return
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
  // Sequenced so the openclaw config (with its baked auth token) is on
  // disk before the relay reads it for BRAIN_GATEWAY_AUTH_TOKEN.
  startBundledOpenClaw()
    .catch((err) => {
      console.warn('[openclaw] failed to start', err)
      captureException(err, { source: 'startBundledOpenClaw' })
    })
    .then(() =>
      startBundledRelayServer().catch((err) => {
        console.warn('[relay] failed to start', err)
        captureException(err, { source: 'startBundledRelayServer' })
      }),
    )

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
  unregisterAllShortcuts()
  serviceManager.stopAll()
  destroyCallBar()
  destroyDrawOverlay()
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

function isFirstLaunch(): boolean {
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('telemetry_distinct_id') as { value: string } | undefined
    const isNew = !row?.value
    getDistinctId()
    return isNew
  } catch {
    return false
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
