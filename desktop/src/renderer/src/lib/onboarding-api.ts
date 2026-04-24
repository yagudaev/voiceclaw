// Renderer-side typed wrapper around the onboarding IPC bridge. Keeps
// every wizard step honest about what shapes flow across the bridge.

export type WizardStepId =
  | 'welcome'
  | 'signin'
  | 'permissions'
  | 'provider'
  | 'brain'
  | 'testcall'

export type ProviderId = 'gemini' | 'openai' | 'xai'

export type PermissionStatus =
  | 'granted'
  | 'denied'
  | 'not-determined'
  | 'restricted'
  | 'unknown'

export type OnboardingPayload = {
  signedIn?: boolean
  permissions?: {
    mic?: PermissionStatus
    screen?: PermissionStatus
    accessibility?: 'granted' | 'denied' | 'unknown'
  }
  provider?: ProviderId
  providerKeyValidated?: boolean
  brain?: 'openclaw' | 'claude' | 'codex' | { url: string }
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
        getAccessibility: () => Promise<boolean>
        openSettings: (pane: 'mic' | 'screen' | 'accessibility') => Promise<void>
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
  getAccessibility: () => window.electronAPI.permissions.getAccessibility(),
  openSettings: (pane: 'mic' | 'screen' | 'accessibility') =>
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
