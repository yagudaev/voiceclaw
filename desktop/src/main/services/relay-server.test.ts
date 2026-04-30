import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const isPackagedRef = { value: false }
const existsRef = { fn: (_p: string) => false as boolean }
const tokenRef = { value: null as string | null }
const providerKeysRef = { fn: (_p: 'gemini' | 'openai' | 'xai') => null as string | null }
const bundledRelayKeyRef = { value: null as string | null }
const allocatedPortsRef = { openclawGateway: undefined as number | undefined }
let originalResourcesPath: string | undefined

vi.mock('electron', () => ({
  app: {
    get isPackaged(): boolean {
      return isPackagedRef.value
    },
  },
}))

vi.mock('../ports', () => ({
  allocatePort: vi.fn(),
  getAllocatedPorts: () => ({ ...allocatedPortsRef }),
}))

vi.mock('fs', () => ({
  existsSync: (path: string) => existsRef.fn(path),
}))

vi.mock('../provider-keys', () => ({
  getProviderKey: (provider: 'gemini' | 'openai' | 'xai') => providerKeysRef.fn(provider),
}))

vi.mock('../onboarding', () => ({
  getBundledRelayApiKey: () => bundledRelayKeyRef.value,
}))

vi.mock('./openclaw-gateway', () => ({
  readGatewayAuthToken: (_path: string) => tokenRef.value,
  getOpenClawConfigPath: () => '/tmp/openclaw.json',
}))

describe('resolveBundledRelayScript', () => {
  beforeEach(() => {
    originalResourcesPath = process.resourcesPath
    isPackagedRef.value = false
    existsRef.fn = () => false
  })

  afterEach(() => {
    if (originalResourcesPath !== undefined) {
      Object.defineProperty(process, 'resourcesPath', {
        value: originalResourcesPath,
        configurable: true,
      })
    }
    vi.resetModules()
  })

  it('returns packaged path when app.isPackaged and script exists', async () => {
    isPackagedRef.value = true
    Object.defineProperty(process, 'resourcesPath', {
      value: '/Applications/VoiceClaw.app/Contents/Resources',
      configurable: true,
    })
    existsRef.fn = (p: string) =>
      p === '/Applications/VoiceClaw.app/Contents/Resources/relay-server-bundle/dist/index.js'

    const { resolveBundledRelayScript } = await import('./relay-server')
    expect(resolveBundledRelayScript()).toBe(
      '/Applications/VoiceClaw.app/Contents/Resources/relay-server-bundle/dist/index.js',
    )
  })

  it('returns null in packaged mode when script is missing', async () => {
    isPackagedRef.value = true
    Object.defineProperty(process, 'resourcesPath', {
      value: '/Applications/VoiceClaw.app/Contents/Resources',
      configurable: true,
    })
    existsRef.fn = () => false

    const { resolveBundledRelayScript } = await import('./relay-server')
    expect(resolveBundledRelayScript()).toBeNull()
  })

  it('returns dev path when not packaged and script exists in resources/', async () => {
    isPackagedRef.value = false
    existsRef.fn = (p: string) => p.endsWith('/resources/relay-server-bundle/dist/index.js')

    const { resolveBundledRelayScript } = await import('./relay-server')
    const resolved = resolveBundledRelayScript()
    expect(resolved).not.toBeNull()
    expect(resolved!.endsWith('/resources/relay-server-bundle/dist/index.js')).toBe(true)
  })

  it('returns null in dev when script is absent (the common dev case)', async () => {
    isPackagedRef.value = false
    existsRef.fn = () => false

    const { resolveBundledRelayScript } = await import('./relay-server')
    expect(resolveBundledRelayScript()).toBeNull()
  })
})

describe('buildRelayEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    for (const k of Object.keys(process.env)) delete process.env[k]
    Object.assign(process.env, originalEnv)
    delete process.env.GEMINI_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.XAI_API_KEY
    delete process.env.BRAIN_GATEWAY_AUTH_TOKEN
    delete process.env.RELAY_API_KEY
    delete process.env.TAVILY_API_KEY
    tokenRef.value = null
    providerKeysRef.fn = () => null
    bundledRelayKeyRef.value = null
    allocatedPortsRef.openclawGateway = undefined
  })

  afterEach(() => {
    for (const k of Object.keys(process.env)) delete process.env[k]
    Object.assign(process.env, originalEnv)
    vi.resetModules()
  })

  it('forwards provider keys from the keychain when env is empty', async () => {
    providerKeysRef.fn = (p) => (p === 'gemini' ? 'gemini-secret' : null)
    const { buildRelayEnv } = await import('./relay-server')
    const env = buildRelayEnv()
    expect(env.GEMINI_API_KEY).toBe('gemini-secret')
    expect(env.OPENAI_API_KEY).toBeUndefined()
  })

  it('uses keychain as the only source of provider keys (env is not forwarded)', async () => {
    process.env.GEMINI_API_KEY = 'env-ignored'
    providerKeysRef.fn = (p) => (p === 'gemini' ? 'keychain-wins' : null)
    const { buildRelayEnv } = await import('./relay-server')
    const env = buildRelayEnv()
    expect(env.GEMINI_API_KEY).toBe('keychain-wins')
  })

  it('injects BRAIN_GATEWAY_AUTH_TOKEN from the openclaw config when env is empty', async () => {
    tokenRef.value = 'baked-token'
    const { buildRelayEnv } = await import('./relay-server')
    const env = buildRelayEnv()
    expect(env.BRAIN_GATEWAY_AUTH_TOKEN).toBe('baked-token')
  })

  it('does not override an explicit BRAIN_GATEWAY_AUTH_TOKEN env value', async () => {
    process.env.BRAIN_GATEWAY_AUTH_TOKEN = 'env-token'
    tokenRef.value = 'baked-token'
    const { buildRelayEnv } = await import('./relay-server')
    const env = buildRelayEnv()
    expect(env.BRAIN_GATEWAY_AUTH_TOKEN).toBe('env-token')
  })

  it('injects RELAY_API_KEY from the bundled-defaults store when env is empty', async () => {
    bundledRelayKeyRef.value = 'shared-secret-uuid'
    const { buildRelayEnv } = await import('./relay-server')
    const env = buildRelayEnv()
    expect(env.RELAY_API_KEY).toBe('shared-secret-uuid')
  })

  it('does not override an explicit RELAY_API_KEY env value', async () => {
    process.env.RELAY_API_KEY = 'env-relay-key'
    bundledRelayKeyRef.value = 'bundled-uuid'
    const { buildRelayEnv } = await import('./relay-server')
    const env = buildRelayEnv()
    expect(env.RELAY_API_KEY).toBe('env-relay-key')
  })

  it('injects BRAIN_GATEWAY_URL from the allocated openclaw port when env is unset', async () => {
    allocatedPortsRef.openclawGateway = 19876
    delete process.env.BRAIN_GATEWAY_URL
    const { buildRelayEnv } = await import('./relay-server')
    const env = buildRelayEnv()
    expect(env.BRAIN_GATEWAY_URL).toBe('http://127.0.0.1:19876')
  })

  it('does not override an explicit BRAIN_GATEWAY_URL env value', async () => {
    process.env.BRAIN_GATEWAY_URL = 'http://localhost:9999'
    allocatedPortsRef.openclawGateway = 19876
    const { buildRelayEnv } = await import('./relay-server')
    const env = buildRelayEnv()
    expect(env.BRAIN_GATEWAY_URL).toBe('http://localhost:9999')
  })

  it('leaves BRAIN_GATEWAY_URL unset when no openclaw port is allocated', async () => {
    allocatedPortsRef.openclawGateway = undefined
    delete process.env.BRAIN_GATEWAY_URL
    const { buildRelayEnv } = await import('./relay-server')
    const env = buildRelayEnv()
    expect(env.BRAIN_GATEWAY_URL).toBeUndefined()
  })
})
