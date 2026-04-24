import { getDb } from './db'

// Onboarding state — single-row table (id=1) capturing the wizard's
// resume point and accumulated payload. Renderer reads on mount; if
// completed_at is null, we show the wizard. Each step transition
// merges a payload patch and bumps current_step so a quit-mid-flow
// resumes cleanly.

export type WizardStepId =
  | 'welcome'
  | 'signin'
  | 'permissions'
  | 'provider'
  | 'brain'
  | 'testcall'

export type OnboardingPayload = {
  signedIn?: boolean
  permissions?: {
    mic?: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'
    screen?: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'
    accessibility?: 'granted' | 'denied' | 'unknown'
  }
  provider?: 'gemini' | 'openai' | 'xai'
  providerKeyValidated?: boolean
  brain?: 'openclaw' | 'claude' | 'codex' | { url: string }
  user?: { id?: string; email?: string | null; name?: string | null }
}

export type OnboardingState = {
  currentStep: WizardStepId
  payload: OnboardingPayload
  completedAt: string | null
}

export function ensureOnboardingSchema(): void {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_step TEXT NOT NULL DEFAULT 'welcome',
      payload TEXT NOT NULL DEFAULT '{}',
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS provider_keys (
      provider TEXT PRIMARY KEY,
      key_enc BLOB NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      token_enc BLOB NOT NULL,
      platform TEXT,
      created_at INTEGER NOT NULL
    );
  `)
}

export function getOnboardingState(): OnboardingState {
  ensureOnboardingSchema()
  const db = getDb()
  const row = db
    .prepare(
      'SELECT current_step as currentStep, payload, completed_at as completedAt FROM onboarding_state WHERE id = 1',
    )
    .get() as { currentStep: WizardStepId; payload: string; completedAt: string | null } | undefined

  if (!row) {
    db.prepare(
      "INSERT INTO onboarding_state (id, current_step, payload, completed_at) VALUES (1, 'welcome', '{}', NULL)",
    ).run()
    return { currentStep: 'welcome', payload: {}, completedAt: null }
  }

  return {
    currentStep: row.currentStep,
    payload: parsePayload(row.payload),
    completedAt: row.completedAt,
  }
}

export function updateOnboardingStep(
  step: WizardStepId,
  payloadPatch: OnboardingPayload = {},
): OnboardingState {
  ensureOnboardingSchema()
  const current = getOnboardingState()
  const merged = mergePayload(current.payload, payloadPatch)
  const db = getDb()
  db.prepare(
    'UPDATE onboarding_state SET current_step = ?, payload = ? WHERE id = 1',
  ).run(step, JSON.stringify(merged))
  return { currentStep: step, payload: merged, completedAt: current.completedAt }
}

export function markOnboardingComplete(): OnboardingState {
  ensureOnboardingSchema()
  const completedAt = new Date().toISOString()
  const db = getDb()
  db.prepare('UPDATE onboarding_state SET completed_at = ? WHERE id = 1').run(completedAt)
  return { ...getOnboardingState(), completedAt }
}

export function resetOnboarding(): OnboardingState {
  ensureOnboardingSchema()
  const db = getDb()
  db.prepare('DELETE FROM onboarding_state').run()
  // Don't wipe provider_keys / devices here — those are useful even if
  // the user re-runs the wizard. Reset only the wizard's resume cursor.
  return getOnboardingState()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePayload(raw: string): OnboardingPayload {
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as OnboardingPayload) : {}
  } catch {
    return {}
  }
}

function mergePayload(
  current: OnboardingPayload,
  patch: OnboardingPayload,
): OnboardingPayload {
  return {
    ...current,
    ...patch,
    permissions: patch.permissions
      ? { ...(current.permissions ?? {}), ...patch.permissions }
      : current.permissions,
    user: patch.user ? { ...(current.user ?? {}), ...patch.user } : current.user,
  }
}
