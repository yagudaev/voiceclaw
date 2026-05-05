import { globalShortcut, ipcMain } from 'electron'
import { getDb } from './db'

// Global keyboard shortcuts that fire even when the app isn't focused, so the
// user can mute or toggle annotation while working in another app during a
// screen-share. Defaults are seeded on first launch; the Settings UI lets the
// user rebind or clear each one.

export type ShortcutAction =
  | 'toggleCall'
  | 'mute'
  | 'annotate'
  | 'clearAnnotations'
  | 'screenShare'

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  'toggleCall',
  'mute',
  'annotate',
  'clearAnnotations',
  'screenShare',
]

const SETTING_PREFIX = 'shortcut_accelerator_'

const DEFAULTS: Record<ShortcutAction, string> = {
  toggleCall: 'Control+J',
  mute: 'Control+M',
  annotate: 'Control+A',
  clearAnnotations: 'Control+Shift+A',
  screenShare: 'Control+S',
}

let onTriggered: ((action: ShortcutAction) => void) | null = null
let registered: Partial<Record<ShortcutAction, string>> = {}

export function registerShortcutHandlers(
  onTriggeredCallback: (action: ShortcutAction) => void,
): void {
  onTriggered = onTriggeredCallback
  seedDefaults()
  applyAll()

  ipcMain.handle('shortcuts:list', () => listShortcuts())

  ipcMain.handle('shortcuts:set', (_e, action: ShortcutAction, accelerator: string) => {
    if (!SHORTCUT_ACTIONS.includes(action)) return { ok: false, error: 'unknown action' }
    if (!isPlausibleAccelerator(accelerator)) {
      return { ok: false, error: 'invalid accelerator' }
    }
    saveAccelerator(action, accelerator)
    const result = applyOne(action, accelerator)
    return result.ok ? { ok: true, accelerator } : result
  })

  ipcMain.handle('shortcuts:clear', (_e, action: ShortcutAction) => {
    if (!SHORTCUT_ACTIONS.includes(action)) return { ok: false, error: 'unknown action' }
    saveAccelerator(action, '')
    unregisterOne(action)
    return { ok: true }
  })

  ipcMain.handle('shortcuts:resetDefaults', () => {
    for (const action of SHORTCUT_ACTIONS) {
      saveAccelerator(action, DEFAULTS[action])
    }
    applyAll()
    return listShortcuts()
  })
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll()
  registered = {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedDefaults(): void {
  for (const action of SHORTCUT_ACTIONS) {
    if (loadAccelerator(action) === null) {
      saveAccelerator(action, DEFAULTS[action])
    }
  }
}

function applyAll(): void {
  unregisterAllShortcuts()
  for (const action of SHORTCUT_ACTIONS) {
    const accel = loadAccelerator(action) ?? ''
    if (accel) applyOne(action, accel)
  }
}

function applyOne(
  action: ShortcutAction,
  accelerator: string,
): { ok: true } | { ok: false; error: string } {
  // Free whatever was previously bound for this action so a rebind doesn't
  // leave a stale registration behind.
  unregisterOne(action)
  // If another action holds this accelerator, releasing it on a new bind keeps
  // the global registry consistent.
  for (const [otherAction, otherAccel] of Object.entries(registered)) {
    if (otherAccel === accelerator) {
      globalShortcut.unregister(otherAccel)
      delete registered[otherAction as ShortcutAction]
    }
  }
  try {
    const ok = globalShortcut.register(accelerator, () => onTriggered?.(action))
    if (!ok) return { ok: false, error: 'registration failed (system or another app may own this combo)' }
    registered[action] = accelerator
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function unregisterOne(action: ShortcutAction): void {
  const existing = registered[action]
  if (existing) {
    globalShortcut.unregister(existing)
    delete registered[action]
  }
}

function loadAccelerator(action: ShortcutAction): string | null {
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(SETTING_PREFIX + action) as { value: string } | undefined
    return row?.value ?? null
  } catch {
    return null
  }
}

function saveAccelerator(action: ShortcutAction, accelerator: string): void {
  try {
    const db = getDb()
    db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    ).run(SETTING_PREFIX + action, accelerator, accelerator)
  } catch {
    // Settings persistence is best-effort — runtime registration still works.
  }
}

function listShortcuts(): Array<{
  action: ShortcutAction
  accelerator: string
  defaultAccelerator: string
}> {
  return SHORTCUT_ACTIONS.map((action) => ({
    action,
    accelerator: loadAccelerator(action) ?? '',
    defaultAccelerator: DEFAULTS[action],
  }))
}

function isPlausibleAccelerator(s: string): boolean {
  if (typeof s !== 'string') return false
  if (s.length === 0 || s.length > 64) return false
  // Loose validation: at least one '+' separator implies a modifier+key combo,
  // which is what Electron's globalShortcut expects. Single function keys
  // (F1..F24) are also acceptable.
  if (/^F\d{1,2}$/i.test(s.trim())) return true
  return /\+/.test(s)
}
