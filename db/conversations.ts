import { db } from './client'

export type Conversation = {
  id: number
  title: string
  created_at: number
  updated_at: number
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
  }
}

export async function getConversations(): Promise<Conversation[]> {
  return db.getAllAsync<Conversation>('SELECT * FROM conversations ORDER BY updated_at DESC')
}

export async function getConversation(id: number): Promise<Conversation | null> {
  return db.getFirstAsync<Conversation>('SELECT * FROM conversations WHERE id = ?', [id])
}

export async function deleteConversation(id: number) {
  await db.runAsync('DELETE FROM messages WHERE conversation_id = ?', [id])
  await db.runAsync('DELETE FROM conversations WHERE id = ?', [id])
}
