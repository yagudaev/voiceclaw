import { db } from './client'

export type Conversation = {
  id: number
  title: string
  created_at: number
  updated_at: number
  vapi_session_id: string | null
  vapi_last_chat_id: string | null
}

export async function createConversation(title?: string): Promise<Conversation> {
  const now = Date.now()
  const result = await db.runAsync(
    'INSERT INTO conversations (title, created_at, updated_at) VALUES (?, ?, ?)',
    [title ?? 'New Conversation', now, now]
  )
  return {
    id: result.lastInsertRowId,
    title: title ?? 'New Conversation',
    created_at: now,
    updated_at: now,
    vapi_session_id: null,
    vapi_last_chat_id: null,
  }
}

export type ConversationWithPreview = Conversation & {
  preview: string | null
  message_count: number
}

export async function getConversations(): Promise<Conversation[]> {
  return db.getAllAsync<Conversation>('SELECT * FROM conversations ORDER BY updated_at DESC')
}

export async function getConversationsWithPreview(): Promise<ConversationWithPreview[]> {
  return db.getAllAsync<ConversationWithPreview>(
    `SELECT c.*,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at ASC LIMIT 1) as preview,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c
    ORDER BY c.updated_at DESC`
  )
}

export async function getConversation(id: number): Promise<Conversation | null> {
  return db.getFirstAsync<Conversation>('SELECT * FROM conversations WHERE id = ?', [id])
}

export async function deleteConversation(id: number) {
  await db.runAsync('DELETE FROM conversation_summaries WHERE conversation_id = ?', [id])
  await db.runAsync('DELETE FROM messages WHERE conversation_id = ?', [id])
  await db.runAsync('DELETE FROM conversations WHERE id = ?', [id])
}

export async function updateConversationVapi(
  id: number,
  vapiSessionId: string | null,
  vapiLastChatId: string | null
) {
  await db.runAsync(
    'UPDATE conversations SET vapi_session_id = ?, vapi_last_chat_id = ?, updated_at = ? WHERE id = ?',
    [vapiSessionId, vapiLastChatId, Date.now(), id]
  )
}
