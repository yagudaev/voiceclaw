import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

export type ElectronAPI = typeof electronAPI

type WizardStepId =
  | 'welcome'
  | 'signin'
  | 'permissions'
  | 'provider'
  | 'brain'
  | 'identity'
  | 'introduction'

type OnboardingPayload = {
  signedIn?: boolean
  permissions?: {
    mic?: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'
    screen?: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'
  }
  provider?: 'gemini' | 'openai' | 'xai'
  providerKeyValidated?: boolean
  brain?: 'openclaw' | 'claude' | 'codex' | { url: string }
  identity?: { name?: string; description?: string; voice?: string }
  user?: { id?: string; email?: string | null; name?: string | null }
}

type OnboardingState = {
  currentStep: WizardStepId
  payload: OnboardingPayload
  completedAt: string | null
}

type AuthCallback = { ok: true; user: { id?: string; email?: string | null; name?: string | null } | null } | { ok: false; error: string }

type AttachmentInputBridge = {
  kind: 'image'
  mime: string
  base64: string
  byteSize: number
  width?: number | null
  height?: number | null
  originalName?: string | null
}

type AttachmentRecordBridge = {
  id: number
  message_id: number
  kind: 'image'
  mime: string
  storage: 'inline' | 'file'
  data: string | null
  path: string | null
  width: number | null
  height: number | null
  byte_size: number
  original_name: string | null
  created_at: number
}

type PickImageResult =
  | { ok: true; file: { base64: string; byteSize: number; mime: string; originalName: string | null } }
  | { ok: false; cancelled: true }
  | { ok: false; error: string }

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
    resetBundledDefaults: () =>
      ipcRenderer.invoke('app:resetBundledDefaults') as Promise<{
        ok: true
        relayApiKey: string
      }>,
  },
  tray: {
    setCallActive: (active: boolean) =>
      ipcRenderer.invoke('tray:setCallActive', active) as Promise<void>,
  },
  callBar: {
    // Main-renderer side: stream audio levels to main on a ~30 Hz tick
    // while a session is live. Fire-and-forget (.send, not .invoke).
    sendAudioLevels: (input: number, output: number) =>
      ipcRenderer.send('call-bar:audio-levels', { input, output }),

    // Main-renderer side: notify call-bar of mute state changes so the
    // bar can render a visible indicator and zero its input meter.
    sendMuted: (muted: boolean) => ipcRenderer.send('call-bar:muted', muted),

    // Main-renderer side: listen for UX requests forwarded from the
    // call-bar context menu so the main UI can actually mute / hang up.
    onMuteToggleRequest: (handler: () => void) => {
      const wrapped = () => handler()
      ipcRenderer.on('call-bar:request-mute-toggle', wrapped)
      return () => ipcRenderer.removeListener('call-bar:request-mute-toggle', wrapped)
    },
    onEndCallRequest: (handler: () => void) => {
      const wrapped = () => handler()
      ipcRenderer.on('call-bar:request-end-call', wrapped)
      return () => ipcRenderer.removeListener('call-bar:request-end-call', wrapped)
    },

    // Call-bar renderer side ------------------------------------------
    ready: () => ipcRenderer.invoke('call-bar:ready') as Promise<void>,
    focusMain: () => ipcRenderer.invoke('call-bar:focus-main') as Promise<void>,
    openContextMenu: () => ipcRenderer.invoke('call-bar:open-context-menu') as Promise<void>,
    onVisibility: (handler: (visible: boolean) => void) => {
      const wrapped = (_e: IpcRendererEvent, visible: boolean) => handler(visible)
      ipcRenderer.on('call-bar:visibility', wrapped)
      return () => ipcRenderer.removeListener('call-bar:visibility', wrapped)
    },
    onAudioLevels: (handler: (payload: { input: number; output: number }) => void) => {
      const wrapped = (
        _e: IpcRendererEvent,
        payload: { input: number; output: number },
      ) => handler(payload)
      ipcRenderer.on('call-bar:audio-levels', wrapped)
      return () => ipcRenderer.removeListener('call-bar:audio-levels', wrapped)
    },
    onMuted: (handler: (muted: boolean) => void) => {
      const wrapped = (_e: IpcRendererEvent, muted: boolean) => handler(muted)
      ipcRenderer.on('call-bar:muted', wrapped)
      return () => ipcRenderer.removeListener('call-bar:muted', wrapped)
    },
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
    deleteMessage: (id: number) =>
      ipcRenderer.invoke('db:deleteMessage', id) as Promise<
        { ok: true } | { ok: false; error: string }
      >,
    attachToMessage: (messageId: number, input: AttachmentInputBridge) =>
      ipcRenderer.invoke('db:attachToMessage', messageId, input) as Promise<
        { ok: true; attachment: AttachmentRecordBridge } | { ok: false; error: string }
      >,
    getAttachmentsForMessage: (messageId: number) =>
      ipcRenderer.invoke('db:getAttachmentsForMessage', messageId) as Promise<
        AttachmentRecordBridge[]
      >,
    getAttachmentsForConversation: (conversationId: number) =>
      ipcRenderer.invoke('db:getAttachmentsForConversation', conversationId) as Promise<
        AttachmentRecordBridge[]
      >,
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
    openSettings: (pane: 'mic' | 'screen') =>
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
    runDoctor: () =>
      ipcRenderer.invoke('brain:runDoctor') as Promise<{
        checks: Array<{
          status: 'PASS' | 'FAIL' | 'SKIP'
          label: string
          detail: string | null
          hint: string | null
        }>
        passed: number
        failed: number
        skipped: number
      }>,
  },
  identity: {
    get: () =>
      ipcRenderer.invoke('identity:get') as Promise<{
        name: string
        description: string
        voice: string
      }>,
    save: (patch: { name?: string; description?: string; voice?: string }) =>
      ipcRenderer.invoke('identity:save', patch) as Promise<{
        name: string
        description: string
        voice: string
      }>,
    speakPreview: (params: { voice: string; text: string }) =>
      ipcRenderer.invoke('identity:speakPreview', params) as Promise<
        | { ok: true; audioBase64: string; mimeType: string }
        | { ok: false; error: string }
      >,
    getVoicePreview: (params: { voice: string }) =>
      ipcRenderer.invoke('identity:getVoicePreview', params) as Promise<
        | { ok: true; audioBase64: string; mimeType: string }
        | { ok: false; error: string }
      >,
  },
  user: {
    get: () => ipcRenderer.invoke('user:get') as Promise<{ name: string; bio: string }>,
    save: (patch: { name?: string; bio?: string }) =>
      ipcRenderer.invoke('user:save', patch) as Promise<{ name: string; bio: string }>,
  },
  screen: {
    getSources: () =>
      ipcRenderer.invoke('screen:getSources') as Promise<
        Array<{
          id: string
          name: string
          thumbnailDataURL: string | null
          appIconDataURL: string | null
        }>
      >,
    getWindowBounds: (windowId: number) =>
      ipcRenderer.invoke('screen:getWindowBounds', windowId) as Promise<{
        x: number
        y: number
        width: number
        height: number
      } | null>,
  },
  drawOverlay: {
    show: (displayId?: number) =>
      ipcRenderer.invoke('draw-overlay:show', displayId) as Promise<void>,
    hide: () => ipcRenderer.invoke('draw-overlay:hide') as Promise<void>,
    setMode: (mode: 'idle' | 'draw') =>
      ipcRenderer.invoke('draw-overlay:setMode', mode) as Promise<void>,
    clear: () => ipcRenderer.invoke('draw-overlay:clear') as Promise<void>,
    onStrokes: (
      handler: (payload: {
        strokes: Array<{
          id: string
          color: string
          width: number
          points: Array<{ x: number; y: number }>
        }>
        bounds: { x: number; y: number; width: number; height: number; scaleFactor: number }
      }) => void,
    ) => {
      const wrapped = (_e: IpcRendererEvent, p: Parameters<typeof handler>[0]) => handler(p)
      ipcRenderer.on('draw-overlay:strokes', wrapped)
      return () => ipcRenderer.removeListener('draw-overlay:strokes', wrapped)
    },
    onDisplayBounds: (
      handler: (bounds: {
        x: number
        y: number
        width: number
        height: number
        scaleFactor: number
      }) => void,
    ) => {
      const wrapped = (_e: IpcRendererEvent, b: Parameters<typeof handler>[0]) => handler(b)
      ipcRenderer.on('draw-overlay:display-bounds', wrapped)
      return () => ipcRenderer.removeListener('draw-overlay:display-bounds', wrapped)
    },
    onModeChanged: (handler: (mode: 'idle' | 'draw') => void) => {
      const wrapped = (_e: IpcRendererEvent, mode: 'idle' | 'draw') => handler(mode)
      ipcRenderer.on('draw-overlay:mode', wrapped)
      return () => ipcRenderer.removeListener('draw-overlay:mode', wrapped)
    },

    // Overlay-renderer side ------------------------------------------------
    ready: () => ipcRenderer.invoke('draw-overlay:ready') as Promise<void>,
    sendStrokes: (
      strokes: Array<{
        id: string
        color: string
        width: number
        points: Array<{ x: number; y: number }>
      }>,
    ) => ipcRenderer.send('draw-overlay:strokes', { strokes }),
    onMode: (handler: (mode: 'idle' | 'draw') => void) => {
      const wrapped = (_e: IpcRendererEvent, mode: 'idle' | 'draw') => handler(mode)
      ipcRenderer.on('draw-overlay:mode', wrapped)
      return () => ipcRenderer.removeListener('draw-overlay:mode', wrapped)
    },
    onClear: (handler: () => void) => {
      const wrapped = () => handler()
      ipcRenderer.on('draw-overlay:clear', wrapped)
      return () => ipcRenderer.removeListener('draw-overlay:clear', wrapped)
    },
    onBounds: (
      handler: (bounds: {
        x: number
        y: number
        width: number
        height: number
        scaleFactor: number
      }) => void,
    ) => {
      const wrapped = (_e: IpcRendererEvent, b: Parameters<typeof handler>[0]) => handler(b)
      ipcRenderer.on('draw-overlay:bounds', wrapped)
      return () => ipcRenderer.removeListener('draw-overlay:bounds', wrapped)
    },
  },
  logs: {
    reveal: () => ipcRenderer.invoke('logs:reveal') as Promise<{ ok: boolean, path: string }>,
  },
  net: {
    healthCheck: (url: string) => ipcRenderer.invoke('net:healthCheck', url) as Promise<{ ok: boolean, error?: string }>,
  },
  updates: {
    getState: () =>
      ipcRenderer.invoke('updates:getState') as Promise<{
        currentVersion: string
        stagedVersion: string | null
        lastChecked: number | null
        status: string
        releaseNotes: string | null
        error: string | null
      }>,
    checkNow: () =>
      ipcRenderer.invoke('updates:checkNow') as Promise<{
        currentVersion: string
        stagedVersion: string | null
        lastChecked: number | null
        status: string
        releaseNotes: string | null
        error: string | null
      }>,
    installNow: (source: 'banner' | 'settings' | 'tray') =>
      ipcRenderer.invoke('updates:installNow', source) as Promise<void>,
    onStateChanged: (handler: (state: {
      currentVersion: string
      stagedVersion: string | null
      lastChecked: number | null
      status: string
      releaseNotes: string | null
      error: string | null
    }) => void) => {
      const wrapped = (_e: IpcRendererEvent, s: Parameters<typeof handler>[0]) => handler(s)
      ipcRenderer.on('updates:stateChanged', wrapped)
      return () => ipcRenderer.removeListener('updates:stateChanged', wrapped)
    },
    onStaged: (handler: (payload: { version: string; releaseNotes: string | null }) => void) => {
      const wrapped = (_e: IpcRendererEvent, p: Parameters<typeof handler>[0]) => handler(p)
      ipcRenderer.on('updates:staged', wrapped)
      return () => ipcRenderer.removeListener('updates:staged', wrapped)
    },
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
  diagnostics: {
    export: () =>
      ipcRenderer.invoke('diagnostics:export') as Promise<
        { ok: true; path: string } | { ok: false; error: string }
      >,
  },
  attachments: {
    pickImage: () => ipcRenderer.invoke('attachments:pickImage') as Promise<PickImageResult>,
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url) as Promise<void>,
  },
  shortcuts: {
    list: () =>
      ipcRenderer.invoke('shortcuts:list') as Promise<
        Array<{
          action: 'mute' | 'annotate' | 'clearAnnotations' | 'screenShare' | 'toggleCall'
          accelerator: string
          defaultAccelerator: string
        }>
      >,
    set: (
      action: 'mute' | 'annotate' | 'clearAnnotations' | 'screenShare' | 'toggleCall',
      accelerator: string,
    ) =>
      ipcRenderer.invoke('shortcuts:set', action, accelerator) as Promise<
        { ok: true; accelerator: string } | { ok: false; error: string }
      >,
    clear: (action: 'mute' | 'annotate' | 'clearAnnotations' | 'screenShare' | 'toggleCall') =>
      ipcRenderer.invoke('shortcuts:clear', action) as Promise<
        { ok: true } | { ok: false; error: string }
      >,
    resetDefaults: () =>
      ipcRenderer.invoke('shortcuts:resetDefaults') as Promise<
        Array<{
          action: 'mute' | 'annotate' | 'clearAnnotations' | 'screenShare' | 'toggleCall'
          accelerator: string
          defaultAccelerator: string
        }>
      >,
    onTriggered: (
      handler: (
        action: 'mute' | 'annotate' | 'clearAnnotations' | 'screenShare' | 'toggleCall',
      ) => void,
    ) => {
      const wrapped = (
        _e: IpcRendererEvent,
        action: 'mute' | 'annotate' | 'clearAnnotations' | 'screenShare' | 'toggleCall',
      ) => handler(action)
      ipcRenderer.on('shortcuts:triggered', wrapped)
      return () => ipcRenderer.removeListener('shortcuts:triggered', wrapped)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
