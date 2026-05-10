import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Row = { value: string } | undefined
const settings = new Map<string, string>()

const fakeStmt = {
  get: (key: string): Row => {
    const value = settings.get(key)
    return value === undefined ? undefined : { value }
  },
  run: (...args: unknown[]) => {
    if (args.length === 1) {
      settings.delete(String(args[0]))
      return
    }
    if (args.length >= 2) {
      const key = String(args[0])
      const value = String(args[1])
      settings.set(key, value)
    }
  },
  all: () => Array.from(settings.entries()).map(([key, value]) => ({ key, value })),
}

const fakeDb = {
  exec: () => undefined,
  prepare: () => fakeStmt,
}

vi.mock('./db', () => ({
  getDb: () => fakeDb,
}))

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/voiceclaw-onboarding-test',
  },
}))

describe('ensureBundledRelayDefaults', () => {
  beforeEach(() => {
    settings.clear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('mints and persists a uuid when no api key is stored', async () => {
    const { ensureBundledRelayDefaults } = await import('./onboarding')
    const result = ensureBundledRelayDefaults()
    expect(result.relayApiKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(settings.get('realtime_api_key')).toBe(result.relayApiKey)
  })

  it('returns the existing key on a second call without rotating it', async () => {
    settings.set('realtime_api_key', 'preexisting-uuid')
    const { ensureBundledRelayDefaults } = await import('./onboarding')
    const result = ensureBundledRelayDefaults()
    expect(result.relayApiKey).toBe('preexisting-uuid')
    expect(settings.get('realtime_api_key')).toBe('preexisting-uuid')
  })

  it('rotates the key and clears realtime_server_url when force=true', async () => {
    settings.set('realtime_api_key', 'old-uuid')
    settings.set('realtime_server_url', 'ws://example.com/ws')
    const { ensureBundledRelayDefaults } = await import('./onboarding')
    const result = ensureBundledRelayDefaults({ force: true })
    expect(result.relayApiKey).not.toBe('old-uuid')
    expect(result.relayApiKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(settings.has('realtime_server_url')).toBe(false)
  })
})

describe('getOnboardingState — step migration', () => {
  beforeEach(() => {
    settings.clear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("remaps a stored 'testcall' cursor to 'introduction'", async () => {
    const { getOnboardingState } = await import('./onboarding')
    const originalGet = fakeStmt.get
    fakeStmt.get = ((..._args: unknown[]) => ({
      currentStep: 'testcall',
      payload: '{}',
      completedAt: null,
    })) as typeof fakeStmt.get
    try {
      const state = getOnboardingState()
      expect(state.currentStep).toBe('introduction')
    } finally {
      fakeStmt.get = originalGet
    }
  })
})

describe('getBundledRelayApiKey', () => {
  beforeEach(() => {
    settings.clear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('returns null when nothing has been seeded yet', async () => {
    const { getBundledRelayApiKey } = await import('./onboarding')
    expect(getBundledRelayApiKey()).toBeNull()
  })

  it('returns the seeded key when present', async () => {
    settings.set('realtime_api_key', 'baked')
    const { getBundledRelayApiKey } = await import('./onboarding')
    expect(getBundledRelayApiKey()).toBe('baked')
  })
})
