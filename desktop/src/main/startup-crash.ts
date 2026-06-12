// Graceful main-process startup-crash UI.
//
// Replaces Electron's default uncaught-exception dialog (a yellow-triangle
// modal dumping a raw stack trace) with a short, actionable UI that:
//   - writes the full unsanitized exception to ~/Library/Logs/VoiceClaw/
//   - sends a sanitized telemetry event so we get a remote signal
//   - shows the user 4 buttons: Reveal Logs, Copy Diagnostic, Reinstall, Quit
//   - tucks the sanitized stack into the dialog's `detail` field so power
//     users can read it without scaring everyone else
//
// The handler is idempotent: if multiple exceptions fire in sequence (e.g.
// an uncaughtException followed by an unhandledRejection during teardown)
// only the first one shows a dialog. All exits go through `app.exit(1)` so
// crash semantics stay the same.

import { app, clipboard, dialog, shell } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const RELEASES_URL = 'https://github.com/yagudaev/voiceclaw/releases/latest'

const BUTTON_REVEAL = 0
const BUTTON_COPY = 1
const BUTTON_REINSTALL = 2
const BUTTON_QUIT = 3

const SANITIZED_MAX_CHARS = 500
const SANITIZED_STACK_FRAMES = 5
const TECHNICAL_DETAIL_FRAMES = 3

export type StartupCrashSource = 'uncaughtException' | 'unhandledRejection'

export type SanitizedError = {
  errorClass: string
  errorMessage: string
  stackFrames: string[]
}

export type HandleStartupCrashDeps = {
  capture?: (event: string, props?: Record<string, unknown>) => void
  exit?: (code: number) => void
  showDialog?: typeof dialog.showMessageBox
  openPath?: typeof shell.openPath
  openExternal?: typeof shell.openExternal
  writeClipboard?: typeof clipboard.writeText
  writeLogFile?: (path: string, contents: string) => void
  now?: () => Date
  logsDir?: string
  appVersion?: string
}

let crashHandled = false

export function installStartupCrashHandlers(deps: HandleStartupCrashDeps = {}): void {
  process.on('uncaughtException', (err) => {
    void handleStartupCrash(err, 'uncaughtException', deps)
  })
  process.on('unhandledRejection', (reason) => {
    void handleStartupCrash(reason, 'unhandledRejection', deps)
  })
}

export async function handleStartupCrash(
  err: unknown,
  source: StartupCrashSource,
  deps: HandleStartupCrashDeps = {},
): Promise<void> {
  if (crashHandled) return
  crashHandled = true

  const error = err instanceof Error ? err : new Error(String(err))
  console.error('[startup-crash]', source, error.stack ?? error.message)
  const sanitized = sanitizeStartupError(error)
  const now = (deps.now ?? defaultNow)()
  const logPath = buildLogPath(now, deps.logsDir)

  safeWriteCrashLog(logPath, error, source, now, deps.writeLogFile)
  safeFireTelemetry(sanitized, source, deps)

  await safeShowDialog(sanitized, logPath, deps)

  const exit = deps.exit ?? defaultExit
  exit(1)
}

export function sanitizeStartupError(err: Error): SanitizedError {
  const errorClass = err.name || 'Error'
  const errorMessage = sanitizePathsInString(err.message ?? '')
  const stackFrames = parseStackFrames(err.stack ?? '', SANITIZED_STACK_FRAMES).map(
    sanitizePathsInString,
  )
  const summary = formatSanitizedSummary({ errorClass, errorMessage, stackFrames })
  if (summary.length <= SANITIZED_MAX_CHARS) {
    return { errorClass, errorMessage, stackFrames }
  }
  return truncateSanitized({ errorClass, errorMessage, stackFrames }, SANITIZED_MAX_CHARS)
}

export function formatSanitizedSummary(s: SanitizedError): string {
  const head = `${s.errorClass}: ${s.errorMessage}`
  if (s.stackFrames.length === 0) return head
  return `${head}\n${s.stackFrames.map((f) => `  ${f}`).join('\n')}`
}

export function buildClipboardPayload(s: SanitizedError, logPath: string): string {
  return `${logPath}\n\n${formatSanitizedSummary(s)}`
}

export function __resetForTests(): void {
  crashHandled = false
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultNow(): Date {
  return new Date()
}

function defaultExit(code: number): void {
  app.exit(code)
}

function defaultLogsDir(): string {
  // On macOS we always write to ~/Library/Logs/VoiceClaw/ — the AC and the
  // user docs both promise that path, and `app.getPath('logs')` resolves
  // through `app.getName()` which can return `voiceclaw-desktop` (the
  // package.json name) in dev before the bundle's CFBundleName is read.
  if (process.platform === 'darwin') {
    return join(safeHomedir() || '/tmp', 'Library', 'Logs', 'VoiceClaw')
  }
  try {
    return app.getPath('logs')
  } catch {
    return join(safeHomedir() || '/tmp', '.voiceclaw', 'logs')
  }
}

function buildLogPath(now: Date, logsDir?: string): string {
  const dir = logsDir ?? defaultLogsDir()
  const stamp = now.toISOString().replace(/[:.]/g, '-')
  return join(dir, `startup-crash-${stamp}.log`)
}

function safeWriteCrashLog(
  path: string,
  err: Error,
  source: StartupCrashSource,
  now: Date,
  writer?: (path: string, contents: string) => void,
): void {
  const contents = [
    `timestamp: ${now.toISOString()}`,
    `source: ${source}`,
    `app_version: ${safeAppVersion()}`,
    `platform: ${process.platform}`,
    `arch: ${process.arch}`,
    `electron: ${process.versions.electron ?? 'unknown'}`,
    `node: ${process.versions.node ?? 'unknown'}`,
    '',
    `${err.name}: ${err.message}`,
    err.stack ?? '(no stack)',
    '',
  ].join('\n')
  try {
    if (writer) {
      writer(path, contents)
      return
    }
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, contents, { encoding: 'utf8' })
  } catch {
    // never throw from the crash handler
  }
}

function safeFireTelemetry(
  s: SanitizedError,
  source: StartupCrashSource,
  deps: HandleStartupCrashDeps,
): void {
  try {
    const capture = deps.capture ?? loadTelemetryCapture()
    if (!capture) return
    capture('app.startup_failed', {
      error_class: s.errorClass,
      error_message: s.errorMessage,
      stack_preview: s.stackFrames.slice(0, TECHNICAL_DETAIL_FRAMES).join(' | '),
      app_version: deps.appVersion ?? safeAppVersion(),
      platform: process.platform,
      arch: process.arch,
      source,
    })
  } catch {
    // never throw
  }
}

function loadTelemetryCapture():
  | ((event: string, props?: Record<string, unknown>) => void)
  | null {
  try {
    // Lazy require so the test harness can stub it without loading
    // posthog-node, and so a busted telemetry module never blocks the
    // crash UI from rendering.
    const mod = require('./telemetry') as typeof import('./telemetry')
    return mod.capture
  } catch {
    return null
  }
}

function safeAppVersion(): string {
  try {
    return app.getVersion()
  } catch {
    return 'unknown'
  }
}

async function safeShowDialog(
  s: SanitizedError,
  logPath: string,
  deps: HandleStartupCrashDeps,
): Promise<void> {
  const showDialog = deps.showDialog ?? dialog.showMessageBox
  const openPath = deps.openPath ?? ((p: string) => shell.openPath(p))
  const openExternal = deps.openExternal ?? ((u: string) => shell.openExternal(u))
  const writeClipboard = deps.writeClipboard ?? ((t: string) => clipboard.writeText(t))

  try {
    // dialog.showMessageBox needs the app's main run loop to render. If
    // the crash fires before whenReady resolves (rare — most startup
    // crashes come from inside whenReady), wait briefly so the dialog
    // actually paints. The default-injected showDialog in tests skips
    // this branch via `deps.showDialog`.
    if (!deps.showDialog) {
      await waitForAppReady()
      // The crash often races with whatever else is happening on screen
      // (the user may have alt-tabbed away during launch). Pull focus so
      // the dialog isn't hidden behind the previous frontmost app.
      try {
        app.focus?.({ steal: true })
      } catch {
        // ignore — focus is best-effort
      }
    }
    const detail = buildDialogDetail(s, logPath)
    const result = await showDialog({
      type: 'error',
      title: 'VoiceClaw',
      message: 'Something went wrong starting VoiceClaw.',
      detail,
      buttons: ['Reveal Logs', 'Copy Diagnostic', 'Reinstall', 'Quit'],
      defaultId: BUTTON_QUIT,
      cancelId: BUTTON_QUIT,
      noLink: true,
    })
    await respondToDialog(result.response, s, logPath, {
      showDialog,
      openPath,
      openExternal,
      writeClipboard,
    })
  } catch {
    // If the dialog itself fails (e.g. headless CI), fall through to exit.
  }
}

async function waitForAppReady(timeoutMs = 5_000): Promise<void> {
  try {
    if (app.isReady?.()) return
  } catch {
    return
  }
  const ready = app.whenReady?.() ?? Promise.resolve()
  await Promise.race([
    ready,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ])
}

function buildDialogDetail(s: SanitizedError, logPath: string): string {
  const sanitizedLogPath = sanitizePathsInString(logPath)
  const techBody = s.stackFrames
    .slice(0, TECHNICAL_DETAIL_FRAMES)
    .map((f) => `  ${f}`)
    .join('\n')
  const tech = s.stackFrames.length > 0
    ? `\n\nTechnical detail (sanitized):\n${s.errorClass}: ${s.errorMessage}\n${techBody}`
    : ''
  return `We've saved diagnostic information to:\n${sanitizedLogPath}${tech}`
}

type DialogActions = {
  showDialog: typeof dialog.showMessageBox
  openPath: (path: string) => Promise<string> | string
  openExternal: (url: string) => Promise<void> | void
  writeClipboard: (text: string) => void
}

async function respondToDialog(
  response: number,
  s: SanitizedError,
  logPath: string,
  actions: DialogActions,
): Promise<void> {
  if (response === BUTTON_REVEAL) {
    try {
      await Promise.resolve(actions.openPath(defaultLogsDir()))
    } catch {
      // ignore
    }
    return
  }
  if (response === BUTTON_COPY) {
    try {
      const payload = buildClipboardPayload(s, sanitizePathsInString(logPath))
      actions.writeClipboard(payload)
      await actions.showDialog({
        type: 'info',
        title: 'VoiceClaw',
        message: 'Copied to clipboard',
        detail: 'Paste into a support email or GitHub issue.',
        buttons: ['OK'],
        defaultId: 0,
        noLink: true,
      })
    } catch {
      // ignore
    }
    return
  }
  if (response === BUTTON_REINSTALL) {
    try {
      await Promise.resolve(actions.openExternal(RELEASES_URL))
    } catch {
      // ignore
    }
    return
  }
  // BUTTON_QUIT and the default fall through to exit.
}

function parseStackFrames(stack: string, limit: number): string[] {
  if (!stack) return []
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '))
    .slice(0, limit)
}

function sanitizePathsInString(input: string): string {
  if (!input) return ''
  let out = input
  // Strip the home directory ahead of more specific app paths so the
  // narrower replacement runs on already-relative-looking text.
  const home = safeHomedir()
  if (home) {
    out = out.split(home).join('~')
  }
  // Common macOS .app bundle path → <app>
  out = out.replace(/\/Applications\/[^/]+\.app\/Contents/g, '<app>')
  out = out.replace(/[^\s'"]+\.app\/Contents/g, '<app>')
  return out
}

function safeHomedir(): string {
  try {
    return homedir()
  } catch {
    return ''
  }
}

function truncateSanitized(s: SanitizedError, maxChars: number): SanitizedError {
  const frames = s.stackFrames.slice()
  while (frames.length > 0 && formatSanitizedSummary({ ...s, stackFrames: frames }).length > maxChars) {
    frames.pop()
  }
  const summary = formatSanitizedSummary({ ...s, stackFrames: frames })
  if (summary.length <= maxChars) {
    return { ...s, stackFrames: frames }
  }
  // Still too long after dropping every frame — truncate the message.
  const head = `${s.errorClass}: `
  const room = Math.max(0, maxChars - head.length - 1)
  const message = s.errorMessage.length > room ? s.errorMessage.slice(0, room) + '…' : s.errorMessage
  return { ...s, errorMessage: message, stackFrames: [] }
}
