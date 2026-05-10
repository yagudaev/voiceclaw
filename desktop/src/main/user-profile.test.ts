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
    getPath: () => '/tmp/voiceclaw-user-profile-test',
    getAppPath: () => '/tmp/voiceclaw-app-path',
    isPackaged: false,
  },
  net: {
    fetch: () => {
      throw new Error('net.fetch not stubbed in this test')
    },
  },
}))

vi.mock('./db', () => ({
  getDb: () => {
    throw new Error('getDb not stubbed in user-profile tests')
  },
}))

describe('writeUserProfile', () => {
  beforeEach(() => {
    writes.length = 0
    fileSystem.clear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('writes Name and About sections to USER.md', async () => {
    const { writeUserProfile, getUserProfilePath } = await import('./user-profile')
    const result = writeUserProfile({ name: 'Michael', bio: 'I build voice agents.' })
    expect(result.name).toBe('Michael')
    expect(result.bio).toBe('I build voice agents.')
    expect(writes).toHaveLength(1)
    expect(writes[0].path).toBe(getUserProfilePath())
    expect(writes[0].content).toContain('## Name\nMichael')
    expect(writes[0].content).toContain('## About\nI build voice agents.')
  })

  it('falls back to defaults when fields are blank', async () => {
    const { writeUserProfile, DEFAULT_USER } = await import('./user-profile')
    const result = writeUserProfile({})
    expect(result.name).toBe(DEFAULT_USER.name)
    expect(result.bio).toBe(DEFAULT_USER.bio)
    expect(writes[0].content).toContain('## Name\nFriend')
    expect(writes[0].content).toContain('## About\n_(not provided)_')
  })

  it('trims whitespace on inputs', async () => {
    const { writeUserProfile } = await import('./user-profile')
    const result = writeUserProfile({ name: '  Mike  ', bio: '  Hi.  ' })
    expect(result.name).toBe('Mike')
    expect(result.bio).toBe('Hi.')
  })
})

describe('readUserProfile', () => {
  beforeEach(() => {
    writes.length = 0
    fileSystem.clear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('returns defaults when no USER.md exists', async () => {
    const { readUserProfile, DEFAULT_USER } = await import('./user-profile')
    expect(readUserProfile()).toEqual(DEFAULT_USER)
  })

  it('round-trips a written profile', async () => {
    const { writeUserProfile, readUserProfile } = await import('./user-profile')
    writeUserProfile({ name: 'Sage', bio: 'Quiet mornings.' })
    const profile = readUserProfile()
    expect(profile.name).toBe('Sage')
    expect(profile.bio).toBe('Quiet mornings.')
  })

  it('treats the placeholder bio as empty', async () => {
    const { writeUserProfile, readUserProfile, DEFAULT_USER } = await import('./user-profile')
    writeUserProfile({ name: 'Alex' })
    const profile = readUserProfile()
    expect(profile.name).toBe('Alex')
    expect(profile.bio).toBe(DEFAULT_USER.bio)
  })

  it('preserves multi-line bio bodies', async () => {
    const { writeUserProfile, readUserProfile } = await import('./user-profile')
    const bio = 'Line one.\nLine two.'
    writeUserProfile({ name: 'Beatrix', bio })
    expect(readUserProfile().bio).toBe(bio)
  })
})
