import { app, net } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { readFile } from 'node:fs/promises'
import { join } from 'path'
import { providerForVoice, type ProviderId } from './voice-prefs'

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

// Reads the bundled WAV preview for `voice`. Both Gemini and xAI voices
// ship as static assets under `resources/voice-previews/<provider>/` —
// no network, no API key, no quota concerns. The samples are generated
// once via the desktop/scripts/generate-<provider>-voice-previews.mjs
// scripts and committed to the repo.
export async function getCachedVoicePreview(params: {
  voice: string
}): Promise<VoicePreviewResult> {
  const provider = providerForVoice(params.voice)
  if (!provider) {
    return { ok: false, error: `Unknown voice "${params.voice}".` }
  }
  return readBundledVoicePreview(provider, params.voice)
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

function getBundledVoicePath(provider: ProviderId, voice: string): string {
  // Voice IDs are alphanumeric. Defensively strip anything that could
  // escape the resources dir.
  const safe = voice.replace(/[^a-zA-Z0-9_-]/g, '_')
  const file = `${safe}.wav`
  // In packaged builds extraResources lands at process.resourcesPath; in
  // dev electron-vite serves from desktop/, so resources sit alongside.
  if (app.isPackaged) {
    return join(process.resourcesPath, 'voice-previews', provider, file)
  }
  return join(app.getAppPath(), 'resources', 'voice-previews', provider, file)
}

async function readBundledVoicePreview(
  provider: ProviderId,
  voice: string,
): Promise<VoicePreviewResult> {
  try {
    const buf = await readFile(getBundledVoicePath(provider, voice))
    return {
      ok: true,
      audioBase64: buf.toString('base64'),
      mimeType: 'audio/wav',
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return { ok: false, error: `No bundled preview for voice "${voice}".` }
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to read voice preview.',
    }
  }
}
