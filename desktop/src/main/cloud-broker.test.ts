import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let storedTokenEnc: Buffer | null = null
const fakeDb = {
  prepare: (sql: string) => ({
    get: () => {
      if (!sql.includes('FROM devices')) return undefined
      if (storedTokenEnc === null) return undefined
      return { token_enc: storedTokenEnc }
    },
  }),
}

vi.mock('./db', () => ({ getDb: () => fakeDb }))
vi.mock('./onboarding', () => ({ ensureOnboardingSchema: () => undefined }))

let mockFetchResponse: {
  ok: boolean
  status: number
  headers: { get: (k: string) => string | null }
  text: () => Promise<string>
  json: () => Promise<unknown>
} = makeOkResponse({})

const fetchCalls: Array<{ url: string; opts: unknown }> = []

vi.mock('electron', () => ({
  net: {
    fetch: (url: string, opts: unknown) => {
      fetchCalls.push({ url, opts })
      return Promise.resolve(mockFetchResponse)
    },
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    decryptString: (b: Buffer) => b.toString('utf8'),
  },
}))

import {
  CLOUD_BASE_URL_DEFAULT,
  clearSessionTokenCacheForTests,
  fetchMe,
  fetchSessionToken,
  getCloudBaseUrl,
  getCurrentDeviceToken,
  isCloudModeAvailable,
} from './cloud-broker'

function makeOkResponse(json: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => '',
    json: async () => json,
  }
}

function makeErrResponse(status: number, json: unknown, retryAfter?: string) {
  const body = JSON.stringify(json)
  return {
    ok: false,
    status,
    headers: {
      get: (k: string) => (k.toLowerCase() === 'retry-after' ? (retryAfter ?? null) : null),
    },
    text: async () => body,
    json: async () => json,
  }
}

const DEFAULT_TOKEN_RESPONSE = {
  token: 'ephemeral-abc',
  model: 'gemini-live-2.5-flash-preview',
  newSessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  lifetimeSeconds: 900,
  tier: 'free',
  quota: {
    dailyCapSeconds: 900,
    secondsUsedToday: 900,
    secondsRemainingToday: 0,
  },
}

describe('cloud-broker', () => {
  beforeEach(() => {
    fetchCalls.length = 0
    storedTokenEnc = Buffer.from('device-jwt-token')
    mockFetchResponse = makeOkResponse(DEFAULT_TOKEN_RESPONSE)
    clearSessionTokenCacheForTests()
    delete process.env.VOICECLAW_AUTH_BASE_URL
  })

  afterEach(() => {
    storedTokenEnc = null
  })

  describe('config', () => {
    it('defaults to cloud.getvoiceclaw.com', () => {
      expect(getCloudBaseUrl()).toBe(CLOUD_BASE_URL_DEFAULT)
      expect(CLOUD_BASE_URL_DEFAULT).toBe('https://cloud.getvoiceclaw.com')
    })

    it('respects VOICECLAW_AUTH_BASE_URL override', () => {
      process.env.VOICECLAW_AUTH_BASE_URL = 'http://localhost:3456'
      expect(getCloudBaseUrl()).toBe('http://localhost:3456')
    })
  })

  describe('getCurrentDeviceToken', () => {
    it('decrypts the stored token', () => {
      expect(getCurrentDeviceToken()).toBe('device-jwt-token')
    })

    it('returns null when no device row exists', () => {
      storedTokenEnc = null
      expect(getCurrentDeviceToken()).toBeNull()
    })

    it('isCloudModeAvailable reflects whether a device token exists', () => {
      expect(isCloudModeAvailable()).toBe(true)
      storedTokenEnc = null
      expect(isCloudModeAvailable()).toBe(false)
    })
  })

  describe('fetchSessionToken', () => {
    it('happy path: fetches token, returns parsed dates', async () => {
      const result = await fetchSessionToken()
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.token).toBe('ephemeral-abc')
      expect(result.value.model).toBe('gemini-live-2.5-flash-preview')
      expect(result.value.tier).toBe('free')
      expect(result.value.lifetimeSeconds).toBe(900)
      expect(result.value.newSessionExpiresAt).toBeInstanceOf(Date)
    })

    it('sends Authorization: Bearer header with device token', async () => {
      await fetchSessionToken()
      expect(fetchCalls).toHaveLength(1)
      const opts = fetchCalls[0]!.opts as { headers: Record<string, string>; method: string }
      expect(opts.method).toBe('POST')
      expect(opts.headers.Authorization).toBe('Bearer device-jwt-token')
    })

    it('returns not_signed_in when no device token', async () => {
      storedTokenEnc = null
      const result = await fetchSessionToken()
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toBe('not_signed_in')
    })

    it('caches the token and serves a second call from cache', async () => {
      await fetchSessionToken()
      await fetchSessionToken()
      expect(fetchCalls).toHaveLength(1)
    })

    it('forceRefresh bypasses cache', async () => {
      await fetchSessionToken()
      await fetchSessionToken({ forceRefresh: true })
      expect(fetchCalls).toHaveLength(2)
    })

    it('surfaces 429 with retry-after as a structured error', async () => {
      mockFetchResponse = makeErrResponse(
        429,
        { error: 'quota_exhausted', retryAfterSeconds: 3600 },
        '3600',
      )
      const result = await fetchSessionToken()
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.status).toBe(429)
      expect(result.retryAfterSeconds).toBe(3600)
    })

    it('surfaces 401 (token expired or revoked)', async () => {
      mockFetchResponse = makeErrResponse(401, { error: 'invalid_token' })
      const result = await fetchSessionToken()
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.status).toBe(401)
    })

    it('coalesces concurrent calls', async () => {
      const a = fetchSessionToken()
      const b = fetchSessionToken()
      await Promise.all([a, b])
      expect(fetchCalls).toHaveLength(1)
    })
  })

  describe('fetchMe', () => {
    it('hits /api/auth/me with bearer', async () => {
      mockFetchResponse = makeOkResponse({
        user: { id: 'u1', email: 'a@b.co', name: null, tier: 'free', proUntil: null },
        device: { id: 'd1' },
        usage: {
          day: '2026-05-01',
          dailyCapSeconds: 900,
          secondsUsedToday: 0,
          secondsRemainingToday: 900,
          tokensMintedToday: 0,
          lastMintedAt: null,
        },
      })
      const result = await fetchMe()
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.user.tier).toBe('free')
      expect(fetchCalls[0]!.url).toContain('/api/auth/me')
    })

    it('returns not_signed_in without device token', async () => {
      storedTokenEnc = null
      const result = await fetchMe()
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toBe('not_signed_in')
    })
  })
})
