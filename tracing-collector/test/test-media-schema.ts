// Test: media table schema + upsert idempotency + session/trace indexing.
//
// Doesn't exercise the OTLP wire path (that's covered by integration). This
// locks down the SQL contract the tracing-ui reader depends on.
//
// Run: npx tsx test/test-media-schema.ts

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { openDb, upsertMedia, type MediaRow } from "../src/db.js"

async function run() {
  const root = mkdtempSync(join(tmpdir(), "voiceclaw-media-schema-"))
  const dbPath = join(root, "tracing.db")
  const db = openDb(dbPath)

  const base: MediaRow = {
    trace_id: "trace-aaa",
    span_id: "span-aaa",
    session_id: "session-aaa",
    kind: "user_audio",
    codec: "pcm_s16le",
    sample_rate_hz: 24000,
    bytes: 16000,
    duration_ms: 333,
    start_offset_ms: 0,
    file_path: "/tmp/u.pcm",
    langfuse_media_id: null,
  }

  upsertMedia(db, base)
  upsertMedia(db, { ...base, kind: "assistant_audio", file_path: "/tmp/a.pcm", span_id: "span-aaa" })

  const count = db.prepare(`SELECT COUNT(*) AS c FROM media`).get() as { c: number }
  if (count.c !== 2) throw new Error(`expected 2 rows, got ${count.c}`)

  // Re-insert same (span_id, kind) with updated bytes — must UPDATE, not duplicate.
  upsertMedia(db, { ...base, bytes: 32000 })
  const again = db.prepare(`SELECT COUNT(*) AS c FROM media`).get() as { c: number }
  if (again.c !== 2) throw new Error(`expected 2 rows after upsert, got ${again.c}`)
  const row = db.prepare(`SELECT bytes FROM media WHERE span_id = ? AND kind = ?`)
    .get("span-aaa", "user_audio") as { bytes: number }
  if (row.bytes !== 32000) throw new Error(`expected bytes=32000, got ${row.bytes}`)

  // Partial upsert (no path) must NOT clobber existing file_path.
  upsertMedia(db, { ...base, file_path: null, bytes: 64000 })
  const preserved = db.prepare(`SELECT file_path, bytes FROM media WHERE span_id = ? AND kind = ?`)
    .get("span-aaa", "user_audio") as { file_path: string; bytes: number }
  if (preserved.file_path !== "/tmp/u.pcm") {
    throw new Error(`file_path got clobbered: ${preserved.file_path}`)
  }
  if (preserved.bytes !== 64000) {
    throw new Error(`bytes not updated: ${preserved.bytes}`)
  }

  // Session lookup returns rows in insertion order for that session.
  const sessionRows = db.prepare(`SELECT kind FROM media WHERE session_id = ? ORDER BY id`)
    .all("session-aaa") as { kind: string }[]
  if (sessionRows.length !== 2) {
    throw new Error(`expected 2 session rows, got ${sessionRows.length}`)
  }

  console.log("  PASS  media schema + idempotent upsert + partial-update semantics")
  console.log(`        db=${dbPath}`)
}

run().catch((err) => {
  console.error("\nTEST FAILED:", err instanceof Error ? err.message : err)
  process.exit(1)
})
