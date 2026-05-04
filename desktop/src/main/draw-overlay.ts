import { BrowserWindow, ipcMain, screen, type Display } from 'electron'
import { join } from 'node:path'

// Transparent always-on-top overlay used for on-screen annotations during
// screen-share. Sized to the full bounds of a single display, click-through
// by default, switches to interactive when the user enables draw mode.
//
// Two cooperating processes own its state:
//   - The chat renderer (main window) decides when sharing is active and
//     which display the share covers, and toggles draw mode in response to
//     the call-bar buttons.
//   - The overlay renderer (this window's webContents) draws strokes on a
//     canvas and reports them back so the chat renderer can composite the
//     strokes into outgoing video frames.

type CreateOptions = {
  isDev: boolean
  rendererUrl?: string
}

type StrokePoint = { x: number; y: number }
export type Stroke = {
  id: string
  color: string
  width: number
  points: StrokePoint[]
}

let overlayWindow: BrowserWindow | null = null
let isReady = false
let pendingMode: 'idle' | 'draw' | null = null
let pendingDisplayId: number | null = null
let currentDisplayId: number | null = null
let currentMode: 'idle' | 'draw' = 'idle'

let onStrokesChanged: ((strokes: Stroke[], displayBounds: DisplayBounds) => void) | null = null
let onDisplayBoundsChanged: ((displayBounds: DisplayBounds) => void) | null = null
let onModeChanged: ((mode: 'idle' | 'draw') => void) | null = null

export type DisplayBounds = {
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}

export function createDrawOverlay(options: CreateOptions): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow

  const primary = screen.getPrimaryDisplay()
  const { x, y, width, height } = primary.bounds

  overlayWindow = new BrowserWindow({
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
    focusable: false,
    enableLargerThanScreen: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true,
  })
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })

  overlayWindow.on('closed', () => {
    overlayWindow = null
    isReady = false
    pendingMode = null
    pendingDisplayId = null
    currentDisplayId = null
    currentMode = 'idle'
  })

  const rendererUrl =
    options.isDev && options.rendererUrl
      ? `${options.rendererUrl.replace(/\/$/, '')}/?view=draw-overlay`
      : undefined

  if (rendererUrl) {
    overlayWindow.loadURL(rendererUrl)
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      search: 'view=draw-overlay',
    })
  }

  return overlayWindow
}

export function destroyDrawOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy()
  }
  overlayWindow = null
  isReady = false
  pendingMode = null
  pendingDisplayId = null
  currentDisplayId = null
  currentMode = 'idle'
}

export function showDrawOverlay(displayId?: number): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (!isReady) {
    pendingDisplayId = displayId ?? null
    return
  }
  applyShow(displayId)
}

export function hideDrawOverlay(): void {
  pendingDisplayId = null
  pendingMode = null
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  setMode('idle')
  if (overlayWindow.isVisible()) overlayWindow.hide()
}

export function setDrawOverlayMode(mode: 'idle' | 'draw'): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (!isReady) {
    pendingMode = mode
    return
  }
  setMode(mode)
}

export function clearDrawOverlay(): void {
  if (!overlayWindow || overlayWindow.isDestroyed() || !isReady) return
  overlayWindow.webContents.send('draw-overlay:clear')
}

export function getDrawOverlayWindow(): BrowserWindow | null {
  return overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow : null
}

export function onDrawOverlayStrokesChanged(
  handler: (strokes: Stroke[], bounds: DisplayBounds) => void,
): void {
  onStrokesChanged = handler
}

export function onDrawOverlayDisplayBounds(
  handler: (bounds: DisplayBounds) => void,
): void {
  onDisplayBoundsChanged = handler
}

export function onDrawOverlayModeChanged(
  handler: (mode: 'idle' | 'draw') => void,
): void {
  onModeChanged = handler
}

export function registerDrawOverlayHandlers(): void {
  ipcMain.handle('draw-overlay:ready', (e) => {
    if (!isFromOverlay(e.sender.id)) return
    isReady = true
    if (pendingDisplayId !== null) {
      applyShow(pendingDisplayId)
      pendingDisplayId = null
    }
    if (pendingMode !== null) {
      setMode(pendingMode)
      pendingMode = null
    }
  })

  ipcMain.on('draw-overlay:strokes', (e, payload: unknown) => {
    if (!isFromOverlay(e.sender.id)) return
    if (!isStrokesPayload(payload)) return
    if (!onStrokesChanged) return
    const bounds = currentDisplayBounds()
    if (!bounds) return
    onStrokesChanged(payload.strokes, bounds)
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyShow(displayId?: number | null): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  const display = resolveDisplay(displayId ?? undefined)
  currentDisplayId = display.id
  const { x, y, width, height } = display.bounds
  overlayWindow.setBounds({ x, y, width, height })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true,
  })
  if (!overlayWindow.isVisible()) {
    overlayWindow.showInactive()
  }
  const bounds = boundsFromDisplay(display)
  overlayWindow.webContents.send('draw-overlay:bounds', bounds)
  if (onDisplayBoundsChanged) onDisplayBoundsChanged(bounds)
}

function setMode(mode: 'idle' | 'draw'): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  currentMode = mode
  if (mode === 'draw') {
    overlayWindow.setIgnoreMouseEvents(false)
    // Make the overlay key-window-eligible so the renderer receives
    // keydown events (Esc to exit draw mode). Without this, focusable:false
    // means macOS never routes keyboard events here.
    overlayWindow.setFocusable(true)
    overlayWindow.focus()
  } else {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true })
    overlayWindow.setFocusable(false)
  }
  overlayWindow.webContents.send('draw-overlay:mode', mode)
  if (onModeChanged) onModeChanged(mode)
}

function resolveDisplay(displayId?: number): Display {
  if (typeof displayId === 'number') {
    const found = screen.getAllDisplays().find((d) => d.id === displayId)
    if (found) return found
  }
  return screen.getPrimaryDisplay()
}

function currentDisplayBounds(): DisplayBounds | null {
  const display =
    screen.getAllDisplays().find((d) => d.id === currentDisplayId) ??
    screen.getPrimaryDisplay()
  if (!display) return null
  return boundsFromDisplay(display)
}

function boundsFromDisplay(display: Display): DisplayBounds {
  return {
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    scaleFactor: display.scaleFactor,
  }
}

function isFromOverlay(senderId: number): boolean {
  return Boolean(
    overlayWindow &&
      !overlayWindow.isDestroyed() &&
      overlayWindow.webContents.id === senderId,
  )
}

function isStrokesPayload(payload: unknown): payload is { strokes: Stroke[] } {
  if (!payload || typeof payload !== 'object') return false
  const strokes = (payload as { strokes?: unknown }).strokes
  if (!Array.isArray(strokes)) return false
  return strokes.every(isStroke)
}

function isStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== 'object') return false
  const v = value as { id?: unknown; color?: unknown; width?: unknown; points?: unknown }
  if (typeof v.id !== 'string') return false
  if (typeof v.color !== 'string') return false
  if (typeof v.width !== 'number' || !Number.isFinite(v.width)) return false
  if (!Array.isArray(v.points)) return false
  return v.points.every((p) => {
    if (!p || typeof p !== 'object') return false
    const point = p as { x?: unknown; y?: unknown }
    return (
      typeof point.x === 'number' &&
      typeof point.y === 'number' &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  })
}

export function getCurrentMode(): 'idle' | 'draw' {
  return currentMode
}
