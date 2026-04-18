// Per-user relay URL store. Each user runs their own VoiceClaw relay on their
// laptop/server and registers the public URL via /setrelay. The bot composes
// the mini app URL per user from this mapping.

import Database from "better-sqlite3"
import { existsSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"

export interface UserRelay {
  telegramUserId: number
  relayUrl: string
  updatedAt: number
}

export class RelayStore {
  private db: Database.Database

  constructor(path: string) {
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.db = new Database(path)
    this.db.pragma("journal_mode = WAL")
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_relay (
        telegram_user_id INTEGER PRIMARY KEY,
        relay_url TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
  }

  set(telegramUserId: number, relayUrl: string): void {
    this.db.prepare(`
      INSERT INTO user_relay (telegram_user_id, relay_url, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(telegram_user_id) DO UPDATE SET
        relay_url = excluded.relay_url,
        updated_at = excluded.updated_at
    `).run(telegramUserId, relayUrl, Date.now())
  }

  get(telegramUserId: number): UserRelay | null {
    const row = this.db.prepare(`
      SELECT telegram_user_id, relay_url, updated_at FROM user_relay
      WHERE telegram_user_id = ?
    `).get(telegramUserId) as
      | { telegram_user_id: number, relay_url: string, updated_at: number }
      | undefined
    if (!row) return null
    return {
      telegramUserId: row.telegram_user_id,
      relayUrl: row.relay_url,
      updatedAt: row.updated_at,
    }
  }

  clear(telegramUserId: number): void {
    this.db.prepare("DELETE FROM user_relay WHERE telegram_user_id = ?")
      .run(telegramUserId)
  }

  close(): void {
    this.db.close()
  }
}

export function isValidRelayUrl(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    // Strip trailing slash and any path/query — we only want scheme + host.
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}
