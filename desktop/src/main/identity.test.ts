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
  readFile: async (path: string, encoding?: string) => {
    if (!fileSystem.has(path)) {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    }
    const value = fileSystem.get(path) ?? ''
    if (encoding === 'utf8' || encoding === 'utf-8') return value
    return Buffer.from(value, 'utf8')
  },
  writeFile: async (path: string, content: string) => {
    writes.push({ path, content })
    fileSystem.set(path, content)
  },
}))

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/voiceclaw-identity-test',
    getAppPath: () => '/tmp/voiceclaw-app-path',
    isPackaged: false,
  },
  net: {
    fetch: () => {
      throw new Error('net.fetch not stubbed in this test')
    },
  },
}))

// voice-prefs imports './db' which transitively pulls in better-sqlite3.
// providerForVoice (the only function we use here) is pure, so stub the
// db module to keep this test isolated from the native binding.
vi.mock('./db', () => ({
  getDb: () => {
    throw new Error('getDb not stubbed in identity tests')
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
        getAppPath: () => '/tmp/voiceclaw-app-path',
        isPackaged: false,
      },
      net: {
        fetch: async (url: string, init?: RequestInit) => {
          fetchCalls.push({ url, init })
          throw new Error('net.fetch must NOT be called from getCachedVoicePreview')
        },
      },
    }))
  })

  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('electron')
  })

  it('reads bundled Gemini WAVs without ever hitting the network', async () => {
    const wavBytes = 'PRETEND-GEMINI-WAV-BYTES'
    fileSystem.set(
      '/tmp/voiceclaw-app-path/resources/voice-previews/gemini/Zephyr.wav',
      wavBytes,
    )
    const { getCachedVoicePreview } = await import('./identity')
    const result = await getCachedVoicePreview({ voice: 'Zephyr' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mimeType).toBe('audio/wav')
      expect(Buffer.from(result.audioBase64, 'base64').toString('utf8')).toBe(wavBytes)
    }
    expect(fetchCalls).toHaveLength(0)
  })

  it('reads bundled xAI WAVs without ever hitting the network', async () => {
    const wavBytes = 'PRETEND-XAI-WAV-BYTES'
    fileSystem.set('/tmp/voiceclaw-app-path/resources/voice-previews/xai/eve.wav', wavBytes)
    const { getCachedVoicePreview } = await import('./identity')
    const result = await getCachedVoicePreview({ voice: 'eve' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mimeType).toBe('audio/wav')
      expect(Buffer.from(result.audioBase64, 'base64').toString('utf8')).toBe(wavBytes)
    }
    expect(fetchCalls).toHaveLength(0)
  })

  it('does not write any files (no userData lazy cache)', async () => {
    fileSystem.set('/tmp/voiceclaw-app-path/resources/voice-previews/gemini/Puck.wav', 'a')
    fileSystem.set('/tmp/voiceclaw-app-path/resources/voice-previews/xai/rex.wav', 'b')
    const { getCachedVoicePreview } = await import('./identity')
    await getCachedVoicePreview({ voice: 'Puck' })
    await getCachedVoicePreview({ voice: 'rex' })
    expect(writes.filter((w) => w.path.includes('voice-previews'))).toHaveLength(0)
  })

  it('returns an error when a bundled preview is missing', async () => {
    const { getCachedVoicePreview } = await import('./identity')
    const result = await getCachedVoicePreview({ voice: 'Aoede' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Aoede/)
    expect(fetchCalls).toHaveLength(0)
  })

  it('returns an error for an unknown voice', async () => {
    const { getCachedVoicePreview } = await import('./identity')
    const result = await getCachedVoicePreview({ voice: 'NotAVoice' })
    expect(result.ok).toBe(false)
    expect(fetchCalls).toHaveLength(0)
  })
})
