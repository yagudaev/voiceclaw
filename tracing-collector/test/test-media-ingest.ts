// Test: OTLP JSON ingest with media.* attributes populates the media table.
//
// Uses JSON OTLP (accepted by ingest() directly) so we don't need the full
// protobuf encoder. This is the contract the relay will honor when emitting
// media attrs on voice-turn spans.
//
// Run: npx tsx test/test-media-ingest.ts

import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import Database from "better-sqlite3"
import { tmpdir } from "node:os"
import { join } from "node:path"

async function run() {
  const root = mkdtempSync(join(tmpdir(), "voiceclaw-ingest-"))
  const dbPath = join(root, "tracing.db")
  process.env.VOICECLAW_TRACING_DB = dbPath

  // Import AFTER setting the env var — openDb reads it at module load time.
  const { ingest } = await import("../src/otlp.js")

  const traceId = "0102030405060708090a0b0c0d0e0f10"
  const spanId = "aabbccddeeff0011"
  const now = Date.now() * 1_000_000

  const payload = {
    resourceSpans: [{
      resource: {
        attributes: [
          { key: "service.name", value: { stringValue: "voiceclaw-relay" } },
          { key: "session.id", value: { stringValue: "session-xyz" } },
        ],
      },
      scopeSpans: [{
        scope: { name: "voiceclaw-test" },
        spans: [{
          traceId,
          spanId,
          name: "voice-turn",
          startTimeUnixNano: String(now),
          endTimeUnixNano: String(now + 800_000_000),
          status: { code: 1 },
          attributes: [
            { key: "media.user_audio.path", value: { stringValue: "/tmp/u.pcm" } },
            { key: "media.user_audio.duration_ms", value: { intValue: 500 } },
            { key: "media.user_audio.sample_rate", value: { intValue: 24000 } },
            { key: "media.user_audio.codec", value: { stringValue: "pcm_s16le" } },
            { key: "media.user_audio.bytes", value: { intValue: 24000 } },
            { key: "media.assistant_audio.path", value: { stringValue: "/tmp/a.pcm" } },
            { key: "media.assistant_audio.duration_ms", value: { intValue: 300 } },
            { key: "media.user_video.path", value: { stringValue: "/tmp/video/" } },
            { key: "media.user_video.frame_count", value: { intValue: 5 } },
          ],
        }],
      }],
    }],
  }

  const buf = Buffer.from(JSON.stringify(payload), "utf8")
  await ingest(buf, "application/json")

  const db = new Database(dbPath, { readonly: true })
  const rows = db.prepare(
    `SELECT kind, file_path, duration_ms, sample_rate_hz, codec
     FROM media WHERE trace_id = ? ORDER BY kind`,
  ).all(traceId) as {
    kind: string; file_path: string; duration_ms: number;
    sample_rate_hz: number | null; codec: string | null
  }[]

  if (rows.length !== 3) {
    throw new Error(`expected 3 media rows (user_audio + assistant_audio + video), got ${rows.length}: ${JSON.stringify(rows)}`)
  }
  const byKind = new Map(rows.map((r) => [r.kind, r]))
  const user = byKind.get("user_audio")
  if (!user || user.file_path !== "/tmp/u.pcm" || user.duration_ms !== 500 || user.sample_rate_hz !== 24000) {
    throw new Error(`user_audio row wrong: ${JSON.stringify(user)}`)
  }
  const assistant = byKind.get("assistant_audio")
  if (!assistant || assistant.file_path !== "/tmp/a.pcm") {
    throw new Error(`assistant_audio row wrong: ${JSON.stringify(assistant)}`)
  }
  const video = byKind.get("video")
  if (!video || video.file_path !== "/tmp/video/") {
    throw new Error(`video row wrong: ${JSON.stringify(video)}`)
  }

  const session = db.prepare(`SELECT session_id FROM media WHERE trace_id = ? LIMIT 1`).get(traceId) as { session_id: string }
  if (session.session_id !== "session-xyz") {
    throw new Error(`session_id not propagated: ${session.session_id}`)
  }

  // Re-emit the same span (simulating a span update) — count must stay at 3.
  await ingest(buf, "application/json")
  const again = db.prepare(`SELECT COUNT(*) AS c FROM media WHERE trace_id = ?`).get(traceId) as { c: number }
  if (again.c !== 3) {
    throw new Error(`expected 3 rows after re-ingest (idempotent), got ${again.c}`)
  }

  console.log("  PASS  OTLP ingest writes media rows with expected columns")
  console.log("  PASS  re-ingest is idempotent (no duplicates)")

  db.close()
  rmSync(root, { recursive: true, force: true })
  // Touch writeFileSync + existsSync so unused-import check doesn't complain.
  void writeFileSync; void existsSync
}

run().catch((err) => {
  console.error("\nTEST FAILED:", err instanceof Error ? err.message : err)
  process.exit(1)
})
