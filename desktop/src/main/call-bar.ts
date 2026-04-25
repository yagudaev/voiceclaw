import { BrowserWindow, Menu, screen } from 'electron'
import { join } from 'node:path'
import { getDb } from './db'

// Floating "call bar" — a small always-on-top window that surfaces
// live call state (waveform + brand glyph + drag handle) while a
// realtime session is active. Modeled after Granola's floating bar,
// scoped down to VoiceClaw's warm editorial brand.
//
// The window is created once per app launch and reused — show/hide
// is cheap, full teardown happens on app quit.

const BAR_WIDTH = 34
const BAR_HEIGHT = 85
const SCREEN_MARGIN = 24
const HIDE_FADE_MS = 300

// Broadcast throttling — 30 Hz is plenty smooth for a waveform and
// keeps IPC traffic trivial even with both input and output levels.
const LEVEL_BROADCAST_HZ = 30
const LEVEL_BROADCAST_INTERVAL_MS = Math.round(1000 / LEVEL_BROADCAST_HZ)

type Position = { x: number; y: number }

let callBar: BrowserWindow | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let isReady = false
let queuedVisibility: boolean | null = null
let levelTimer: ReturnType<typeof setInterval> | null = null
let pendingLevels = { input: 0, output: 0 }

// Listener hooks wired up by main/index.ts so the single ipcMain
// instance doesn't get registered twice.
type CallBarHooks = {
  onFocusMain: () => void
  onMuteToggle: () => void
  onEndCall: () => void
  onHideRequested: () => void
}
let hooks: CallBarHooks | null = null

export function registerCallBarHooks(h: CallBarHooks): void {
  hooks = h
}

export function createCallBar(options: { isDev: boolean; rendererUrl?: string }): BrowserWindow {
  if (callBar && !callBar.isDestroyed()) return callBar

  const position = loadPosition() ?? defaultPosition()

  callBar = new BrowserWindow({
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    x: position.x,
    y: position.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    // Passive observer — clicking the bar doesn't steal focus from the
    // app the user is actively working in. The mark's click handler
    // explicitly raises the main window when the user wants to come
    // back to chat.
    focusable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 'floating' is the standard NSFloatingWindowLevel that stays above
  // every regular window — including a focused window of our own app —
  // without the weird focus-stealing dance the higher 'screen-saver'
  // level triggers when the main app comes forward.
  callBar.setAlwaysOnTop(true, 'floating')
  callBar.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  callBar.on('moved', () => {
    persistPosition()
  })

  callBar.on('closed', () => {
    callBar = null
    isReady = false
  })

  // Single-bundle renderer — both the main window and the call-bar
  // window load the same index.html. The call-bar view is selected via
  // the `?view=call-bar` query string read in src/renderer/src/main.tsx.
  const rendererUrl = options.isDev && options.rendererUrl
    ? `${options.rendererUrl.replace(/\/$/, '')}/?view=call-bar`
    : undefined

  if (rendererUrl) {
    callBar.loadURL(rendererUrl)
  } else {
    callBar.loadFile(join(__dirname, '../renderer/index.html'), {
      search: 'view=call-bar',
    })
  }

  return callBar
}

export function showCallBar(): void {
  if (!callBar || callBar.isDestroyed()) return
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (!callBar.isVisible()) {
    // showInactive so we don't steal focus from the app in front.
    callBar.showInactive()
  }
  broadcastVisibility(true)
  startLevelBroadcast()
}

export function hideCallBar(options: { immediate?: boolean } = {}): void {
  if (!callBar || callBar.isDestroyed()) return
  broadcastVisibility(false)
  stopLevelBroadcast()
  if (options.immediate) {
    callBar.hide()
    return
  }
  // Delay the OS hide so the renderer's fade-out transition has a
  // chance to play — otherwise the window vanishes mid-frame.
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (callBar && !callBar.isDestroyed() && callBar.isVisible()) {
      callBar.hide()
    }
    hideTimer = null
  }, HIDE_FADE_MS)
}

export function destroyCallBar(): void {
  stopLevelBroadcast()
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (callBar && !callBar.isDestroyed()) {
    callBar.destroy()
  }
  callBar = null
  isReady = false
}

export function markCallBarReady(): void {
  isReady = true
  if (queuedVisibility !== null) {
    broadcastVisibility(queuedVisibility)
    queuedVisibility = null
  }
}

// Accept raw input/output RMS levels from the main renderer and let
// the periodic broadcaster forward them to the call-bar window. The
// renderer calls this on a ~30 Hz interval while a session is live.
export function setAudioLevels(input: number, output: number): void {
  pendingLevels = { input, output }
}

export function showCallBarContextMenu(): void {
  if (!callBar || callBar.isDestroyed() || !hooks) return
  const menu = Menu.buildFromTemplate([
    {
      label: 'Mute mic',
      click: () => hooks?.onMuteToggle(),
    },
    {
      label: 'End call',
      click: () => hooks?.onEndCall(),
    },
    { type: 'separator' },
    {
      label: 'Hide bar',
      click: () => hooks?.onHideRequested(),
    },
  ])
  menu.popup({ window: callBar })
}

export function focusMainFromCallBar(): void {
  hooks?.onFocusMain()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function broadcastVisibility(visible: boolean): void {
  if (!callBar || callBar.isDestroyed()) return
  if (!isReady) {
    queuedVisibility = visible
    return
  }
  callBar.webContents.send('call-bar:visibility', visible)
}

function startLevelBroadcast(): void {
  if (levelTimer) return
  levelTimer = setInterval(() => {
    if (!callBar || callBar.isDestroyed() || !isReady) return
    callBar.webContents.send('call-bar:audio-levels', pendingLevels)
  }, LEVEL_BROADCAST_INTERVAL_MS)
}

function stopLevelBroadcast(): void {
  if (levelTimer) {
    clearInterval(levelTimer)
    levelTimer = null
  }
  pendingLevels = { input: 0, output: 0 }
}

function defaultPosition(): Position {
  const display = screen.getPrimaryDisplay()
  const { workArea } = display
  return {
    x: workArea.x + workArea.width - BAR_WIDTH - SCREEN_MARGIN,
    y: workArea.y + workArea.height - BAR_HEIGHT - SCREEN_MARGIN,
  }
}

function persistPosition(): void {
  if (!callBar || callBar.isDestroyed()) return
  const [x, y] = callBar.getPosition()
  try {
    const db = getDb()
    db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ).run('call_bar_position', JSON.stringify({ x, y }))
  } catch {
    // Settings are nice-to-have — a failed write shouldn't kill the bar.
  }
}

function loadPosition(): Position | null {
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('call_bar_position') as { value: string } | undefined
    if (!row) return null
    const parsed = JSON.parse(row.value) as Position
    if (
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number' &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return clampToAnyDisplay(parsed)
    }
    return null
  } catch {
    return null
  }
}

// If the user had the bar on a second display that's no longer
// attached, fall back to the primary display's default position so
// we don't spawn offscreen.
function clampToAnyDisplay(pos: Position): Position {
  const displays = screen.getAllDisplays()
  const onAnyDisplay = displays.some((d) => {
    const { x, y, width, height } = d.workArea
    return (
      pos.x + BAR_WIDTH > x &&
      pos.x < x + width &&
      pos.y + BAR_HEIGHT > y &&
      pos.y < y + height
    )
  })
  if (onAnyDisplay) return pos
  return defaultPosition()
}
