import { db } from './client'
import { CREATE_TABLES } from './schema'

export async function runMigrations() {
  await db.execAsync(CREATE_TABLES)
  await addVapiColumns()
  await addLatencyColumns()
}

// --- Migration Helpers ---

async function addLatencyColumns() {
  const columns = ['stt_latency_ms', 'llm_latency_ms', 'tts_latency_ms']
  for (const col of columns) {
    try {
      await db.execAsync(`ALTER TABLE messages ADD COLUMN ${col} REAL`)
    } catch {
      // Column already exists
    }
  }
}

async function addVapiColumns() {
  try {
    await db.execAsync('ALTER TABLE conversations ADD COLUMN vapi_session_id TEXT')
  } catch {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE conversations ADD COLUMN vapi_last_chat_id TEXT')
  } catch {
    // Column already exists
  }
}
