import { net, safeStorage } from 'electron'
import { getDb } from './db'
import { ensureOnboardingSchema } from './onboarding'

// Provider API key vault. Keys are encrypted with Electron's
// safeStorage (Keychain-backed on macOS) before they ever touch
// SQLite. Plaintext only exists in memory transiently while we
// validate the key with the upstream provider.

export type ProviderId = 'gemini' | 'openai' | 'xai'

export type ValidateKeyResult = { ok: true } | { ok: false; error: string; status?: number }

export function setProviderKey(provider: ProviderId, plaintextKey: string): void {
  ensureOnboardingSchema()
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage is not available — Keychain access denied?')
  }
  const enc = safeStorage.encryptString(plaintextKey)
  const now = Date.now()
  const db = getDb()
  db.prepare(
    `INSERT INTO provider_keys (provider, key_enc, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(provider) DO UPDATE SET key_enc = excluded.key_enc, updated_at = excluded.updated_at`,
  ).run(provider, enc, now, now)
}

export function getProviderKey(provider: ProviderId): string | null {
  ensureOnboardingSchema()
  const db = getDb()
  const row = db
    .prepare('SELECT key_enc FROM provider_keys WHERE provider = ?')
    .get(provider) as { key_enc: Buffer } | undefined
  if (!row) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(row.key_enc)
  } catch {
    return null
  }
}

export function listConfiguredProviders(): ProviderId[] {
  ensureOnboardingSchema()
  const db = getDb()
  const rows = db.prepare('SELECT provider FROM provider_keys').all() as { provider: string }[]
  return rows.map((r) => r.provider).filter(isProviderId)
}

export async function validateProviderKey(
  provider: ProviderId,
  key: string,
): Promise<ValidateKeyResult> {
  if (!key || key.length < 8) {
    return { ok: false, error: 'Key looks too short.' }
  }

  try {
    if (provider === 'gemini') {
      const response = await net.fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        { method: 'GET' },
      )
      if (response.ok) return { ok: true }
      return {
        ok: false,
        status: response.status,
        error: keyErrorMessage(response.status),
      }
    }
    if (provider === 'openai') {
      const response = await net.fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      })
      if (response.ok) return { ok: true }
      return {
        ok: false,
        status: response.status,
        error: keyErrorMessage(response.status),
      }
    }
    // xai uses an OpenAI-compatible endpoint
    const response = await net.fetch('https://api.x.ai/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    })
    if (response.ok) return { ok: true }
    return {
      ok: false,
      status: response.status,
      error: keyErrorMessage(response.status),
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

// Used by the smoke test on step 6: text-only generateContent against
// Gemini using the saved key. Returns the model's reply text. If the
// model errors, we surface the error message verbatim so the user can
// see exactly what went wrong.
//
// TODO(voice-test-call): replace this with the real bidirectional Live
// audio call (NAN-670). This function intentionally does not stream.
export async function geminiSmokeCall(prompt: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const key = getProviderKey('gemini')
  if (!key) return { ok: false, error: 'No Gemini key configured.' }

  try {
    const response = await net.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 64 },
        }),
      },
    )
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return { ok: false, error: `Gemini ${response.status}: ${text.slice(0, 200)}` }
    }
    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim()
    if (!text) return { ok: false, error: 'Empty response from Gemini.' }
    return { ok: true, text }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProviderId(v: string): v is ProviderId {
  return v === 'gemini' || v === 'openai' || v === 'xai'
}

function keyErrorMessage(status: number): string {
  if (status === 401 || status === 403) return "That key doesn't look right."
  if (status === 404) return 'Provider rejected the key (404).'
  if (status === 429) return 'Rate limited — try again in a moment.'
  return `Provider returned ${status}.`
}
