import { dialog, ipcMain, net, shell, systemPreferences } from 'electron'
import { getDb } from './db'
import { isLaunchAtLoginEnabled, setLaunchAtLogin } from './login-items'
import { serviceManager } from './services/service-manager'
import { getAllocatedPorts } from './ports'
import {
  type OnboardingPayload,
  type WizardStepId,
  getOnboardingState,
  markOnboardingComplete,
  resetOnboarding,
  updateOnboardingStep,
} from './onboarding'
import {
  type ProviderId,
  geminiSmokeCall,
  listConfiguredProviders,
  setProviderKey,
  validateProviderKey,
} from './provider-keys'
import { detectBrains } from './brain-detect'
import { startSignInFlow } from './auth'
import { getMainWindow } from './window-lifecycle'
import {
  capture as telemetryCapture,
  captureException as telemetryCaptureException,
  getDistinctId,
  isOptedOut as telemetryIsOptedOut,
  setOptedOut as telemetrySetOptedOut,
} from './telemetry'

export function registerIpcHandlers() {
  // App lifecycle / system integration
  ipcMain.handle('app:getLaunchAtLogin', () => isLaunchAtLoginEnabled())
  ipcMain.handle('app:setLaunchAtLogin', (_e, enabled: boolean) => {
    setLaunchAtLogin(enabled)
    return isLaunchAtLoginEnabled()
  })
  ipcMain.handle('app:getServiceStatuses', () => serviceManager.getAllStatuses())
  ipcMain.handle('app:getServicePorts', () => getAllocatedPorts())

  // Telemetry. The renderer initializes its own posthog-js client but
  // shares the same distinct_id so a session ties events from main and
  // renderer together.
  ipcMain.handle('telemetry:getDistinctId', () => getDistinctId())
  ipcMain.handle('telemetry:getOptedOut', () => telemetryIsOptedOut())
  ipcMain.handle('telemetry:setOptedOut', (_e, optedOut: boolean) => {
    telemetrySetOptedOut(optedOut)
    return telemetryIsOptedOut()
  })
  ipcMain.handle(
    'telemetry:capture',
    (_e, event: string, props?: Record<string, unknown>) => {
      telemetryCapture(event, props)
    },
  )
  ipcMain.handle(
    'telemetry:captureException',
    (_e, err: { message: string, stack?: string }, context?: Record<string, unknown>) => {
      const error = new Error(err?.message ?? 'unknown')
      if (err?.stack) error.stack = err.stack
      telemetryCaptureException(error, context)
    },
  )

  // Conversations
  ipcMain.handle('db:createConversation', (_e, title?: string) => {
    const db = getDb()
    const now = Date.now()
    const result = db
      .prepare('INSERT INTO conversations (title, created_at, updated_at) VALUES (?, ?, ?)')
      .run(title ?? 'New Conversation', now, now)
    return {
      id: result.lastInsertRowid as number,
      title: title ?? 'New Conversation',
      created_at: now,
      updated_at: now,
    }
  })

  ipcMain.handle('db:getLatestConversation', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 1').get() ?? null
  })

  ipcMain.handle('db:getConversations', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all()
  })

  ipcMain.handle('db:getConversationsWithPreview', () => {
    const db = getDb()
    return db
      .prepare(
        `SELECT c.*,
          (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at ASC LIMIT 1) as preview,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
        FROM conversations c
        ORDER BY c.updated_at DESC`,
      )
      .all()
  })

  ipcMain.handle('db:getConversation', (_e, id: number) => {
    const db = getDb()
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) ?? null
  })

  ipcMain.handle('db:deleteConversation', (_e, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM conversation_summaries WHERE conversation_id = ?').run(id)
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id)
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
  })

  ipcMain.handle('db:updateConversationTitle', (_e, id: number, title: string) => {
    const db = getDb()
    db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(
      title,
      Date.now(),
      id,
    )
  })

  ipcMain.handle('db:deleteAllConversations', () => {
    const db = getDb()
    db.prepare('DELETE FROM conversation_summaries').run()
    db.prepare('DELETE FROM messages').run()
    db.prepare('DELETE FROM conversations').run()
  })

  // Messages
  ipcMain.handle(
    'db:addMessage',
    (
      _e,
      conversationId: number,
      role: string,
      content: string,
      latency?: { sttLatencyMs?: number, llmLatencyMs?: number, ttsLatencyMs?: number },
      providers?: { sttProvider?: string, llmProvider?: string, ttsProvider?: string },
    ) => {
      const db = getDb()
      const now = Date.now()
      const result = db
        .prepare(
          'INSERT INTO messages (conversation_id, role, content, created_at, stt_latency_ms, llm_latency_ms, tts_latency_ms, stt_provider, llm_provider, tts_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          conversationId,
          role,
          content,
          now,
          latency?.sttLatencyMs ?? null,
          latency?.llmLatencyMs ?? null,
          latency?.ttsLatencyMs ?? null,
          providers?.sttProvider ?? null,
          providers?.llmProvider ?? null,
          providers?.ttsProvider ?? null,
        )
      db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversationId)
      return {
        id: result.lastInsertRowid as number,
        conversation_id: conversationId,
        role,
        content,
        created_at: now,
        stt_latency_ms: latency?.sttLatencyMs ?? null,
        llm_latency_ms: latency?.llmLatencyMs ?? null,
        tts_latency_ms: latency?.ttsLatencyMs ?? null,
        stt_provider: providers?.sttProvider ?? null,
        llm_provider: providers?.llmProvider ?? null,
        tts_provider: providers?.ttsProvider ?? null,
      }
    },
  )

  ipcMain.handle('db:getMessages', (_e, conversationId: number) => {
    const db = getDb()
    return db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(conversationId)
  })

  // Settings
  ipcMain.handle('db:getSetting', (_e, key: string) => {
    const db = getDb()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? null
  })

  ipcMain.handle('db:setSetting', (_e, key: string, value: string) => {
    const db = getDb()
    db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    ).run(key, value, value)
  })

  ipcMain.handle('db:getAllSettings', () => {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM settings').all() as { key: string, value: string }[]
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  })

  // Onboarding state
  ipcMain.handle('onboarding:getState', () => getOnboardingState())
  ipcMain.handle(
    'onboarding:updateStep',
    (_e, step: WizardStepId, patch: OnboardingPayload | undefined) =>
      updateOnboardingStep(step, patch ?? {}),
  )
  ipcMain.handle('onboarding:complete', () => markOnboardingComplete())
  ipcMain.handle('onboarding:reset', async () => {
    const window = getMainWindow()
    const result = window
      ? await dialog.showMessageBox(window, {
          type: 'warning',
          buttons: ['Start over', 'Cancel'],
          defaultId: 1,
          cancelId: 1,
          title: 'Restart onboarding?',
          message: 'Restart onboarding from step 1?',
          detail:
            'Saved API keys and sign-in remain in place — only the wizard cursor resets.',
        })
      : { response: 0 }
    if (result.response !== 0) return { ok: false }
    resetOnboarding()
    return { ok: true, state: getOnboardingState() }
  })
  ipcMain.handle('onboarding:startSignIn', () => {
    startSignInFlow('google')
    return { ok: true }
  })

  // Permissions (macOS) — read + request mic / screen / accessibility.
  ipcMain.handle('perm:getMediaStatus', (_e, kind: 'microphone' | 'screen') => {
    if (process.platform !== 'darwin') return 'granted'
    return systemPreferences.getMediaAccessStatus(kind)
  })
  ipcMain.handle('perm:requestMic', async () => {
    if (process.platform !== 'darwin') return true
    return systemPreferences.askForMediaAccess('microphone')
  })
  ipcMain.handle('perm:getAccessibility', () => {
    if (process.platform !== 'darwin') return true
    return systemPreferences.isTrustedAccessibilityClient(false)
  })
  ipcMain.handle('perm:openSettings', (_e, pane: 'mic' | 'screen' | 'accessibility') => {
    if (process.platform !== 'darwin') return
    const anchor =
      pane === 'mic'
        ? 'Privacy_Microphone'
        : pane === 'screen'
          ? 'Privacy_ScreenCapture'
          : 'Privacy_Accessibility'
    void shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${anchor}`)
  })

  // Provider keys + smoke test
  ipcMain.handle('provider:listConfigured', () => listConfiguredProviders())
  ipcMain.handle(
    'provider:validateAndSave',
    async (_e, provider: ProviderId, key: string) => {
      const result = await validateProviderKey(provider, key)
      if (!result.ok) return result
      try {
        setProviderKey(provider, key)
        return { ok: true as const }
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : 'Could not save key.',
        }
      }
    },
  )
  ipcMain.handle('provider:geminiSmoke', async (_e, prompt: string) => {
    return geminiSmokeCall(prompt)
  })

  // Brain detection
  ipcMain.handle('brain:detect', () => detectBrains())

  // Network: test relay server connection from main process (avoids CORS)
  ipcMain.handle('net:healthCheck', async (_e, url: string) => {
    const httpUrl = toHealthUrl(url)
    if (!httpUrl) {
      return { ok: false, error: 'Invalid URL: only ws:// and wss:// allowed' }
    }
    try {
      const response = await net.fetch(httpUrl, { method: 'GET' })
      if (response.ok) {
        const body = await response.json()
        if (body.status === 'ok') return { ok: true }
      }
      return { ok: false, error: `Server returned ${response.status}` }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' }
    }
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toHealthUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'ws:') parsed.protocol = 'http:'
    else if (parsed.protocol === 'wss:') parsed.protocol = 'https:'
    else return null
    // Strip /ws path and append /health
    parsed.pathname = parsed.pathname.replace(/\/ws\/?$/, '')
    parsed.pathname = parsed.pathname.replace(/\/$/, '') + '/health'
    return parsed.toString()
  } catch {
    return null
  }
}
