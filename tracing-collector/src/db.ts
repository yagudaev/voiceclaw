// SQLite schema + prepared writes for the tracing collector.
//
// WAL mode + single-writer (the collector's ingest loop is single-threaded),
// multi-reader (the Next.js UI server opens the same file read-only). Schema
// evolution handled via explicit migrations array — additive-only at this
// stage since we're pre-release.

import Database from "better-sqlite3"
import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

const DEFAULT_PATH = join(homedir(), ".voiceclaw", "tracing.db")

export function openDb(path: string = process.env.VOICECLAW_TRACING_DB ?? DEFAULT_PATH) {
  mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma("journal_mode = WAL")
  db.pragma("synchronous = NORMAL")
  db.pragma("foreign_keys = ON")
  migrate(db)
  return db
}

export type TraceRow = {
  trace_id: string
  session_id: string | null
  user_id: string | null
  name: string | null
  start_time_ns: number
  end_time_ns: number | null
  input_json: string | null
  output_json: string | null
  metadata_json: string | null
  status: string | null
}

export type ObservationRow = {
  span_id: string
  trace_id: string
  parent_span_id: string | null
  name: string | null
  kind: string | null
  observation_type: string | null
  service_name: string | null
  start_time_ns: number
  end_time_ns: number | null
  duration_ms: number | null
  status_code: string | null
  status_message: string | null
  attributes_json: string | null
  events_json: string | null
  model: string | null
  tokens_input: number | null
  tokens_output: number | null
  tokens_cached: number | null
  cost_usd: number | null
}

export function upsertTrace(db: Database.Database, t: TraceRow) {
  upsertTraceStmt(db).run(t)
}

export function upsertObservation(db: Database.Database, o: ObservationRow) {
  upsertObservationStmt(db).run(o)
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id      TEXT NOT NULL UNIQUE,
      session_id    TEXT,
      user_id       TEXT,
      name          TEXT,
      start_time_ns INTEGER,
      end_time_ns   INTEGER,
      input_json    TEXT,
      output_json   TEXT,
      metadata_json TEXT,
      status        TEXT
    );
    CREATE INDEX IF NOT EXISTS traces_session ON traces(session_id, start_time_ns);
    CREATE INDEX IF NOT EXISTS traces_user    ON traces(user_id, start_time_ns);

    CREATE TABLE IF NOT EXISTS observations (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      span_id           TEXT NOT NULL UNIQUE,
      trace_id          TEXT NOT NULL,
      parent_span_id    TEXT,
      name              TEXT,
      kind              TEXT,
      observation_type  TEXT,
      service_name      TEXT,
      start_time_ns     INTEGER,
      end_time_ns       INTEGER,
      duration_ms       INTEGER,
      status_code       TEXT,
      status_message    TEXT,
      attributes_json   TEXT,
      events_json       TEXT,
      model             TEXT,
      tokens_input      INTEGER,
      tokens_output     INTEGER,
      tokens_cached     INTEGER,
      cost_usd          REAL
    );
    CREATE INDEX IF NOT EXISTS obs_trace   ON observations(trace_id, start_time_ns);
    CREATE INDEX IF NOT EXISTS obs_parent  ON observations(parent_span_id);
    CREATE INDEX IF NOT EXISTS obs_service ON observations(service_name, start_time_ns);

    CREATE TABLE IF NOT EXISTS sessions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id     TEXT NOT NULL UNIQUE,
      user_id        TEXT,
      started_at_ns  INTEGER,
      last_activity  INTEGER,
      turn_count     INTEGER,
      total_cost_usd REAL,
      total_tokens   INTEGER,
      duration_ms    INTEGER
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id, last_activity DESC);

    CREATE TABLE IF NOT EXISTS media (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id           TEXT NOT NULL,
      span_id            TEXT,
      session_id         TEXT,
      kind               TEXT NOT NULL,
      codec              TEXT,
      sample_rate_hz     INTEGER,
      bytes              INTEGER,
      duration_ms        INTEGER,
      start_offset_ms    INTEGER,
      file_path          TEXT,
      langfuse_media_id  TEXT,
      created_at         INTEGER
    );
    CREATE INDEX IF NOT EXISTS media_session ON media(session_id, kind, start_offset_ms);
  `)
}

// Prepared statement cache — one per DB handle.
const upsertTraceStmtCache = new WeakMap<Database.Database, Database.Statement<TraceRow>>()
const upsertObsStmtCache = new WeakMap<Database.Database, Database.Statement<ObservationRow>>()

function upsertTraceStmt(db: Database.Database): Database.Statement<TraceRow> {
  const existing = upsertTraceStmtCache.get(db)
  if (existing) return existing
  const stmt = db.prepare<TraceRow>(`
    INSERT INTO traces (trace_id, session_id, user_id, name, start_time_ns, end_time_ns, input_json, output_json, metadata_json, status)
    VALUES (@trace_id, @session_id, @user_id, @name, @start_time_ns, @end_time_ns, @input_json, @output_json, @metadata_json, @status)
    ON CONFLICT(trace_id) DO UPDATE SET
      session_id    = COALESCE(excluded.session_id,    traces.session_id),
      user_id       = COALESCE(excluded.user_id,       traces.user_id),
      name          = COALESCE(excluded.name,          traces.name),
      start_time_ns = MIN(excluded.start_time_ns,      traces.start_time_ns),
      end_time_ns   = MAX(excluded.end_time_ns,        traces.end_time_ns),
      input_json    = COALESCE(excluded.input_json,    traces.input_json),
      output_json   = COALESCE(excluded.output_json,   traces.output_json),
      metadata_json = COALESCE(excluded.metadata_json, traces.metadata_json),
      status        = COALESCE(excluded.status,        traces.status)
  `)
  upsertTraceStmtCache.set(db, stmt)
  return stmt
}

function upsertObservationStmt(db: Database.Database): Database.Statement<ObservationRow> {
  const existing = upsertObsStmtCache.get(db)
  if (existing) return existing
  const stmt = db.prepare<ObservationRow>(`
    INSERT INTO observations (
      span_id, trace_id, parent_span_id, name, kind, observation_type, service_name,
      start_time_ns, end_time_ns, duration_ms, status_code, status_message,
      attributes_json, events_json, model,
      tokens_input, tokens_output, tokens_cached, cost_usd
    )
    VALUES (
      @span_id, @trace_id, @parent_span_id, @name, @kind, @observation_type, @service_name,
      @start_time_ns, @end_time_ns, @duration_ms, @status_code, @status_message,
      @attributes_json, @events_json, @model,
      @tokens_input, @tokens_output, @tokens_cached, @cost_usd
    )
    ON CONFLICT(span_id) DO UPDATE SET
      end_time_ns      = COALESCE(excluded.end_time_ns,     observations.end_time_ns),
      duration_ms      = COALESCE(excluded.duration_ms,     observations.duration_ms),
      status_code      = COALESCE(excluded.status_code,     observations.status_code),
      status_message   = COALESCE(excluded.status_message,  observations.status_message),
      attributes_json  = COALESCE(excluded.attributes_json, observations.attributes_json),
      events_json      = COALESCE(excluded.events_json,     observations.events_json),
      model            = COALESCE(excluded.model,           observations.model),
      tokens_input     = COALESCE(excluded.tokens_input,    observations.tokens_input),
      tokens_output    = COALESCE(excluded.tokens_output,   observations.tokens_output),
      tokens_cached    = COALESCE(excluded.tokens_cached,   observations.tokens_cached),
      cost_usd         = COALESCE(excluded.cost_usd,        observations.cost_usd)
  `)
  upsertObsStmtCache.set(db, stmt)
  return stmt
}
