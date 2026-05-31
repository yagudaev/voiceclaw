import { readFileSync, statSync } from "node:fs"
import { homedir, platform } from "node:os"
import { join } from "node:path"
import { log, error as logError } from "./log.js"

// Per-device-token validation client. The relay does NOT open the
// desktop SQLite DB directly (avoids a second native build of
// better-sqlite3 with a different ABI from the one the desktop
// rebuilds against Electron). Instead the desktop main process
// exposes a tiny loopback HTTP bridge that owns the storage AND the
// hashing — we forward the plaintext token over 127.0.0.1 and the
// bridge tells us "is this valid?".
//
// Two ways to find the bridge:
//   1. Discovery file at <userData>/device-token-bridge.json — written
//      by the desktop on bridge start, removed on shutdown. Lets a
//      standalone `yarn dev` relay (started by a developer in a
//      separate shell, NOT spawned by Electron) talk to the running
//      desktop bridge without any per-launch env wiring. The file is
//      0600 and contains {url, nonce, pid, startedAt}.
//   2. Env vars VOICECLAW_DEVICE_TOKEN_CHECK_URL + _NONCE — injected
//      by the desktop when it spawns the bundled relay itself, OR
//      sitting stale in a developer's shell / .env.
//
// Discovery file wins when its `pid` is alive: it is the live source
// of truth from the currently-running desktop, so it cannot point at
// a dead bridge. Env vars are only used when no fresh discovery file
// exists. Otherwise stale env (left over from a previous launch, or
// hardcoded in a dev shell) would silently shadow the actual running
// bridge and every paired-device session.auth would 401.
//
// When neither is available (no desktop running at all),
// `checkDeviceToken` returns `{ ok: false }` and the caller falls
// through to the master-key path.

const NONCE_HEADER = "x-voiceclaw-nonce"
const REQUEST_TIMEOUT_MS = 2_000
const DISCOVERY_FILE_NAME = "device-token-bridge.json"
const DISCOVERY_CACHE_TTL_MS = 5_000

export type DeviceTokenCheck =
  | { ok: true; deviceId: string }
  | { ok: false }

export async function checkDeviceToken(plaintext: unknown): Promise<DeviceTokenCheck> {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    return { ok: false }
  }
  const bridge = getBridgeConfig()
  if (!bridge) return { ok: false }

  try {
    const res = await fetchWithTimeout(`${bridge.url}/device-token/check`, {
      method: "POST",
      headers: {
        [NONCE_HEADER]: bridge.nonce,
        "content-type": "application/json",
      },
      body: JSON.stringify({ token: plaintext }),
    })
    if (!res.ok) {
      logError(`[device-tokens] bridge returned ${res.status}`)
      return { ok: false }
    }
    const body = (await res.json()) as { ok?: unknown; deviceId?: unknown }
    if (body?.ok === true && typeof body.deviceId === "string" && body.deviceId.length > 0) {
      return { ok: true, deviceId: body.deviceId }
    }
    return { ok: false }
  } catch (err) {
    logError(
      `[device-tokens] bridge call failed:`,
      err instanceof Error ? err.message : String(err),
    )
    return { ok: false }
  }
}

export async function identifyDeviceToken(plaintext: string, name: string): Promise<void> {
  const bridge = getBridgeConfig()
  if (!bridge) return
  if (typeof plaintext !== "string" || plaintext.length === 0) return
  if (typeof name !== "string" || name.trim().length === 0) return
  try {
    await fetchWithTimeout(`${bridge.url}/device-token/identify`, {
      method: "POST",
      headers: {
        [NONCE_HEADER]: bridge.nonce,
        "content-type": "application/json",
      },
      body: JSON.stringify({ token: plaintext, name }),
    })
  } catch (err) {
    log(
      `[device-tokens] identify failed (ignored): ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

export async function touchDeviceToken(deviceId: string): Promise<void> {
  const bridge = getBridgeConfig()
  if (!bridge) return
  if (typeof deviceId !== "string" || deviceId.length === 0) return
  try {
    await fetchWithTimeout(`${bridge.url}/device-token/touch`, {
      method: "POST",
      headers: {
        [NONCE_HEADER]: bridge.nonce,
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: deviceId }),
    })
  } catch (err) {
    // Best-effort — never block auth on last_used_at bookkeeping.
    log(
      `[device-tokens] touch failed (ignored): ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

export type BridgeConfig = { url: string; nonce: string; source: "env" | "discovery"; pid?: number }

let discoveryCache: { value: BridgeConfig | null; loadedAt: number; mtimeMs: number } | null = null

function readDiscoveryFile(): BridgeConfig | null {
  const path = getDiscoveryFilePath()
  if (!path) return null
  try {
    const stat = statSync(path)
    if (
      discoveryCache &&
      discoveryCache.mtimeMs === stat.mtimeMs &&
      Date.now() - discoveryCache.loadedAt < DISCOVERY_CACHE_TTL_MS
    ) {
      return discoveryCache.value
    }
    const raw = readFileSync(path, "utf-8")
    const parsed = JSON.parse(raw) as { url?: unknown; nonce?: unknown; pid?: unknown }
    if (typeof parsed.url !== "string" || typeof parsed.nonce !== "string") {
      discoveryCache = { value: null, loadedAt: Date.now(), mtimeMs: stat.mtimeMs }
      return null
    }
    const pid = typeof parsed.pid === "number" && Number.isFinite(parsed.pid) ? parsed.pid : undefined
    const value: BridgeConfig = {
      url: parsed.url.replace(/\/$/, ""),
      nonce: parsed.nonce,
      source: "discovery",
      pid,
    }
    discoveryCache = { value, loadedAt: Date.now(), mtimeMs: stat.mtimeMs }
    return value
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      discoveryCache = { value: null, loadedAt: Date.now(), mtimeMs: 0 }
      return null
    }
    log(
      `[device-tokens] discovery file read failed (ignored): ${err instanceof Error ? err.message : String(err)}`,
    )
    return null
  }
}

// `process.kill(pid, 0)` raises ESRCH for a dead pid and EPERM for a
// pid owned by another user (still alive). Both ENOENT-style "no such
// process" and the legitimate permission denied case are distinct.
function isPidAlive(pid: number | undefined): boolean {
  if (pid === undefined || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "EPERM") return true
    return false
  }
}

export function getDiscoveryFilePath(): string | null {
  const override = process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE?.trim()
  if (override) return override
  const dataDir = getDesktopUserDataDir()
  if (!dataDir) return null
  return join(dataDir, DISCOVERY_FILE_NAME)
}

function getDesktopUserDataDir(): string | null {
  const override = process.env.VOICECLAW_DESKTOP_USER_DATA_DIR?.trim()
  if (override) return override
  const home = homedir()
  if (!home) return null
  switch (platform()) {
    case "darwin":
      return join(home, "Library", "Application Support", "voiceclaw-desktop")
    case "win32": {
      const appData = process.env.APPDATA?.trim()
      if (appData) return join(appData, "voiceclaw-desktop")
      return join(home, "AppData", "Roaming", "voiceclaw-desktop")
    }
    default: {
      const xdg = process.env.XDG_CONFIG_HOME?.trim()
      if (xdg) return join(xdg, "voiceclaw-desktop")
      return join(home, ".config", "voiceclaw-desktop")
    }
  }
}

export function getBridgeConfig(): BridgeConfig | null {
  const discovery = readDiscoveryFile()
  if (discovery && isPidAlive(discovery.pid)) {
    return discovery
  }
  const url = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL?.trim()
  const nonce = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE?.trim()
  if (url && nonce) {
    return { url: url.replace(/\/$/, ""), nonce, source: "env" }
  }
  return discovery
}

export function __resetBridgeDiscoveryCacheForTests(): void {
  discoveryCache = null
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
