// Test: tracing-ui db.ts reads media rows + observations with events_json.
// Spins up a disposable SQLite file, seeds a trace + span + media row, then
// asserts the reader helpers return what the Turns tab expects.
//
// Run: cd tracing-ui && yarn tsx test/test-turns-reader.ts

import Database from "better-sqlite3"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

async function run() {
  const root = mkdtempSync(join(tmpdir(), "voiceclaw-ui-reader-"))
  const dbPath = join(root, "tracing.db")
  process.env.VOICECLAW_TRACING_DB = dbPath

  // Seed via a writable handle that mirrors the collector's schema.
  const w = new Database(dbPath)
  w.pragma("journal_mode = WAL")
  w.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL UNIQUE,
      session_id TEXT, user_id TEXT, name TEXT,
      start_time_ns INTEGER, end_time_ns INTEGER,
      input_json TEXT, output_json TEXT, metadata_json TEXT, status TEXT
    );
    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      span_id TEXT NOT NULL UNIQUE,
      trace_id TEXT NOT NULL, parent_span_id TEXT,
      name TEXT, kind TEXT, observation_type TEXT, service_name TEXT,
      start_time_ns INTEGER, end_time_ns INTEGER, duration_ms INTEGER,
      status_code TEXT, status_message TEXT,
      attributes_json TEXT, events_json TEXT, model TEXT,
      tokens_input INTEGER, tokens_output INTEGER, tokens_cached INTEGER, cost_usd REAL
    );
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL, span_id TEXT, session_id TEXT,
      kind TEXT NOT NULL, codec TEXT, sample_rate_hz INTEGER, bytes INTEGER,
      duration_ms INTEGER, start_offset_ms INTEGER,
      file_path TEXT, langfuse_media_id TEXT, created_at INTEGER,
      UNIQUE(span_id, kind)
    );
  `)

  const traceId = "aa" + "0".repeat(30)
  const spanId = "b".repeat(16)
  w.prepare(`INSERT INTO traces (trace_id, session_id, name, start_time_ns, end_time_ns, status) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(traceId, "session-ui", "voice-turn", 1_000_000_000, 2_000_000_000, "ok")
  w.prepare(`INSERT INTO observations (span_id, trace_id, name, service_name, start_time_ns, end_time_ns, duration_ms, status_code, attributes_json, events_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      spanId, traceId, "voice-turn", "voiceclaw-relay",
      1_000_000_000, 2_000_000_000, 1000, "1",
      JSON.stringify({
        "gen_ai.tool.input": JSON.stringify({ hello: "world" }),
        "gen_ai.tool.output": "tool result text",
        "langfuse.observation.input": "legacy-input",
      }),
      JSON.stringify([{ name: "first_token", timeUnixNano: "1100000000" }]),
    )
  w.prepare(`INSERT INTO media (trace_id, span_id, session_id, kind, codec, sample_rate_hz, bytes, duration_ms, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(traceId, spanId, "session-ui", "user_audio", "pcm_s16le", 24000, 24000, 500, "/tmp/u.pcm", Date.now())
  w.close()

  const { listMediaForSession, listObservationsForTrace, listTracesWithObservationsForSession } =
    await import("../src/lib/db.js")

  const media = listMediaForSession("session-ui")
  if (media.length !== 1) throw new Error(`expected 1 media row, got ${media.length}`)
  if (media[0].file_path !== "/tmp/u.pcm") throw new Error(`bad file_path: ${media[0].file_path}`)
  if (media[0].sample_rate_hz !== 24000) throw new Error(`bad sample_rate: ${media[0].sample_rate_hz}`)

  const obs = listObservationsForTrace(traceId)
  if (obs.length !== 1) throw new Error(`expected 1 obs, got ${obs.length}`)
  if (!obs[0].events_json || !obs[0].events_json.includes("first_token")) {
    throw new Error(`events_json not returned: ${obs[0].events_json}`)
  }
  if (!obs[0].attributes_json || !obs[0].attributes_json.includes("gen_ai.tool.input")) {
    throw new Error(`attributes missing gen_ai.tool.input: ${obs[0].attributes_json}`)
  }

  const traces = listTracesWithObservationsForSession("session-ui")
  if (traces.length !== 1) throw new Error(`expected 1 trace, got ${traces.length}`)
  if (traces[0].observations.length !== 1) {
    throw new Error(`expected 1 obs under trace, got ${traces[0].observations.length}`)
  }

  console.log("  PASS  tracing-ui reader returns media + events_json + tool input/output attrs")

  rmSync(root, { recursive: true, force: true })
}

run().catch((err) => {
  console.error("\nTEST FAILED:", err instanceof Error ? err.message : err)
  process.exit(1)
})
