import { db } from './client'

export type Message = {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: number
}

export async function addMessage(
  conversationId: number,
  role: 'user' | 'assistant',
  content: string
): Promise<Message> {
  const now = Date.now()
  const result = await db.runAsync(
    'INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)',
    [conversationId, role, content, now]
  )

  await db.runAsync('UPDATE conversations SET updated_at = ? WHERE id = ?', [now, conversationId])

  return {
    id: result.lastInsertRowId,
    conversation_id: conversationId,
    role,
    content,
    created_at: now,
  }
}

export async function getMessages(conversationId: number): Promise<Message[]> {
  return db.getAllAsync<Message>(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  )
}
