import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const writes: { path: string; content: string }[] = []
const fileSystem = new Map<string, string>()

vi.mock('fs', () => ({
  existsSync: (path: string) => fileSystem.has(path),
  mkdirSync: () => undefined,
  readFileSync: (path: string) => fileSystem.get(path) ?? '',
  writeFileSync: (path: string, content: string) => {
    writes.push({ path, content })
    fileSystem.set(path, content)
  },
}))

vi.mock('node:fs/promises', () => ({
  mkdir: async () => undefined,
  readFile: async (path: string) => {
    if (!fileSystem.has(path)) {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    }
    return fileSystem.get(path) ?? ''
  },
  writeFile: async (path: string, content: string) => {
    writes.push({ path, content })
    fileSystem.set(path, content)
  },
}))

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/voiceclaw-identity-test',
  },
  net: {
    fetch: () => {
      throw new Error('net.fetch not stubbed in this test')
    },
  },
}))

describe('writeAgentIdentity', () => {
  beforeEach(() => {
    writes.length = 0
    fileSystem.clear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('renders all four required fields with the user-supplied values', async () => {
    const { writeAgentIdentity } = await import('./identity')
    const result = writeAgentIdentity({
      name: 'Pam',
      description: 'Friendly and calm.',
      voice: 'Aoede',
    })
    expect(result.name).toBe('Pam')
    expect(result.description).toBe('Friendly and calm.')
    expect(result.voice).toBe('Aoede')
    expect(writes[0].content).toContain('**Name:** Pam')
    expect(writes[0].content).toContain('**Vibe:** Friendly and calm.')
    expect(writes[0].content).toContain('**Voice:** Aoede')
    expect(writes[0].content).toContain('**Creature:** Personal voice companion')
  })

  it('falls back to defaults when fields are blank', async () => {
    const { writeAgentIdentity, DEFAULT_IDENTITY } = await import('./identity')
    const result = writeAgentIdentity({})
    expect(result.name).toBe(DEFAULT_IDENTITY.name)
    expect(result.description).toBe(DEFAULT_IDENTITY.description)
    expect(result.voice).toBe(DEFAULT_IDENTITY.voice)
    expect(writes[0].content).toContain(`**Name:** ${DEFAULT_IDENTITY.name}`)
  })

  it('trims whitespace and tolerates partial patches', async () => {
    const { writeAgentIdentity, DEFAULT_IDENTITY } = await import('./identity')
    const result = writeAgentIdentity({ name: '  Beatrix  ', voice: 'Kore' })
    expect(result.name).toBe('Beatrix')
    expect(result.voice).toBe('Kore')
    expect(result.description).toBe(DEFAULT_IDENTITY.description)
  })
})

describe('readAgentIdentity', () => {
  beforeEach(() => {
    writes.length = 0
    fileSystem.clear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('returns defaults when no IDENTITY.md exists', async () => {
    const { readAgentIdentity, DEFAULT_IDENTITY } = await import('./identity')
    const id = readAgentIdentity()
    expect(id).toEqual(DEFAULT_IDENTITY)
  })

  it('parses Name / Vibe / Voice fields from a written file', async () => {
    const { writeAgentIdentity, readAgentIdentity } = await import('./identity')
    writeAgentIdentity({ name: 'Sage', description: 'Quiet and dry.', voice: 'Charon' })
    const id = readAgentIdentity()
    expect(id.name).toBe('Sage')
    expect(id.description).toBe('Quiet and dry.')
    expect(id.voice).toBe('Charon')
  })
})

describe('getCachedVoicePreview', () => {
  let fetchCalls: { url: string; init?: RequestInit }[] = []

  beforeEach(() => {
    writes.length = 0
    fileSystem.clear()
    fetchCalls = []
    vi.doMock('electron', () => ({
      app: {
        getPath: () => '/tmp/voiceclaw-identity-test',
      },
      net: {
        fetch: async (url: string, init?: RequestInit) => {
          fetchCalls.push({ url, init })
          return {
            ok: true,
            json: async () => ({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        inlineData: {
                          data: 'BASE64DATA',
                          mimeType: 'audio/L16;rate=24000',
                        },
                      },
                    ],
                  },
                },
              ],
            }),
            text: async () => '',
          }
        },
      },
    }))
  })

  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('electron')
  })

  it('generates and caches the preview on first request', async () => {
    const { getCachedVoicePreview } = await import('./identity')
    const result = await getCachedVoicePreview({ apiKey: 'test-key', voice: 'Zephyr' })
    expect(result).toEqual({
      ok: true,
      audioBase64: 'BASE64DATA',
      mimeType: 'audio/L16;rate=24000',
    })
    expect(fetchCalls).toHaveLength(1)
    // Cache file written next to identity files
    const cacheWrite = writes.find((w) => w.path.includes('voice-previews'))
    expect(cacheWrite).toBeDefined()
    expect(cacheWrite?.path).toContain('Zephyr.json')
  })

  it('reuses the cached clip on subsequent calls without hitting the network', async () => {
    const { getCachedVoicePreview } = await import('./identity')
    await getCachedVoicePreview({ apiKey: 'test-key', voice: 'Zephyr' })
    expect(fetchCalls).toHaveLength(1)
    const second = await getCachedVoicePreview({ apiKey: 'test-key', voice: 'Zephyr' })
    expect(second).toEqual({
      ok: true,
      audioBase64: 'BASE64DATA',
      mimeType: 'audio/L16;rate=24000',
    })
    // No additional network call
    expect(fetchCalls).toHaveLength(1)
  })

  it('serves cached previews even when the API key is missing', async () => {
    const { getCachedVoicePreview } = await import('./identity')
    await getCachedVoicePreview({ apiKey: 'test-key', voice: 'Kore' })
    expect(fetchCalls).toHaveLength(1)
    const second = await getCachedVoicePreview({ apiKey: null, voice: 'Kore' })
    expect(second).toEqual({
      ok: true,
      audioBase64: 'BASE64DATA',
      mimeType: 'audio/L16;rate=24000',
    })
    expect(fetchCalls).toHaveLength(1)
  })

  it('returns an error when no cache is present and no API key is configured', async () => {
    const { getCachedVoicePreview } = await import('./identity')
    const result = await getCachedVoicePreview({ apiKey: null, voice: 'Aoede' })
    expect(result.ok).toBe(false)
    expect(fetchCalls).toHaveLength(0)
  })

  it('keeps separate cache entries per voice', async () => {
    const { getCachedVoicePreview } = await import('./identity')
    await getCachedVoicePreview({ apiKey: 'test-key', voice: 'Puck' })
    await getCachedVoicePreview({ apiKey: 'test-key', voice: 'Charon' })
    expect(fetchCalls).toHaveLength(2)
    const cacheWrites = writes.filter((w) => w.path.includes('voice-previews'))
    const paths = cacheWrites.map((w) => w.path)
    expect(paths.some((p) => p.includes('Puck.json'))).toBe(true)
    expect(paths.some((p) => p.includes('Charon.json'))).toBe(true)
  })

  it('coalesces concurrent first-clicks for the same voice into one TTS call', async () => {
    const { getCachedVoicePreview } = await import('./identity')
    const [a, b, c] = await Promise.all([
      getCachedVoicePreview({ apiKey: 'test-key', voice: 'Leda' }),
      getCachedVoicePreview({ apiKey: 'test-key', voice: 'Leda' }),
      getCachedVoicePreview({ apiKey: 'test-key', voice: 'Leda' }),
    ])
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    expect(c.ok).toBe(true)
    // All three resolve with the same payload but only one network call ran.
    expect(fetchCalls).toHaveLength(1)
  })
})
