import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

export type ElectronAPI = typeof electronAPI

type WizardStepId =
  | 'welcome'
  | 'signin'
  | 'permissions'
  | 'provider'
  | 'brain'
  | 'testcall'

type OnboardingPayload = {
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

type OnboardingState = {
  currentStep: WizardStepId
  payload: OnboardingPayload
  completedAt: string | null
}

type AuthCallback = { ok: true; user: { id?: string; email?: string | null; name?: string | null } | null } | { ok: false; error: string }

const electronAPI = {
  platform: process.platform,
  app: {
    getLaunchAtLogin: () => ipcRenderer.invoke('app:getLaunchAtLogin') as Promise<boolean>,
    setLaunchAtLogin: (enabled: boolean) =>
      ipcRenderer.invoke('app:setLaunchAtLogin', enabled) as Promise<boolean>,
    getServiceStatuses: () =>
      ipcRenderer.invoke('app:getServiceStatuses') as Promise<
        Record<string, { state: string; port?: number }>
      >,
    getServicePorts: () =>
      ipcRenderer.invoke('app:getServicePorts') as Promise<Record<string, number>>,
  },
  tray: {
    setCallActive: (active: boolean) =>
      ipcRenderer.invoke('tray:setCallActive', active) as Promise<void>,
  },
  db: {
    createConversation: (title?: string) => ipcRenderer.invoke('db:createConversation', title),
    getLatestConversation: () => ipcRenderer.invoke('db:getLatestConversation'),
    getConversations: () => ipcRenderer.invoke('db:getConversations'),
    getConversationsWithPreview: () => ipcRenderer.invoke('db:getConversationsWithPreview'),
    getConversation: (id: number) => ipcRenderer.invoke('db:getConversation', id),
    deleteConversation: (id: number) => ipcRenderer.invoke('db:deleteConversation', id),
    updateConversationTitle: (id: number, title: string) =>
      ipcRenderer.invoke('db:updateConversationTitle', id, title),
    deleteAllConversations: () => ipcRenderer.invoke('db:deleteAllConversations'),
    addMessage: (
      conversationId: number,
      role: string,
      content: string,
      latency?: { sttLatencyMs?: number, llmLatencyMs?: number, ttsLatencyMs?: number },
      providers?: { sttProvider?: string, llmProvider?: string, ttsProvider?: string },
    ) => ipcRenderer.invoke('db:addMessage', conversationId, role, content, latency, providers),
    getMessages: (conversationId: number) => ipcRenderer.invoke('db:getMessages', conversationId),
    getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
    setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),
    getAllSettings: () => ipcRenderer.invoke('db:getAllSettings'),
  },
  onboarding: {
    getState: () => ipcRenderer.invoke('onboarding:getState') as Promise<OnboardingState>,
    updateStep: (step: WizardStepId, patch?: OnboardingPayload) =>
      ipcRenderer.invoke('onboarding:updateStep', step, patch ?? {}) as Promise<OnboardingState>,
    complete: () => ipcRenderer.invoke('onboarding:complete') as Promise<OnboardingState>,
    reset: () =>
      ipcRenderer.invoke('onboarding:reset') as Promise<
        { ok: false } | { ok: true; state: OnboardingState }
      >,
    startSignIn: () => ipcRenderer.invoke('onboarding:startSignIn') as Promise<{ ok: boolean }>,
    onAuthCallback: (handler: (payload: AuthCallback) => void) => {
      const wrapped = (_event: IpcRendererEvent, payload: AuthCallback) => handler(payload)
      ipcRenderer.on('onboarding:auth-callback', wrapped)
      return () => ipcRenderer.removeListener('onboarding:auth-callback', wrapped)
    },
  },
  permissions: {
    getMediaStatus: (kind: 'microphone' | 'screen') =>
      ipcRenderer.invoke('perm:getMediaStatus', kind) as Promise<
        'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'
      >,
    requestMic: () => ipcRenderer.invoke('perm:requestMic') as Promise<boolean>,
    getAccessibility: () => ipcRenderer.invoke('perm:getAccessibility') as Promise<boolean>,
    openSettings: (pane: 'mic' | 'screen' | 'accessibility') =>
      ipcRenderer.invoke('perm:openSettings', pane) as Promise<void>,
  },
  provider: {
    listConfigured: () =>
      ipcRenderer.invoke('provider:listConfigured') as Promise<('gemini' | 'openai' | 'xai')[]>,
    validateAndSave: (provider: 'gemini' | 'openai' | 'xai', key: string) =>
      ipcRenderer.invoke('provider:validateAndSave', provider, key) as Promise<
        { ok: true } | { ok: false; error: string; status?: number }
      >,
    geminiSmoke: (prompt: string) =>
      ipcRenderer.invoke('provider:geminiSmoke', prompt) as Promise<
        { ok: true; text: string } | { ok: false; error: string }
      >,
  },
  brain: {
    detect: () =>
      ipcRenderer.invoke('brain:detect') as Promise<{
        openclaw: { available: true }
        claude: { available: boolean; path?: string }
        codex: { available: boolean; path?: string }
      }>,
  },
  screen: {
    getSources: () => ipcRenderer.invoke('screen:getSources'),
  },
  net: {
    healthCheck: (url: string) => ipcRenderer.invoke('net:healthCheck', url) as Promise<{ ok: boolean, error?: string }>,
  },
  telemetry: {
    getDistinctId: () => ipcRenderer.invoke('telemetry:getDistinctId') as Promise<string>,
    getOptedOut: () => ipcRenderer.invoke('telemetry:getOptedOut') as Promise<boolean>,
    setOptedOut: (optedOut: boolean) =>
      ipcRenderer.invoke('telemetry:setOptedOut', optedOut) as Promise<boolean>,
    capture: (event: string, props?: Record<string, unknown>) =>
      ipcRenderer.invoke('telemetry:capture', event, props) as Promise<void>,
    captureException: (
      err: { message: string, stack?: string },
      context?: Record<string, unknown>,
    ) => ipcRenderer.invoke('telemetry:captureException', err, context) as Promise<void>,
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
