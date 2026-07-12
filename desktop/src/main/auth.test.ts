import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function waitForCondition(check: () => void, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      check()
      return
    } catch {
      await new Promise((r) => setTimeout(r, 10))
    }
  }
  check()
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const openExternalCalls: string[] = []
const openUrlHandlers: Array<(event: { preventDefault: () => void }, url: string) => void> = []
const setAsDefaultProtocolClientCalls: string[] = []
const sendCalls: Array<{ channel: string; payload: unknown }> = []
const dbRuns: Array<unknown[]> = []

const fakeDb = {
  prepare: () => ({
    run: (...args: unknown[]) => {
      dbRuns.push(args)
    },
  }),
}

vi.mock('./db', () => ({ getDb: () => fakeDb }))

vi.mock('./onboarding', () => ({ ensureOnboardingSchema: () => undefined }))

vi.mock('./window-lifecycle', () => ({
  getMainWindow: () => ({
    webContents: {
      send: (channel: string, payload: unknown) => {
        sendCalls.push({ channel, payload })
      },
    },
  }),
}))

let mockFetchResponse: { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> } = {
  ok: true,
  status: 200,
  text: async () => '',
  json: async () => ({
    token: 'tok_abc',
    device: { id: 'dev1', label: 'VoiceClaw Desktop', platform: 'desktop-macos' },
    user: { id: 'usr1', email: 'test@example.com', name: 'Test User' },
  }),
}

vi.mock('electron', () => ({
  app: {
    setAsDefaultProtocolClient: (scheme: string) => {
      setAsDefaultProtocolClientCalls.push(scheme)
    },
    on: (event: string, handler: (event: { preventDefault: () => void }, url: string) => void) => {
      if (event === 'open-url') openUrlHandlers.push(handler)
    },
    getPath: () => '/tmp/voiceclaw-auth-test',
  },
  net: {
    fetch: (_url: string, _opts: unknown) => Promise.resolve(mockFetchResponse),
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s),
  },
  shell: {
    openExternal: (url: string) => {
      openExternalCalls.push(url)
      return Promise.resolve()
    },
  },
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('startSignInFlow', () => {
  beforeEach(() => {
    openExternalCalls.length = 0
    delete process.env.VOICECLAW_AUTH_BASE_URL
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('opens the google start URL with target=desktop', async () => {
    const { startSignInFlow } = await import('./auth')
    startSignInFlow('google')
    expect(openExternalCalls[0]).toBe(
      'https://cloud.getvoiceclaw.com/api/auth/google/start?target=desktop',
    )
  })

  it('respects VOICECLAW_AUTH_BASE_URL override', async () => {
    process.env.VOICECLAW_AUTH_BASE_URL = 'http://localhost:3000'
    const { startSignInFlow } = await import('./auth')
    startSignInFlow('google')
    expect(openExternalCalls[0]).toBe(
      'http://localhost:3000/api/auth/google/start?target=desktop',
    )
  })
})

describe('registerAuthDeepLink + deep-link handling', () => {
  beforeEach(() => {
    openUrlHandlers.length = 0
    sendCalls.length = 0
    dbRuns.length = 0
    setAsDefaultProtocolClientCalls.length = 0
    mockFetchResponse = {
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        token: 'tok_abc',
        device: { id: 'dev1', label: 'VoiceClaw Desktop', platform: 'desktop-macos' },
        user: { id: 'usr1', email: 'test@example.com', name: 'Test User' },
      }),
    }
    delete process.env.VOICECLAW_AUTH_BASE_URL
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('registers the voiceclaw scheme with setAsDefaultProtocolClient', async () => {
    const { registerAuthDeepLink } = await import('./auth')
    registerAuthDeepLink()
    expect(setAsDefaultProtocolClientCalls).toContain('voiceclaw')
  })

  it('sends auth-callback success when ticket redeems ok', async () => {
    const { registerAuthDeepLink } = await import('./auth')
    registerAuthDeepLink()

    const handler = openUrlHandlers[0]
    expect(handler).toBeDefined()
    handler({ preventDefault: () => undefined }, 'voiceclaw://auth/callback?ticket=abc123')

    await waitForCondition(() => expect(sendCalls).toHaveLength(1))
    expect(sendCalls[0]).toEqual({
      channel: 'onboarding:auth-callback',
      payload: { ok: true, user: { id: 'usr1', email: 'test@example.com', name: 'Test User' } },
    })
  })

  it('sends auth-callback error when server returns 501', async () => {
    mockFetchResponse = {
      ok: false,
      status: 501,
      text: async () => '{"error":"not_configured"}',
      json: async () => ({ error: 'not_configured' }),
    }

    const { registerAuthDeepLink } = await import('./auth')
    registerAuthDeepLink()

    openUrlHandlers[0]!({ preventDefault: () => undefined }, 'voiceclaw://auth/callback?ticket=abc123')

    await waitForCondition(() => expect(sendCalls).toHaveLength(1))
    expect(sendCalls[0]).toMatchObject({
      channel: 'onboarding:auth-callback',
      payload: { ok: false, error: expect.stringContaining('redeem_failed_501') },
    })
  })

  it('sends auth-callback error when ticket is missing from deep link', async () => {
    const { registerAuthDeepLink } = await import('./auth')
    registerAuthDeepLink()

    openUrlHandlers[0]!({ preventDefault: () => undefined }, 'voiceclaw://auth/callback')

    await waitForCondition(() => expect(sendCalls).toHaveLength(1))
    expect(sendCalls[0]).toEqual({
      channel: 'onboarding:auth-callback',
      payload: { ok: false, error: 'missing_ticket' },
    })
  })

  it('sends auth-callback error when deep link carries an error param', async () => {
    const { registerAuthDeepLink } = await import('./auth')
    registerAuthDeepLink()

    openUrlHandlers[0]!(
      { preventDefault: () => undefined },
      'voiceclaw://auth/callback?error=state_mismatch',
    )

    await waitForCondition(() => expect(sendCalls).toHaveLength(1))
    expect(sendCalls[0]).toEqual({
      channel: 'onboarding:auth-callback',
      payload: { ok: false, error: 'state_mismatch' },
    })
  })

  it('silently ignores deep links on unrelated paths', async () => {
    const { registerAuthDeepLink } = await import('./auth')
    registerAuthDeepLink()

    openUrlHandlers[0]!({ preventDefault: () => undefined }, 'voiceclaw://other/path?foo=bar')

    await new Promise((r) => setTimeout(r, 30))
    expect(sendCalls).toHaveLength(0)
  })

  it('silently ignores deep links with wrong scheme', async () => {
    const { registerAuthDeepLink } = await import('./auth')
    registerAuthDeepLink()

    openUrlHandlers[0]!({ preventDefault: () => undefined }, 'https://getvoiceclaw.com/auth/callback?ticket=abc')

    await new Promise((r) => setTimeout(r, 30))
    expect(sendCalls).toHaveLength(0)
  })
})
