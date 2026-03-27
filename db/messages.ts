import { db } from './client'

export type Message = {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: number
  stt_latency_ms: number | null
  llm_latency_ms: number | null
  tts_latency_ms: number | null
}

export type LatencyData = {
  sttLatencyMs?: number
  llmLatencyMs?: number
  ttsLatencyMs?: number
}

export type LatencyAverages = {
  avgStt: number | null
  avgLlm: number | null
  avgTts: number | null
  avgTotal: number | null
  turnCount: number
}

export async function addMessage(
  conversationId: number,
  role: 'user' | 'assistant',
  content: string,
  latency?: LatencyData
): Promise<Message> {
  const now = Date.now()
  const stt = latency?.sttLatencyMs ?? null
  const llm = latency?.llmLatencyMs ?? null
  const tts = latency?.ttsLatencyMs ?? null

  const result = await db.runAsync(
    'INSERT INTO messages (conversation_id, role, content, created_at, stt_latency_ms, llm_latency_ms, tts_latency_ms) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [conversationId, role, content, now, stt, llm, tts]
  )

  await db.runAsync('UPDATE conversations SET updated_at = ? WHERE id = ?', [now, conversationId])

  return {
    id: result.lastInsertRowId,
    conversation_id: conversationId,
    role,
    content,
    created_at: now,
    stt_latency_ms: stt,
    llm_latency_ms: llm,
    tts_latency_ms: tts,
  }
}

export async function getMessages(conversationId: number): Promise<Message[]> {
  return db.getAllAsync<Message>(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  )
}

export async function getLatencyAverages(): Promise<LatencyAverages> {
  const row = await db.getFirstAsync<{
    avg_stt: number | null
    avg_llm: number | null
    avg_tts: number | null
    avg_total: number | null
    turn_count: number
  }>(
    `SELECT
      AVG(stt_latency_ms) as avg_stt,
      AVG(llm_latency_ms) as avg_llm,
      AVG(tts_latency_ms) as avg_tts,
      AVG(COALESCE(stt_latency_ms, 0) + COALESCE(llm_latency_ms, 0) + COALESCE(tts_latency_ms, 0)) as avg_total,
      COUNT(*) as turn_count
    FROM messages
    WHERE stt_latency_ms IS NOT NULL
      OR llm_latency_ms IS NOT NULL
      OR tts_latency_ms IS NOT NULL`
  )

  if (!row) {
    return { avgStt: null, avgLlm: null, avgTts: null, avgTotal: null, turnCount: 0 }
  }

  return {
    avgStt: row.avg_stt,
    avgLlm: row.avg_llm,
    avgTts: row.avg_tts,
    avgTotal: row.avg_total,
    turnCount: row.turn_count,
  }
}
