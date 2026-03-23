import { db } from './client'
import { CREATE_TABLES } from './schema'

export async function runMigrations() {
  await db.execAsync(CREATE_TABLES)
  await addVapiColumns()
}

// --- Migration Helpers ---

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
