// Renderer-side typed wrapper around the onboarding IPC bridge. Keeps
// every wizard step honest about what shapes flow across the bridge.

export type WizardStepId =
  | 'welcome'
  | 'signin'
  | 'permissions'
  | 'provider'
  | 'brain'
  | 'identity'
  | 'introduction'

export type ProviderId = 'gemini' | 'openai' | 'xai'

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

export type UserProfile = {
  name: string
  bio: string
}

export type UserProfilePatch = {
  name?: string
  bio?: string
}

export type OnboardingPayload = {
  signedIn?: boolean
  permissions?: {
    mic?: PermissionStatus
    screen?: PermissionStatus
  }
  provider?: ProviderId
  providerKeyValidated?: boolean
  brain?: 'openclaw' | 'claude' | 'codex' | { url: string }
  identity?: AgentIdentityPatch
  user?: { id?: string; email?: string | null; name?: string | null }
}

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
        getVoicePreview: (params: { voice: string }) => Promise<
          | { ok: true; audioBase64: string; mimeType: string }
          | { ok: false; error: string }
        >
      }
      user: {
        get: () => Promise<UserProfile>
        save: (patch: UserProfilePatch) => Promise<UserProfile>
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

export const identityApi = {
  get: () => window.electronAPI.identity.get(),
  save: (patch: AgentIdentityPatch) => window.electronAPI.identity.save(patch),
  speakPreview: (params: { voice: string; text: string }) =>
    window.electronAPI.identity.speakPreview(params),
  getVoicePreview: (params: { voice: string }) =>
    window.electronAPI.identity.getVoicePreview(params),
}

export const userApi = {
  get: () => window.electronAPI.user.get(),
  save: (patch: UserProfilePatch) => window.electronAPI.user.save(patch),
}
