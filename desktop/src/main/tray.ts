import { app, Menu, nativeImage, Tray, type NativeImage } from 'electron'
import { join } from 'node:path'
import { serviceManager, type ServiceStatus } from './services/service-manager'

// Menu bar presence. The tray icon lives in the system menu bar (top-right
// on macOS) and is the always-on entry point to VoiceClaw when the main
// window is closed. This is how mobile devices can reach the laptop —
// services stay running as long as the tray lives.
//
// The icon changes to reflect connection state so the user can see at a
// glance whether everything is up without opening the window.

export type TrayState = 'idle' | 'ready' | 'warn' | 'error' | 'on-call'

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
    case 'on-call':
      return 'On a call'
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

function buildIcon(_state: TrayState): NativeImage {
  const image = nativeImage.createFromPath(trayIconPath())
  image.setTemplateImage(true)
  return image
}

function trayIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'tray', 'trayTemplate.png')
  }
  return join(app.getAppPath(), 'resources', 'tray', 'trayTemplate.png')
}
