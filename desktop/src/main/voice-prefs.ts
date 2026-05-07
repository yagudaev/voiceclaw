import { getDb } from './db'

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

export type ProviderId = 'gemini' | 'xai' | 'openai'

export const VOICES_BY_PROVIDER_KEY = 'realtime_voices_by_provider'
export const LEGACY_VOICE_KEY = 'realtime_voice'
export const ACTIVE_MODEL_KEY = 'realtime_model'

export function providerForModel(model: string | null | undefined): ProviderId {
  if (model && model.startsWith('grok-voice-')) return 'xai'
  if (model && model.startsWith('gpt-realtime')) return 'openai'
  return 'gemini'
}

export function providerForVoice(voice: string): ProviderId | null {
  if ((GEMINI_VOICES as readonly string[]).includes(voice)) return 'gemini'
  if ((XAI_VOICES as readonly string[]).includes(voice)) return 'xai'
  if ((OPENAI_VOICES as readonly string[]).includes(voice)) return 'openai'
  return null
}

export function setVoiceForProviderSync(provider: ProviderId, voice: string): void {
  const db = getDb()
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
  )
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(VOICES_BY_PROVIDER_KEY) as { value: string } | undefined
  const map = parseVoicesByProvider(row?.value)
  map[provider] = voice
  const next = JSON.stringify(map)
  upsert.run(VOICES_BY_PROVIDER_KEY, next, next)
  upsert.run(LEGACY_VOICE_KEY, voice, voice)
}

export function getActiveProvider(): ProviderId {
  const db = getDb()
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(ACTIVE_MODEL_KEY) as { value: string } | undefined
  return providerForModel(row?.value ?? null)
}

function parseVoicesByProvider(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  } catch {
    return {}
  }
}
