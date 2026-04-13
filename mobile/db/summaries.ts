import { db } from './client'

export type ConversationSummary = {
  id: number
  conversation_id: number
  summary: string
  message_count: number
  created_at: number
}

export async function getSummary(conversationId: number): Promise<ConversationSummary | null> {
  return db.getFirstAsync<ConversationSummary>(
    'SELECT * FROM conversation_summaries WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
    [conversationId]
  )
}

export async function saveSummary(
  conversationId: number,
  summary: string,
  messageCount: number
): Promise<ConversationSummary> {
  const now = Date.now()
  const result = await db.runAsync(
    'INSERT INTO conversation_summaries (conversation_id, summary, message_count, created_at) VALUES (?, ?, ?, ?)',
    [conversationId, summary, messageCount, now]
  )
  return {
    id: result.lastInsertRowId,
    conversation_id: conversationId,
    summary,
    message_count: messageCount,
    created_at: now,
  }
}

export async function deleteSummaries(conversationId: number) {
  await db.runAsync('DELETE FROM conversation_summaries WHERE conversation_id = ?', [conversationId])
}
