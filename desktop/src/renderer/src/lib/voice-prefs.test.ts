import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const settings = new Map<string, string>()

vi.mock('./db', () => ({
  getSetting: vi.fn(async (key: string) => settings.get(key) ?? null),
  setSetting: vi.fn(async (key: string, value: string) => {
    settings.set(key, value)
  }),
}))

import {
  defaultVoiceFor,
  getVoiceForProvider,
  isVoiceForProvider,
  loadVoicesByProvider,
  providerForModel,
  setVoiceForProvider,
} from './voice-prefs'

beforeEach(() => {
  settings.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('providerForModel', () => {
  it('maps grok models to xai', () => {
    expect(providerForModel('grok-voice-think-fast-1.0')).toBe('xai')
  })

  it('maps gpt-realtime models to openai', () => {
    expect(providerForModel('gpt-realtime-2')).toBe('openai')
    expect(providerForModel('gpt-realtime-mini')).toBe('openai')
    expect(providerForModel('gpt-realtime')).toBe('openai')
  })

  it('maps gemini models (and unknown) to gemini', () => {
    expect(providerForModel('gemini-3.1-flash-live-preview')).toBe('gemini')
    expect(providerForModel(null)).toBe('gemini')
    expect(providerForModel(undefined)).toBe('gemini')
  })
})

describe('defaultVoiceFor', () => {
  it('defaults Grok to ara', () => {
    expect(defaultVoiceFor('xai')).toBe('ara')
  })

  it('defaults Gemini to Zephyr', () => {
    expect(defaultVoiceFor('gemini')).toBe('Zephyr')
  })

  it('defaults OpenAI to marin', () => {
    expect(defaultVoiceFor('openai')).toBe('marin')
  })
})

describe('isVoiceForProvider', () => {
  it('matches voices to their provider', () => {
    expect(isVoiceForProvider('gemini', 'Zephyr')).toBe(true)
    expect(isVoiceForProvider('gemini', 'ara')).toBe(false)
    expect(isVoiceForProvider('xai', 'ara')).toBe(true)
    expect(isVoiceForProvider('xai', 'Zephyr')).toBe(false)
    expect(isVoiceForProvider('openai', 'marin')).toBe(true)
    expect(isVoiceForProvider('openai', 'cedar')).toBe(true)
    expect(isVoiceForProvider('openai', 'Zephyr')).toBe(false)
  })
})

describe('per-provider voice persistence', () => {
  it('returns the provider default when nothing is stored', async () => {
    expect(await getVoiceForProvider('xai')).toBe('ara')
    expect(await getVoiceForProvider('gemini')).toBe('Zephyr')
  })

  it('round-trips a voice through set/get for a provider', async () => {
    await setVoiceForProvider('xai', 'rex')
    await setVoiceForProvider('gemini', 'Puck')
    expect(await getVoiceForProvider('xai')).toBe('rex')
    expect(await getVoiceForProvider('gemini')).toBe('Puck')
  })

  it('keeps each providers voice independent across switches', async () => {
    await setVoiceForProvider('gemini', 'Aoede')
    await setVoiceForProvider('xai', 'leo')
    await setVoiceForProvider('gemini', 'Charon')
    expect(await getVoiceForProvider('xai')).toBe('leo')
    expect(await getVoiceForProvider('gemini')).toBe('Charon')
  })

  it('falls back to default when stored value is not in providers catalog', async () => {
    settings.set('realtime_voices_by_provider', JSON.stringify({ xai: 'Zephyr' }))
    expect(await getVoiceForProvider('xai')).toBe('ara')
  })
})

describe('legacy migration', () => {
  it('seeds the new map from a Gemini-flavoured legacy value', async () => {
    settings.set('realtime_voice', 'Aoede')
    const map = await loadVoicesByProvider()
    expect(map).toEqual({ gemini: 'Aoede' })
    expect(settings.get('realtime_voices_by_provider')).toBe(
      JSON.stringify({ gemini: 'Aoede' }),
    )
  })

  it('seeds the new map from a Grok-flavoured legacy value', async () => {
    settings.set('realtime_voice', 'rex')
    const map = await loadVoicesByProvider()
    expect(map).toEqual({ xai: 'rex' })
  })

  it('only seeds once — does not overwrite the new key after migration', async () => {
    settings.set('realtime_voice', 'Aoede')
    await loadVoicesByProvider()
    await setVoiceForProvider('xai', 'sal')
    settings.set('realtime_voice', 'Zephyr')
    const map = await loadVoicesByProvider()
    expect(map).toEqual({ gemini: 'Aoede', xai: 'sal' })
  })

  it('ignores malformed JSON and falls back to legacy/defaults', async () => {
    settings.set('realtime_voices_by_provider', 'not json')
    settings.set('realtime_voice', 'leo')
    expect(await getVoiceForProvider('xai')).toBe('leo')
  })
})
