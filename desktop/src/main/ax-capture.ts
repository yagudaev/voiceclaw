import { ipcMain, app, shell } from 'electron'
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export type AXElement = {
  role: string
  text: string
  frame?: { x: number; y: number; w: number; h: number }
}

export type AXCaptureResult =
  | {
      ok: true
      app: string
      window: string
      elements: AXElement[]
      truncated?: boolean
    }
  | {
      ok: false
      error:
        | 'permission_denied'
        | 'no_frontmost'
        | 'no_window'
        | 'ax_failed'
        | 'unavailable'
        | 'timeout'
        | 'sidecar_unavailable'
    }

const CAPTURE_TIMEOUT_MS = 250
const RESTART_BACKOFF_MS = [200, 500, 1000, 3000, 5000]
const REQUEST_TIMEOUT_REASON = 'timeout'

let proc: ChildProcessWithoutNullStreams | null = null
let stdoutBuf = ''
let nextId = 1
const pending = new Map<
  number,
  {
    resolve: (r: AXCaptureResult | { ok: true; granted: boolean } | { ok: true; version: string }) => void
    timer: NodeJS.Timeout
  }
>()
let restartAttempts = 0
let lastSpawnError: string | null = null
let permissionGranted: boolean | null = null

export function registerAxCaptureHandlers() {
  if (process.platform !== 'darwin') return

  startSidecar()

  ipcMain.handle('ax:capture', async (): Promise<AXCaptureResult> => {
    return capture()
  })

  ipcMain.handle('ax:permission', async (): Promise<{ granted: boolean }> => {
    const r = await sendCommand({ cmd: 'permission' })
    if (r && (r as { ok: boolean }).ok && 'granted' in r) {
      permissionGranted = (r as { granted: boolean }).granted
      return { granted: !!permissionGranted }
    }
    return { granted: false }
  })

  ipcMain.handle('ax:openSettings', async () => {
    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
    )
  })

  app.on('before-quit', () => {
    proc?.kill()
    proc = null
  })
}

export async function capture(): Promise<AXCaptureResult> {
  if (process.platform !== 'darwin') return { ok: false, error: 'unavailable' }
  if (!proc) return { ok: false, error: 'sidecar_unavailable' }
  const r = (await sendCommand({ cmd: 'capture' })) as AXCaptureResult | null
  if (!r) return { ok: false, error: 'timeout' }
  if (!r.ok && r.error === 'permission_denied') permissionGranted = false
  else if (r.ok) permissionGranted = true
  return r
}

export function isPermissionGranted(): boolean | null {
  return permissionGranted
}

// --- helpers below ---

function startSidecar() {
  const binPath = resolveSidecarPath()
  if (!binPath) {
    lastSpawnError = 'binary not found'
    console.warn('[ax-capture] sidecar binary not found; AX capture disabled')
    return
  }
  try {
    proc = spawn(binPath, [], { stdio: ['pipe', 'pipe', 'pipe'] })
  } catch (err) {
    lastSpawnError = (err as Error).message
    console.warn('[ax-capture] spawn failed:', lastSpawnError)
    proc = null
    return
  }
  restartAttempts = 0
  lastSpawnError = null
  proc.stdout.setEncoding('utf8')
  proc.stdout.on('data', onStdout)
  proc.stderr.setEncoding('utf8')
  proc.stderr.on('data', (chunk) => {
    if (chunk.trim()) console.warn('[ax-capture stderr]', chunk.trim())
  })
  proc.on('exit', (code, signal) => {
    console.warn(`[ax-capture] sidecar exited code=${code} signal=${signal}`)
    proc = null
    failAllPending('sidecar_unavailable')
    scheduleRestart()
  })
  proc.on('error', (err) => {
    console.warn('[ax-capture] sidecar error', err.message)
  })
}

function scheduleRestart() {
  if (restartAttempts >= RESTART_BACKOFF_MS.length) {
    console.warn('[ax-capture] giving up after exhausting restart attempts')
    return
  }
  const delay = RESTART_BACKOFF_MS[restartAttempts++]
  setTimeout(() => {
    if (!proc) startSidecar()
  }, delay)
}

function resolveSidecarPath(): string | null {
  // Packaged: resources are copied into <App>/Contents/Resources/bin/ax-capture
  if (app.isPackaged) {
    const p = join(process.resourcesPath, 'bin', 'ax-capture')
    return existsSync(p) ? p : null
  }
  // Dev: use the on-disk binary produced by build-ax-capture.mjs
  const dev = join(app.getAppPath(), 'resources', 'bin', 'ax-capture')
  return existsSync(dev) ? dev : null
}

function onStdout(chunk: string) {
  stdoutBuf += chunk
  let nl: number
  // eslint-disable-next-line no-cond-assign
  while ((nl = stdoutBuf.indexOf('\n')) >= 0) {
    const line = stdoutBuf.slice(0, nl).trim()
    stdoutBuf = stdoutBuf.slice(nl + 1)
    if (!line) continue
    let msg: { id?: number } & Record<string, unknown>
    try {
      msg = JSON.parse(line)
    } catch {
      console.warn('[ax-capture] bad JSON from sidecar:', line.slice(0, 200))
      continue
    }
    const id = msg.id
    if (typeof id !== 'number') continue
    const handler = pending.get(id)
    if (!handler) continue
    pending.delete(id)
    clearTimeout(handler.timer)
    handler.resolve(msg as never)
  }
}

function sendCommand(cmd: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    if (!proc || !proc.stdin.writable) {
      resolve(null)
      return
    }
    const id = nextId++
    const timer = setTimeout(() => {
      if (pending.delete(id)) resolve(null)
    }, CAPTURE_TIMEOUT_MS)
    pending.set(id, {
      resolve: resolve as never,
      timer,
    })
    try {
      proc.stdin.write(JSON.stringify({ ...cmd, id }) + '\n')
    } catch (err) {
      pending.delete(id)
      clearTimeout(timer)
      console.warn('[ax-capture] write failed', (err as Error).message)
      resolve(null)
    }
  })
}

function failAllPending(_reason: string) {
  for (const [, h] of pending) {
    clearTimeout(h.timer)
    h.resolve(null as never)
  }
  pending.clear()
}

// Compact a capture result into a single string for the LLM. Caller decides
// whether to send. Format: header line + one line per element; truncated to
// `maxBytes` bytes (UTF-8) so it can't blow span attribute or token limits.
export function formatAxText(result: AXCaptureResult, maxBytes = 8 * 1024): string {
  if (!result.ok) return ''
  const header = `[Screen text — ${result.app}${result.window ? ` · ${result.window}` : ''}]`
  const lines: string[] = [header]
  for (const el of result.elements) {
    if (!el.text) continue
    const role = el.role.replace(/^AX/, '')
    lines.push(`${role}: ${el.text}`)
  }
  let out = lines.join('\n')
  if (Buffer.byteLength(out, 'utf8') > maxBytes) {
    while (Buffer.byteLength(out, 'utf8') > maxBytes && lines.length > 1) {
      lines.pop()
      out = lines.join('\n') + '\n…(truncated)'
    }
  }
  return out
}
