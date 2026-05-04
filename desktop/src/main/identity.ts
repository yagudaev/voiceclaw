import { app, net } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export type AgentIdentity = {
  name: string
  description: string
  voice: string
}

export const DEFAULT_IDENTITY: AgentIdentity = {
  name: 'Pam',
  description: 'Friendly, calm, helps me stay on top of things.',
  voice: 'Zephyr',
}

// Static text used for the cached, non-personalized voice preview shown in
// Settings. Keep this stable — the cache key is implicitly tied to it, so
// changing this requires bumping CACHE_VERSION below.
const STATIC_PREVIEW_TEXT = "Hi, I'm here."
const CACHE_VERSION = 1

export function getWorkspaceDir(): string {
  return join(app.getPath('userData'), 'openclaw', 'workspace')
}

export function getIdentityPath(): string {
  return join(getWorkspaceDir(), 'IDENTITY.md')
}

export function readAgentIdentity(): AgentIdentity {
  const path = getIdentityPath()
  if (!existsSync(path)) return { ...DEFAULT_IDENTITY }
  let content = ''
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return { ...DEFAULT_IDENTITY }
  }
  return {
    name: readField(content, 'Name') || DEFAULT_IDENTITY.name,
    description: readField(content, 'Vibe') || DEFAULT_IDENTITY.description,
    voice: readField(content, 'Voice') || DEFAULT_IDENTITY.voice,
  }
}

export function writeAgentIdentity(identity: Partial<AgentIdentity>): AgentIdentity {
  const merged: AgentIdentity = {
    name: identity.name?.trim() || DEFAULT_IDENTITY.name,
    description: identity.description?.trim() || DEFAULT_IDENTITY.description,
    voice: identity.voice?.trim() || DEFAULT_IDENTITY.voice,
  }
  const dir = getWorkspaceDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(getIdentityPath(), renderIdentityMarkdown(merged), { mode: 0o600 })
  return merged
}

export type VoicePreviewResult =
  | { ok: true; audioBase64: string; mimeType: string }
  | { ok: false; error: string }

// Returns a cached preview clip for `voice`, generating + persisting it on
// first request. Once cached, subsequent calls do NOT hit the Gemini TTS
// endpoint, so this is safe to call without a configured API key after the
// initial generation.
export async function getCachedVoicePreview(params: {
  apiKey?: string | null
  voice: string
}): Promise<VoicePreviewResult> {
  const cached = readVoicePreviewCache(params.voice)
  if (cached) return { ok: true, ...cached }
  if (!params.apiKey) return { ok: false, error: 'No Gemini key configured.' }
  const result = await speakGreetingPreview({
    apiKey: params.apiKey,
    voice: params.voice,
    text: STATIC_PREVIEW_TEXT,
  })
  if (!result.ok) return result
  writeVoicePreviewCache(params.voice, {
    audioBase64: result.audioBase64,
    mimeType: result.mimeType,
  })
  return result
}

export async function speakGreetingPreview(params: {
  apiKey: string
  voice: string
  text: string
}): Promise<VoicePreviewResult> {
  if (!params.apiKey) return { ok: false, error: 'No Gemini key configured.' }
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent'
  try {
    const response = await net.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': params.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: params.text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: params.voice },
            },
          },
        },
      }),
    })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return { ok: false, error: `TTS ${response.status}: ${errText.slice(0, 200)}` }
    }
    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
    }
    const inline = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
    if (!inline?.data) return { ok: false, error: 'TTS response missing audio data.' }
    return {
      ok: true,
      audioBase64: inline.data,
      mimeType: inline.mimeType ?? 'audio/L16;rate=24000',
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'TTS request failed.' }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderIdentityMarkdown(identity: AgentIdentity): string {
  return [
    '# IDENTITY.md - Who Am I?',
    '',
    `- **Name:** ${identity.name}`,
    `- **Creature:** Personal voice companion`,
    `- **Vibe:** ${identity.description}`,
    `- **Voice:** ${identity.voice}`,
    '',
  ].join('\n')
}

function readField(content: string, field: string): string | null {
  const re = new RegExp(`^[-*]\\s*\\*\\*${field}:?\\*\\*\\s*(.+?)\\s*$`, 'mi')
  const match = content.match(re)
  return match ? match[1].trim() : null
}

function getVoicePreviewCacheDir(): string {
  return join(app.getPath('userData'), 'voice-previews', `v${CACHE_VERSION}`)
}

function getVoicePreviewCachePath(voice: string): string {
  // Voice IDs are alphanumeric (Puck, Zephyr, kore, etc.) but defensively
  // strip anything that could escape the cache dir.
  const safe = voice.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(getVoicePreviewCacheDir(), `${safe}.json`)
}

function readVoicePreviewCache(
  voice: string,
): { audioBase64: string; mimeType: string } | null {
  const path = getVoicePreviewCachePath(voice)
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as { audioBase64?: string; mimeType?: string }
    if (typeof parsed.audioBase64 !== 'string' || typeof parsed.mimeType !== 'string') {
      return null
    }
    return { audioBase64: parsed.audioBase64, mimeType: parsed.mimeType }
  } catch {
    return null
  }
}

function writeVoicePreviewCache(
  voice: string,
  payload: { audioBase64: string; mimeType: string },
): void {
  try {
    mkdirSync(getVoicePreviewCacheDir(), { recursive: true })
    writeFileSync(getVoicePreviewCachePath(voice), JSON.stringify(payload), 'utf8')
  } catch (err) {
    console.warn('[voice-preview] cache write failed', err)
  }
}
