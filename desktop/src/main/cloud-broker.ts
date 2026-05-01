import { net, safeStorage } from 'electron'
import { getDb } from './db'
import { ensureOnboardingSchema } from './onboarding'

// Cloud-mode broker client.
//
// When the user opts into VoiceClaw Cloud, voiceclaw-cloud mints a
// short-lived Gemini Live ephemeral token on demand. This module
// fetches and caches it, refreshing before TTL expiry so a session
// never sees an expired token mid-call.
//
// The device_token issued at OAuth ticket-redeem (stored encrypted in
// SQLite via safeStorage) is the bearer credential.

export const CLOUD_BASE_URL_DEFAULT = 'https://cloud.getvoiceclaw.com'

const REFRESH_AT_FRACTION = 0.8

export type SessionToken = {
  token: string
  model: string
  newSessionExpiresAt: Date
  expiresAt: Date
  lifetimeSeconds: number
  tier: 'free' | 'pro'
  quota: {
    dailyCapSeconds: number
    secondsUsedToday: number
    secondsRemainingToday: number
  }
}

export type CloudMeResponse = {
  user: {
    id: string
    email: string
    name: string | null
    tier: 'free' | 'pro'
    proUntil: string | null
  }
  device: { id: string }
  usage: {
    day: string
    dailyCapSeconds: number
    secondsUsedToday: number
    secondsRemainingToday: number
    tokensMintedToday: number
    lastMintedAt: string | null
  }
}

export type FetchResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number }

type CachedToken = {
  token: SessionToken
  refreshAt: number
}

let cached: CachedToken | null = null
let inflight: Promise<FetchResult<SessionToken>> | null = null

export function getCloudBaseUrl(): string {
  return process.env.VOICECLAW_AUTH_BASE_URL ?? CLOUD_BASE_URL_DEFAULT
}

export function isCloudModeAvailable(): boolean {
  return getCurrentDeviceToken() !== null
}

export function getCurrentDeviceToken(): string | null {
  ensureOnboardingSchema()
  const db = getDb()
  const row = db
    .prepare(
      'SELECT token_enc FROM devices ORDER BY created_at DESC LIMIT 1',
    )
    .get() as { token_enc: Buffer } | undefined
  if (!row) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(row.token_enc)
  } catch {
    return null
  }
}

export async function fetchSessionToken(options: {
  forceRefresh?: boolean
} = {}): Promise<FetchResult<SessionToken>> {
  if (!options.forceRefresh && cached && Date.now() < cached.refreshAt) {
    return { ok: true, value: cached.token }
  }
  if (inflight) return inflight

  inflight = doFetch().finally(() => {
    inflight = null
  })
  return inflight
}

export async function fetchMe(): Promise<FetchResult<CloudMeResponse>> {
  const deviceToken = getCurrentDeviceToken()
  if (!deviceToken) {
    return { ok: false, status: 0, error: 'not_signed_in' }
  }
  const url = `${getCloudBaseUrl()}/api/auth/me`
  const response = await net.fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${deviceToken}` },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    return { ok: false, status: response.status, error: text.slice(0, 200) }
  }
  const body = (await response.json()) as CloudMeResponse
  return { ok: true, value: body }
}

export function clearSessionTokenCacheForTests(): void {
  cached = null
  inflight = null
}

async function doFetch(): Promise<FetchResult<SessionToken>> {
  const deviceToken = getCurrentDeviceToken()
  if (!deviceToken) {
    return { ok: false, status: 0, error: 'not_signed_in' }
  }
  const url = `${getCloudBaseUrl()}/api/gemini/session-token`
  const response = await net.fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${deviceToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after')
    const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined
    let errorBody = ''
    try {
      errorBody = await response.text()
    } catch {
      errorBody = ''
    }
    return {
      ok: false,
      status: response.status,
      error: errorBody.slice(0, 200),
      retryAfterSeconds,
    }
  }
  const raw = (await response.json()) as {
    token: string
    model: string
    newSessionExpiresAt: string
    expiresAt: string
    lifetimeSeconds: number
    tier: 'free' | 'pro'
    quota: {
      dailyCapSeconds: number
      secondsUsedToday: number
      secondsRemainingToday: number
    }
  }
  const token: SessionToken = {
    token: raw.token,
    model: raw.model,
    newSessionExpiresAt: new Date(raw.newSessionExpiresAt),
    expiresAt: new Date(raw.expiresAt),
    lifetimeSeconds: raw.lifetimeSeconds,
    tier: raw.tier,
    quota: raw.quota,
  }

  const now = Date.now()
  const window = token.newSessionExpiresAt.getTime() - now
  cached = {
    token,
    refreshAt: now + Math.max(5_000, Math.floor(window * REFRESH_AT_FRACTION)),
  }
  return { ok: true, value: token }
}
