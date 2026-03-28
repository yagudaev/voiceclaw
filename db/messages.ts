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
  stt_provider: string | null
  llm_provider: string | null
  tts_provider: string | null
}

export type LatencyData = {
  sttLatencyMs?: number
  llmLatencyMs?: number
  ttsLatencyMs?: number
}

export type ProviderInfo = {
  sttProvider?: string
  llmProvider?: string
  ttsProvider?: string
}

export type LatencyAverages = {
  avgStt: number | null
  avgLlm: number | null
  avgTts: number | null
  avgTotal: number | null
  minStt: number | null
  maxStt: number | null
  minLlm: number | null
  maxLlm: number | null
  minTts: number | null
  maxTts: number | null
  minTotal: number | null
  maxTotal: number | null
  turnCount: number
}

export async function addMessage(
  conversationId: number,
  role: 'user' | 'assistant',
  content: string,
  latency?: LatencyData,
  providers?: ProviderInfo
): Promise<Message> {
  const now = Date.now()
  const stt = latency?.sttLatencyMs ?? null
  const llm = latency?.llmLatencyMs ?? null
  const tts = latency?.ttsLatencyMs ?? null
  const sttProv = providers?.sttProvider ?? null
  const llmProv = providers?.llmProvider ?? null
  const ttsProv = providers?.ttsProvider ?? null

  const result = await db.runAsync(
    'INSERT INTO messages (conversation_id, role, content, created_at, stt_latency_ms, llm_latency_ms, tts_latency_ms, stt_provider, llm_provider, tts_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [conversationId, role, content, now, stt, llm, tts, sttProv, llmProv, ttsProv]
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
    stt_provider: sttProv,
    llm_provider: llmProv,
    tts_provider: ttsProv,
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
    min_stt: number | null
    max_stt: number | null
    min_llm: number | null
    max_llm: number | null
    min_tts: number | null
    max_tts: number | null
    min_total: number | null
    max_total: number | null
    turn_count: number
  }>(
    `SELECT
      AVG(stt_latency_ms) as avg_stt,
      AVG(llm_latency_ms) as avg_llm,
      AVG(tts_latency_ms) as avg_tts,
      AVG(COALESCE(stt_latency_ms, 0) + COALESCE(llm_latency_ms, 0) + COALESCE(tts_latency_ms, 0)) as avg_total,
      MIN(stt_latency_ms) as min_stt,
      MAX(stt_latency_ms) as max_stt,
      MIN(llm_latency_ms) as min_llm,
      MAX(llm_latency_ms) as max_llm,
      MIN(tts_latency_ms) as min_tts,
      MAX(tts_latency_ms) as max_tts,
      MIN(CASE WHEN stt_latency_ms IS NOT NULL AND llm_latency_ms IS NOT NULL AND tts_latency_ms IS NOT NULL THEN COALESCE(stt_latency_ms, 0) + COALESCE(llm_latency_ms, 0) + COALESCE(tts_latency_ms, 0) END) as min_total,
      MAX(CASE WHEN stt_latency_ms IS NOT NULL AND llm_latency_ms IS NOT NULL AND tts_latency_ms IS NOT NULL THEN COALESCE(stt_latency_ms, 0) + COALESCE(llm_latency_ms, 0) + COALESCE(tts_latency_ms, 0) END) as max_total,
      COUNT(*) as turn_count
    FROM messages
    WHERE stt_latency_ms IS NOT NULL
      OR llm_latency_ms IS NOT NULL
      OR tts_latency_ms IS NOT NULL`
  )

  if (!row) {
    return emptyLatencyAverages()
  }

  return {
    avgStt: row.avg_stt,
    avgLlm: row.avg_llm,
    avgTts: row.avg_tts,
    avgTotal: row.avg_total,
    minStt: row.min_stt,
    maxStt: row.max_stt,
    minLlm: row.min_llm,
    maxLlm: row.max_llm,
    minTts: row.min_tts,
    maxTts: row.max_tts,
    minTotal: row.min_total,
    maxTotal: row.max_total,
    turnCount: row.turn_count,
  }
}

export async function clearLatencyData(): Promise<void> {
  await db.runAsync(
    `UPDATE messages SET stt_latency_ms = NULL, llm_latency_ms = NULL, tts_latency_ms = NULL
    WHERE stt_latency_ms IS NOT NULL OR llm_latency_ms IS NOT NULL OR tts_latency_ms IS NOT NULL`
  )
}

// --- Helper Functions ---

function emptyLatencyAverages(): LatencyAverages {
  return {
    avgStt: null, avgLlm: null, avgTts: null, avgTotal: null,
    minStt: null, maxStt: null, minLlm: null, maxLlm: null,
    minTts: null, maxTts: null, minTotal: null, maxTotal: null,
    turnCount: 0,
  }
}
