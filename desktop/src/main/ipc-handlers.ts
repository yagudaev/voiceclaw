import { ipcMain } from 'electron'
import { getDb } from './db'

export function registerIpcHandlers() {
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
}
