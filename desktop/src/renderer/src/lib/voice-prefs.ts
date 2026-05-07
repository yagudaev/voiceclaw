import { getSetting, setSetting } from './db'

export const GEMINI_VOICES = [
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Aoede',
  'Leda',
  'Orus',
  'Zephyr',
] as const

export const XAI_VOICES = ['eve', 'ara', 'rex', 'sal', 'leo'] as const

// OpenAI Realtime GA voices. `marin` and `cedar` were added with GA and
// are noticeably warmer than the legacy TTS-1 set; the rest carry over.
export const OPENAI_VOICES = [
  'marin',
  'cedar',
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
] as const

export type GeminiVoice = typeof GEMINI_VOICES[number]
export type XAIVoice = typeof XAI_VOICES[number]
export type OpenAIVoice = typeof OPENAI_VOICES[number]
export type ProviderId = 'gemini' | 'xai' | 'openai'

export const VOICES_BY_PROVIDER_KEY = 'realtime_voices_by_provider'
export const LEGACY_VOICE_KEY = 'realtime_voice'

export const DEFAULT_VOICES: Record<ProviderId, string> = {
  gemini: 'Zephyr',
  xai: 'ara',
  openai: 'marin',
}

export function providerForModel(model: string | null | undefined): ProviderId {
  if (model && model.startsWith('grok-voice-')) return 'xai'
  if (model && model.startsWith('gpt-realtime')) return 'openai'
  return 'gemini'
}

export function isVoiceForProvider(provider: ProviderId, voice: string): boolean {
  if (provider === 'xai') return (XAI_VOICES as readonly string[]).includes(voice)
  if (provider === 'openai') return (OPENAI_VOICES as readonly string[]).includes(voice)
  return (GEMINI_VOICES as readonly string[]).includes(voice)
}

export function defaultVoiceFor(provider: ProviderId): string {
  return DEFAULT_VOICES[provider]
}

export async function loadVoicesByProvider(): Promise<Record<string, string>> {
  const raw = await getSetting(VOICES_BY_PROVIDER_KEY)
  const parsed = parseVoicesByProvider(raw)
  if (parsed) return parsed
  // One-time migration: seed the new map from the legacy single-value
  // voice setting if present. Only the provider whose catalog matches
  // the legacy value gets its previous selection preserved.
  const legacy = await getSetting(LEGACY_VOICE_KEY)
  const seeded = seedFromLegacy(legacy)
  if (Object.keys(seeded).length > 0) {
    await setSetting(VOICES_BY_PROVIDER_KEY, JSON.stringify(seeded))
  }
  return seeded
}

export async function getVoiceForProvider(provider: ProviderId): Promise<string> {
  const map = await loadVoicesByProvider()
  const stored = map[provider]
  if (stored && isVoiceForProvider(provider, stored)) return stored
  return defaultVoiceFor(provider)
}

export async function setVoiceForProvider(provider: ProviderId, voice: string): Promise<void> {
  const map = await loadVoicesByProvider()
  const next = { ...map, [provider]: voice }
  await setSetting(VOICES_BY_PROVIDER_KEY, JSON.stringify(next))
  // Mirror to the legacy key so any reader that hasn't migrated yet
  // (older code paths, on-disk inspection) still sees the active voice.
  await setSetting(LEGACY_VOICE_KEY, voice)
}

function parseVoicesByProvider(raw: string | null): Record<string, string> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  } catch {
    return null
  }
}

function seedFromLegacy(legacy: string | null): Record<string, string> {
  if (!legacy) return {}
  if (isVoiceForProvider('gemini', legacy)) return { gemini: legacy }
  if (isVoiceForProvider('xai', legacy)) return { xai: legacy }
  if (isVoiceForProvider('openai', legacy)) return { openai: legacy }
  return {}
}
