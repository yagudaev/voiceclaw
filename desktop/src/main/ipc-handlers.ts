import { app, dialog, ipcMain, net, shell, systemPreferences } from 'electron'
import { readFileSync, statSync } from 'fs'
import { extname } from 'path'
import {
  type AttachmentInput,
  type AttachmentRecord,
  deleteAttachmentFile,
  shouldStoreInline,
  validateAttachmentInput,
  writeAttachmentToDisk,
} from './attachments'
import { getDb } from './db'
import { isLaunchAtLoginEnabled, setLaunchAtLogin } from './login-items'
import { serviceManager } from './services/service-manager'
import { buildRelayEnv } from './services/relay-server'
import { applyGeminiKeyToOpenClawConfig } from './services/openclaw-gateway'
import { buildDiagnosticBundle } from './services/diagnostic-bundle'
import {
  type AgentIdentity,
  readAgentIdentity,
  speakGreetingPreview,
  writeAgentIdentity,
} from './identity'
import { getAllocatedPorts } from './ports'
import {
  type OnboardingPayload,
  type WizardStepId,
  ensureBundledRelayDefaults,
  getOnboardingState,
  markOnboardingComplete,
  resetOnboarding,
  updateOnboardingStep,
} from './onboarding'
import {
  type ProviderId,
  geminiSmokeCall,
  getProviderKey,
  listConfiguredProviders,
  setProviderKey,
  validateProviderKey,
} from './provider-keys'
import { detectBrains } from './brain-detect'
import { runAllChecks } from './services/brain-doctor'
import {
  checkForUpdatesNow,
  getUpdateState,
  installNow,
} from './services/auto-updater'
import { startSignInFlow } from './auth'
import { getMainWindow } from './window-lifecycle'
import {
  getActiveProvider,
  providerForVoice,
  setVoiceForProviderSync,
} from './voice-prefs'
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
  ipcMain.handle('app:resetBundledDefaults', async () => {
    const defaults = ensureBundledRelayDefaults({ force: true })
    const geminiKey = getProviderKey('gemini')
    if (geminiKey) {
      try {
        applyGeminiKeyToOpenClawConfig(geminiKey)
      } catch (err) {
        console.warn('[bundled-defaults] failed to re-apply gemini key', err)
      }
    }
    serviceManager.restart('relay', () => buildRelayEnv()).catch((err) => {
      console.warn('[bundled-defaults] relay restart failed', err)
    })
    serviceManager.restart('openclawGateway').catch((err) => {
      console.warn('[bundled-defaults] openclaw restart failed', err)
    })
    return { ok: true as const, relayApiKey: defaults.relayApiKey }
  })

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
    const orphanedFiles = db
      .prepare(
        `SELECT a.path FROM message_attachments a
          JOIN messages m ON m.id = a.message_id
          WHERE m.conversation_id = ? AND a.storage = 'file' AND a.path IS NOT NULL`,
      )
      .all(id) as { path: string }[]
    db.prepare('DELETE FROM conversation_summaries WHERE conversation_id = ?').run(id)
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id)
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
    for (const row of orphanedFiles) deleteAttachmentFile(row.path)
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
    const orphanedFiles = db
      .prepare(
        "SELECT path FROM message_attachments WHERE storage = 'file' AND path IS NOT NULL",
      )
      .all() as { path: string }[]
    db.prepare('DELETE FROM conversation_summaries').run()
    db.prepare('DELETE FROM messages').run()
    db.prepare('DELETE FROM conversations').run()
    for (const row of orphanedFiles) deleteAttachmentFile(row.path)
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

  ipcMain.handle('db:deleteMessage', (_e, id: number) => {
    if (typeof id !== 'number' || !Number.isFinite(id) || id <= 0) {
      return { ok: false as const, error: 'Invalid message id' }
    }
    const db = getDb()
    const row = db
      .prepare('SELECT conversation_id FROM messages WHERE id = ?')
      .get(id) as { conversation_id: number } | undefined
    if (!row) return { ok: false as const, error: 'Message not found' }
    const orphanedFiles = db
      .prepare(
        "SELECT path FROM message_attachments WHERE message_id = ? AND storage = 'file' AND path IS NOT NULL",
      )
      .all(id) as { path: string }[]
    const result = db.prepare('DELETE FROM messages WHERE id = ?').run(id)
    if (result.changes !== 1) return { ok: false as const, error: 'Delete affected no rows' }
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(
      Date.now(),
      row.conversation_id,
    )
    for (const orphan of orphanedFiles) deleteAttachmentFile(orphan.path)
    return { ok: true as const }
  })

  ipcMain.handle(
    'db:attachToMessage',
    (_e, messageId: number, input: AttachmentInput) => {
      if (typeof messageId !== 'number' || !Number.isFinite(messageId) || messageId <= 0) {
        return { ok: false as const, error: 'Invalid message id' }
      }
      const validation = validateAttachmentInput(input)
      if (!validation.ok) return validation
      const db = getDb()
      const exists = db
        .prepare('SELECT id FROM messages WHERE id = ?')
        .get(messageId) as { id: number } | undefined
      if (!exists) return { ok: false as const, error: 'Message not found' }
      const now = Date.now()
      const inline = shouldStoreInline(input.byteSize)
      let storagePath: string | null = null
      let storageData: string | null = null
      if (inline) {
        storageData = input.base64
      } else {
        try {
          storagePath = writeAttachmentToDisk(app.getPath('userData'), input.base64, input.mime)
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : 'Failed to write attachment to disk',
          }
        }
      }
      const result = db
        .prepare(
          `INSERT INTO message_attachments
            (message_id, kind, mime, storage, data, path, width, height, byte_size, original_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          messageId,
          input.kind,
          input.mime,
          inline ? 'inline' : 'file',
          storageData,
          storagePath,
          input.width ?? null,
          input.height ?? null,
          input.byteSize,
          input.originalName ?? null,
          now,
        )
      const record: AttachmentRecord = {
        id: result.lastInsertRowid as number,
        message_id: messageId,
        kind: input.kind,
        mime: input.mime,
        storage: inline ? 'inline' : 'file',
        data: storageData,
        path: storagePath,
        width: input.width ?? null,
        height: input.height ?? null,
        byte_size: input.byteSize,
        original_name: input.originalName ?? null,
        created_at: now,
      }
      return { ok: true as const, attachment: record }
    },
  )

  ipcMain.handle('db:getAttachmentsForMessage', (_e, messageId: number) => {
    const db = getDb()
    const rows = db
      .prepare(
        'SELECT * FROM message_attachments WHERE message_id = ? ORDER BY created_at ASC, id ASC',
      )
      .all(messageId) as AttachmentRecord[]
    return rows.map(hydrateAttachmentData)
  })

  ipcMain.handle('db:getAttachmentsForConversation', (_e, conversationId: number) => {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT a.* FROM message_attachments a
          JOIN messages m ON m.id = a.message_id
          WHERE m.conversation_id = ?
          ORDER BY a.created_at ASC, a.id ASC`,
      )
      .all(conversationId) as AttachmentRecord[]
    return rows.map(hydrateAttachmentData)
  })

  ipcMain.handle('attachments:pickImage', async () => {
    const window = getMainWindow()
    const result = window
      ? await dialog.showOpenDialog(window, {
          title: 'Attach an image',
          properties: ['openFile'],
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
        })
      : await dialog.showOpenDialog({
          title: 'Attach an image',
          properties: ['openFile'],
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
        })
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false as const, cancelled: true }
    }
    const path = result.filePaths[0]
    try {
      const stats = statSync(path)
      const mime = mimeForPath(path)
      if (!mime) {
        return {
          ok: false as const,
          error: 'Unsupported file type. Allowed: PNG, JPG, WEBP.',
        }
      }
      const buf = readFileSync(path)
      return {
        ok: true as const,
        file: {
          base64: buf.toString('base64'),
          byteSize: stats.size,
          mime,
          originalName: path.split('/').pop() ?? null,
        },
      }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : 'Could not read file',
      }
    }
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

  // Permissions (macOS) — read + request mic / screen.
  ipcMain.handle('perm:getMediaStatus', (_e, kind: 'microphone' | 'screen') => {
    if (process.platform !== 'darwin') return 'granted'
    return systemPreferences.getMediaAccessStatus(kind)
  })
  ipcMain.handle('perm:requestMic', async () => {
    if (process.platform !== 'darwin') return true
    return systemPreferences.askForMediaAccess('microphone')
  })
  ipcMain.handle('perm:openSettings', (_e, pane: 'mic' | 'screen') => {
    if (process.platform !== 'darwin') return
    const anchor = pane === 'mic' ? 'Privacy_Microphone' : 'Privacy_ScreenCapture'
    void shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${anchor}`)
  })

  // Provider keys + smoke test
  ipcMain.handle('provider:listConfigured', () => listConfiguredProviders())
  ipcMain.handle(
    'provider:validateAndSave',
    async (_e, provider: ProviderId, key: string) => {
      const result = await validateProviderKey(provider, key)
      if (!result.ok) return result
      const previous = getProviderKey(provider)
      try {
        setProviderKey(provider, key)
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : 'Could not save key.',
        }
      }
      if (previous !== key) {
        serviceManager.restart('relay', () => buildRelayEnv()).catch((err) => {
          console.warn('[relay] restart after provider key save failed', err)
        })
        if (provider === 'gemini') {
          try {
            const changed = applyGeminiKeyToOpenClawConfig(key)
            if (changed) {
              serviceManager.restart('openclawGateway').catch((err) => {
                console.warn('[openclaw] restart after gemini key save failed', err)
              })
            }
          } catch (err) {
            console.warn('[openclaw] failed to apply gemini key to config', err)
          }
        }
      }
      return { ok: true as const }
    },
  )
  ipcMain.handle('provider:geminiSmoke', async (_e, prompt: string) => {
    return geminiSmokeCall(prompt)
  })

  // Brain detection
  ipcMain.handle('brain:detect', () => detectBrains())
  ipcMain.handle('brain:runDoctor', () => runAllChecks())

  // Agent identity (name, description, voice) — persisted as IDENTITY.md
  // in the bundled openclaw workspace so the relay's instruction builder
  // picks it up without an extra config bridge.
  ipcMain.handle('identity:get', () => readAgentIdentity())
  ipcMain.handle('identity:save', (_e, patch: Partial<AgentIdentity>) => {
    const saved = writeAgentIdentity(patch)
    if (saved.voice) {
      const provider = providerForVoice(saved.voice) ?? getActiveProvider()
      setVoiceForProviderSync(provider, saved.voice)
    }
    serviceManager.restart('relay', () => buildRelayEnv()).catch((err) => {
      console.warn('[relay] restart after identity save failed', err)
    })
    return saved
  })
  ipcMain.handle(
    'identity:speakPreview',
    async (_e, params: { voice: string; text: string }) => {
      const apiKey = getProviderKey('gemini')
      if (!apiKey) return { ok: false as const, error: 'No Gemini key configured.' }
      return speakGreetingPreview({ apiKey, voice: params.voice, text: params.text })
    },
  )

  // Logs
  ipcMain.handle('logs:reveal', async () => {
    const dir = app.getPath('logs')
    await shell.openPath(dir)
    return { ok: true, path: dir }
  })

  // Diagnostic bundle
  ipcMain.handle('diagnostics:export', async () => {
    const result = await buildDiagnosticBundle()
    if (result.ok) {
      shell.showItemInFolder(result.path)
    }
    return result
  })

  // Updates
  ipcMain.handle('updates:getState', () => {
    const s = getUpdateState()
    return { ...s, currentVersion: app.getVersion() }
  })
  ipcMain.handle('updates:checkNow', () => checkForUpdatesNow())
  ipcMain.handle('updates:installNow', (_e, source: 'banner' | 'settings' | 'tray' = 'settings') => {
    installNow(source)
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      return shell.openExternal(url)
    }
  })

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

function hydrateAttachmentData(row: AttachmentRecord): AttachmentRecord {
  if (row.storage !== 'file' || !row.path || row.data) return row
  try {
    const buf = readFileSync(row.path)
    return { ...row, data: buf.toString('base64') }
  } catch {
    return row
  }
}

function mimeForPath(path: string): string | null {
  const ext = extname(path).toLowerCase()
  switch (ext) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    default:
      return null
  }
}

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
