import { app, Menu, nativeImage, Tray, type NativeImage } from 'electron'
import { serviceManager, type ServiceStatus } from './services/service-manager'

// Menu bar presence. The tray icon lives in the system menu bar (top-right
// on macOS) and is the always-on entry point to VoiceClaw when the main
// window is closed. This is how mobile devices can reach the laptop —
// services stay running as long as the tray lives.
//
// The icon changes to reflect connection state so the user can see at a
// glance whether everything is up without opening the window.

export type TrayState = 'idle' | 'ready' | 'warn' | 'error'

type TrayContext = {
  onOpenWindow: () => void
  onQuit: () => void
  onPairPhone?: () => void
}

let tray: Tray | null = null
let currentState: TrayState = 'idle'
let context: TrayContext | null = null

export function createTray(ctx: TrayContext): Tray {
  context = ctx
  tray = new Tray(buildIcon('idle'))
  tray.setToolTip('VoiceClaw')
  tray.on('click', () => ctx.onOpenWindow())
  rebuildMenu()

  serviceManager.on('change', () => rebuildMenu())
  return tray
}

export function setTrayState(state: TrayState): void {
  if (!tray) return
  currentState = state
  tray.setImage(buildIcon(state))
  rebuildMenu()
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function rebuildMenu(): void {
  if (!tray || !context) return
  const statuses = serviceManager.getAllStatuses()
  const ctx = context

  const menu = Menu.buildFromTemplate([
    {
      label: `VoiceClaw · ${stateLabel(currentState)}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open VoiceClaw',
      accelerator: 'Command+O',
      click: () => ctx.onOpenWindow(),
    },
    ...(ctx.onPairPhone
      ? [
          {
            label: 'Pair a phone…',
            click: () => ctx.onPairPhone?.(),
          } as Electron.MenuItemConstructorOptions,
        ]
      : []),
    { type: 'separator' },
    {
      label: 'Services',
      submenu: serviceMenuItems(statuses),
    },
    { type: 'separator' },
    {
      label: 'Quit VoiceClaw',
      accelerator: 'Command+Q',
      click: () => ctx.onQuit(),
    },
  ])
  tray.setContextMenu(menu)
}

function serviceMenuItems(
  statuses: Record<string, ServiceStatus>,
): Electron.MenuItemConstructorOptions[] {
  const entries = Object.entries(statuses)
  if (entries.length === 0) {
    return [{ label: 'No services running', enabled: false }]
  }
  return entries.map(([name, status]) => ({
    label: `${prettyServiceName(name)} — ${statusLabel(status)}`,
    enabled: false,
  }))
}

function stateLabel(state: TrayState): string {
  switch (state) {
    case 'ready':
      return 'Ready'
    case 'warn':
      return 'Degraded'
    case 'error':
      return 'Error'
    default:
      return 'Idle'
  }
}

function statusLabel(status: ServiceStatus): string {
  switch (status.state) {
    case 'running':
      return `running on :${status.port}`
    case 'starting':
      return 'starting…'
    case 'crashed':
      return `crashed (exit ${status.lastExitCode ?? 'unknown'})`
    case 'stopped':
      return 'stopped'
    default:
      return 'idle'
  }
}

function prettyServiceName(name: string): string {
  switch (name) {
    case 'openclawGateway':
      return 'OpenClaw gateway'
    case 'relay':
      return 'Relay'
    case 'tracingCollector':
      return 'Tracing collector'
    case 'tracingUi':
      return 'Tracing UI'
    default:
      return name
  }
}

// Programmatically drawn 1-bit icons so we don't need to ship asset files
// in this first pass. macOS automatically inverts template images on dark
// menu bar backgrounds.
function buildIcon(state: TrayState): NativeImage {
  const svg = iconSvg(state)
  const image = nativeImage.createFromBuffer(Buffer.from(svg), { scaleFactor: 2 })
  // Mark as a template image so macOS handles light/dark appropriately.
  image.setTemplateImage(state === 'error' || state === 'warn' ? false : true)
  return image.resize({ width: 18, height: 18 })
}

function iconSvg(state: TrayState): string {
  // The VoiceClaw mark, simplified for 16px menu bar rendering. Rust-colored
  // center bar for error/warn states so they're glanceable.
  const accent = state === 'error' ? '#c14d33' : state === 'warn' ? '#d7a65a' : 'currentColor'
  const centerStrokeColor = state === 'ready' ? '#c14d33' : accent
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 64 64" fill="none">
  <path d="M20 10 H14 V54 H20 M20 10 L27 17 M20 54 L27 47" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M44 10 H50 V54 H44 M44 10 L37 17 M44 54 L37 47" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M29 40 V24" stroke="${centerStrokeColor}" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M35 46 V18" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M41 37 V27" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
</svg>`
}
