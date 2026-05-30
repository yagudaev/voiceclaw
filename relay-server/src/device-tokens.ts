import { log, error as logError } from "./log.js"

// Per-device-token validation client. The relay does NOT open the
// desktop SQLite DB directly (avoids a second native build of
// better-sqlite3 with a different ABI from the one the desktop
// rebuilds against Electron). Instead the desktop main process
// exposes a tiny loopback HTTP bridge and hands us the URL + a
// per-launch nonce via env. The bridge owns the storage AND the
// hashing — we forward the plaintext token over 127.0.0.1 and the
// bridge tells us "is this valid?".
//
// Env contract (set by the desktop):
//   VOICECLAW_DEVICE_TOKEN_CHECK_URL    e.g. http://127.0.0.1:54213
//   VOICECLAW_DEVICE_TOKEN_CHECK_NONCE  per-launch random hex
//
// Standalone `yarn dev` against this relay won't have either set —
// `checkDeviceToken` returns `{ ok: false }` in that case, and the
// caller falls through to whatever auth path is appropriate
// (master-key with RELAY_API_KEY, or the dev-hatch).

const NONCE_HEADER = "x-voiceclaw-nonce"
const REQUEST_TIMEOUT_MS = 2_000

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

function getBridgeConfig(): { url: string; nonce: string } | null {
  const url = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL?.trim()
  const nonce = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE?.trim()
  if (!url || !nonce) return null
  return { url: url.replace(/\/$/, ""), nonce }
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
