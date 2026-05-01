// Renderer-side typed wrapper around the onboarding IPC bridge. Keeps
// every wizard step honest about what shapes flow across the bridge.

export type WizardStepId =
  | 'welcome'
  | 'signin'
  | 'permissions'
  | 'provider'
  | 'brain'
  | 'identity'
  | 'testcall'

export type ProviderId = 'gemini' | 'openai' | 'xai'
export type AccessMode = 'cloud' | 'byo-key'

export type PermissionStatus =
  | 'granted'
  | 'denied'
  | 'not-determined'
  | 'restricted'
  | 'unknown'

export type AgentIdentityPatch = {
  name?: string
  description?: string
  voice?: string
}

export type OnboardingPayload = {
  signedIn?: boolean
  permissions?: {
    mic?: PermissionStatus
    screen?: PermissionStatus
  }
  accessMode?: AccessMode
  cloudVerified?: boolean
  provider?: ProviderId
  providerKeyValidated?: boolean
  brain?: 'openclaw' | 'claude' | 'codex' | { url: string }
  identity?: AgentIdentityPatch
  user?: { id?: string; email?: string | null; name?: string | null }
}

export type CloudStatus = {
  signedIn: boolean
  baseUrl: string
}

export type CloudUserInfo = {
  user: {
    id: string
    email: string
    name: string | null
    tier: 'free' | 'pro'
    proUntil: string | null
  }
  device: { id: string }
  usage: {
    day: string
    dailyCapSeconds: number
    secondsUsedToday: number
    secondsRemainingToday: number
    tokensMintedToday: number
    lastMintedAt: string | null
  }
}

export type CloudMeResult =
  | { ok: true; value: CloudUserInfo }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number }

export type OnboardingState = {
  currentStep: WizardStepId
  payload: OnboardingPayload
  completedAt: string | null
}

export type AuthCallback =
  | { ok: true; user: { id?: string; email?: string | null; name?: string | null } | null }
  | { ok: false; error: string }

export type BrainDetection = {
  openclaw: { available: true }
  claude: { available: boolean; path?: string }
  codex: { available: boolean; path?: string }
}

declare global {
  interface Window {
    electronAPI: Window['electronAPI'] & {
      onboarding: {
        getState: () => Promise<OnboardingState>
        updateStep: (step: WizardStepId, patch?: OnboardingPayload) => Promise<OnboardingState>
        complete: () => Promise<OnboardingState>
        reset: () => Promise<{ ok: false } | { ok: true; state: OnboardingState }>
        startSignIn: () => Promise<{ ok: boolean }>
        onAuthCallback: (handler: (payload: AuthCallback) => void) => () => void
      }
      permissions: {
        getMediaStatus: (kind: 'microphone' | 'screen') => Promise<PermissionStatus>
        requestMic: () => Promise<boolean>
        openSettings: (pane: 'mic' | 'screen') => Promise<void>
      }
      provider: {
        listConfigured: () => Promise<ProviderId[]>
        validateAndSave: (
          provider: ProviderId,
          key: string,
        ) => Promise<{ ok: true } | { ok: false; error: string; status?: number }>
        geminiSmoke: (
          prompt: string,
        ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
      }
      brain: {
        detect: () => Promise<BrainDetection>
      }
      cloud: {
        getStatus: () => Promise<CloudStatus>
        fetchMe: () => Promise<CloudMeResult>
        fetchSessionToken: (opts?: { forceRefresh?: boolean }) => Promise<
          | {
              ok: true
              token: string
              model: string
              newSessionExpiresAt: string
              expiresAt: string
              lifetimeSeconds: number
              tier: 'free' | 'pro'
              quota: {
                dailyCapSeconds: number
                secondsUsedToday: number
                secondsRemainingToday: number
              }
            }
          | { ok: false; status: number; error: string; retryAfterSeconds?: number }
        >
      }
      identity: {
        get: () => Promise<{ name: string; description: string; voice: string }>
        save: (patch: AgentIdentityPatch) => Promise<{
          name: string
          description: string
          voice: string
        }>
        speakPreview: (params: { voice: string; text: string }) => Promise<
          | { ok: true; audioBase64: string; mimeType: string }
          | { ok: false; error: string }
        >
      }
    }
  }
}

export const onboarding = {
  getState: () => window.electronAPI.onboarding.getState(),
  updateStep: (step: WizardStepId, patch?: OnboardingPayload) =>
    window.electronAPI.onboarding.updateStep(step, patch),
  complete: () => window.electronAPI.onboarding.complete(),
  reset: () => window.electronAPI.onboarding.reset(),
  startSignIn: () => window.electronAPI.onboarding.startSignIn(),
  onAuthCallback: (handler: (payload: AuthCallback) => void) =>
    window.electronAPI.onboarding.onAuthCallback(handler),
}

export const permissions = {
  getMediaStatus: (kind: 'microphone' | 'screen') =>
    window.electronAPI.permissions.getMediaStatus(kind),
  requestMic: () => window.electronAPI.permissions.requestMic(),
  openSettings: (pane: 'mic' | 'screen') =>
    window.electronAPI.permissions.openSettings(pane),
}

export const providerApi = {
  listConfigured: () => window.electronAPI.provider.listConfigured(),
  validateAndSave: (provider: ProviderId, key: string) =>
    window.electronAPI.provider.validateAndSave(provider, key),
  geminiSmoke: (prompt: string) => window.electronAPI.provider.geminiSmoke(prompt),
}

export const brainApi = {
  detect: () => window.electronAPI.brain.detect(),
}

export const cloudApi = {
  getStatus: () => window.electronAPI.cloud.getStatus(),
  fetchMe: () => window.electronAPI.cloud.fetchMe(),
  fetchSessionToken: (opts?: { forceRefresh?: boolean }) =>
    window.electronAPI.cloud.fetchSessionToken(opts),
}

export const identityApi = {
  get: () => window.electronAPI.identity.get(),
  save: (patch: AgentIdentityPatch) => window.electronAPI.identity.save(patch),
  speakPreview: (params: { voice: string; text: string }) =>
    window.electronAPI.identity.speakPreview(params),
}
