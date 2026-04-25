import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'

// Screen-share capture frame — a thin always-on-top, click-through
// rust-colored border drawn around the perimeter of whichever display
// the user is currently sharing. Mirrors the floating call-bar pattern:
// one BrowserWindow created lazily, reused across share sessions, fully
// passive (no focus, no input). Modeled on macOS's menu-bar "screen
// recording" orange dot — except that one disappears in fullscreen apps
// like Keynote / video / immersive demos, exactly when the indicator
// matters most. This window rides above fullscreen surfaces so the user
// can always see at a glance which monitor is going out the wire.
//
// The window is sized to the target display's full bounds (not workArea)
// so the border traces the absolute edge of the screen. Electron clips
// to workArea on alwaysOnTop normal windows, but with `screen-saver`
// level + `enableLargerThanScreen` the frame extends to the full
// display rectangle.

let frameWindow: BrowserWindow | null = null
let isReady = false
let queuedShow: { displayId?: number } | null = null

type CreateOptions = {
  isDev: boolean
  rendererUrl?: string
}

export function createScreenFrame(options: CreateOptions): BrowserWindow {
  if (frameWindow && !frameWindow.isDestroyed()) return frameWindow

  // Initial bounds don't matter — we re-set them on every show. Use the
  // primary display so the window has somewhere sane to live until then.
  const primary = screen.getPrimaryDisplay()
  const { x, y, width, height } = primary.bounds

  frameWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    // Passive observer — the frame is purely visual. Never steals focus
    // and never receives clicks.
    focusable: false,
    enableLargerThanScreen: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Ride above fullscreen surfaces (Keynote, fullscreen video, immersive
  // demos) — this is the whole reason we're shipping our own indicator.
  frameWindow.setAlwaysOnTop(true, 'screen-saver')
  frameWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Click-through across the entire window. The user must be able to
  // interact with whatever's underneath the frame as if it weren't there.
  frameWindow.setIgnoreMouseEvents(true, { forward: false })

  frameWindow.on('closed', () => {
    frameWindow = null
    isReady = false
    queuedShow = null
    currentDisplayId = null
  })

  // Single-bundle renderer — both the main window, the call-bar, and
  // this screen-frame load the same index.html with a `?view=` query
  // string read in src/renderer/src/main.tsx.
  const rendererUrl =
    options.isDev && options.rendererUrl
      ? `${options.rendererUrl.replace(/\/$/, '')}/?view=screen-frame`
      : undefined

  if (rendererUrl) {
    frameWindow.loadURL(rendererUrl)
  } else {
    frameWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      search: 'view=screen-frame',
    })
  }

  return frameWindow
}

export function showScreenFrame(displayId?: number): void {
  if (!frameWindow || frameWindow.isDestroyed()) return
  if (!isReady) {
    queuedShow = { displayId }
    return
  }
  applyShow(displayId)
}

export function hideScreenFrame(): void {
  queuedShow = null
  if (!frameWindow || frameWindow.isDestroyed()) return
  if (frameWindow.isVisible()) {
    frameWindow.hide()
  }
}

export function destroyScreenFrame(): void {
  if (frameWindow && !frameWindow.isDestroyed()) {
    frameWindow.destroy()
  }
  frameWindow = null
  isReady = false
  queuedShow = null
}

export function markScreenFrameReady(): void {
  isReady = true
  if (queuedShow !== null) {
    applyShow(queuedShow.displayId)
    queuedShow = null
  }
}

export function getScreenFrameWindow(): BrowserWindow | null {
  return frameWindow && !frameWindow.isDestroyed() ? frameWindow : null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyShow(displayId?: number): void {
  if (!frameWindow || frameWindow.isDestroyed()) return

  const display = resolveDisplay(displayId)
  const { x, y, width, height } = display.bounds

  frameWindow.setBounds({ x, y, width, height })

  // setBounds can race the alwaysOnTop level on some macOS releases —
  // re-assert the screen-saver level after each show so a fullscreen app
  // that took over since the last show doesn't hide our frame.
  frameWindow.setAlwaysOnTop(true, 'screen-saver')
  frameWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (!frameWindow.isVisible()) {
    frameWindow.showInactive()
  }
}

function resolveDisplay(displayId?: number) {
  if (typeof displayId === 'number') {
    const found = screen.getAllDisplays().find((d) => d.id === displayId)
    if (found) return found
  }
  return screen.getPrimaryDisplay()
}
