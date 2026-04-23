// Server-only SQLite reader. The tracing-collector is the writer; we open
// the same DB file in read-only WAL mode so concurrent reads are safe.
//
// This module is safe to import only from Server Components, Route Handlers,
// or server actions. Never from client code — `better-sqlite3` is a native
// module, listed in `serverExternalPackages`.

import Database from "better-sqlite3"
import { homedir } from "node:os"
import { join } from "node:path"

const DEFAULT_PATH = join(homedir(), ".voiceclaw", "tracing.db")

let handle: Database.Database | null = null

export function db(): Database.Database {
  if (handle) return handle
  const path = process.env.VOICECLAW_TRACING_DB ?? DEFAULT_PATH
  handle = new Database(path, { readonly: true, fileMustExist: false })
  // WAL mode is persistent at the database level — set once by the collector.
  // Readers don't need to (and shouldn't) set it; we just configure a busy
  // timeout so lock contention under concurrent writes yields a clean retry
  // instead of an immediate SQLITE_BUSY.
  handle.pragma("busy_timeout = 5000")
  return handle
}

export type SessionRow = {
  session_id: string
  user_id: string | null
  started_at_ns: number
  last_activity_ns: number
  turn_count: number
  total_cost_usd: number
  total_tokens: number
  duration_ms: number
}

// Sessions view is derived from observations at query time (no materialized
// `sessions` table in v1). Groups by session_id present on any observation,
// aggregates across all traces for that session. Orphan traces without a
// session_id (e.g. direct HTTP probes bypassing the voice relay) get grouped
// into a synthetic "(no session)" bucket so they're not invisible.
export function listSessions(limit = 50, offset = 0): SessionRow[] {
  // Aggregate per session via a two-step CTE: first pre-aggregate each trace
  // so `turn_count` is one-per-trace (otherwise the JOIN fans out and turn
  // count = number of observations, not turns).
  const rows = db()
    .prepare(`
      WITH trace_totals AS (
        SELECT
          t.trace_id,
          t.session_id,
          t.user_id,
          t.start_time_ns,
          COALESCE(t.end_time_ns, t.start_time_ns) AS end_time_ns,
          COALESCE(SUM(o.cost_usd), 0) AS cost_usd,
          COALESCE(SUM(COALESCE(o.tokens_input, 0) + COALESCE(o.tokens_output, 0)), 0) AS tokens
        FROM traces t
        LEFT JOIN observations o ON o.trace_id = t.trace_id
        GROUP BY t.trace_id
      )
      SELECT
        COALESCE(session_id, '(no session)')         AS session_id,
        MAX(user_id)                                 AS user_id,
        MIN(start_time_ns)                           AS started_at_ns,
        MAX(end_time_ns)                             AS last_activity_ns,
        COUNT(*)                                     AS turn_count,
        COALESCE(SUM(cost_usd), 0)                   AS total_cost_usd,
        COALESCE(SUM(tokens), 0)                     AS total_tokens,
        CAST((MAX(end_time_ns) - MIN(start_time_ns)) / 1000000 AS INTEGER) AS duration_ms
      FROM trace_totals
      GROUP BY COALESCE(session_id, '(no session)')
      ORDER BY last_activity_ns DESC
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset) as SessionRow[]
  return rows
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
  status: string | null
}

export function listTracesForSession(sessionId: string): TraceRow[] {
  if (sessionId === "(no session)") {
    return db()
      .prepare(`
        SELECT trace_id, session_id, user_id, name, start_time_ns, end_time_ns, input_json, output_json, status
        FROM traces
        WHERE session_id IS NULL
        ORDER BY start_time_ns ASC
      `)
      .all() as TraceRow[]
  }
  return db()
    .prepare(`
      SELECT trace_id, session_id, user_id, name, start_time_ns, end_time_ns, input_json, output_json, status
      FROM traces
      WHERE session_id = ?
      ORDER BY start_time_ns ASC
    `)
    .all(sessionId) as TraceRow[]
}

export type ObservationRow = {
  span_id: string
  trace_id: string
  parent_span_id: string | null
  name: string | null
  observation_type: string | null
  service_name: string | null
  start_time_ns: number
  end_time_ns: number | null
  duration_ms: number | null
  status_code: string | null
  attributes_json: string | null
  model: string | null
  tokens_input: number | null
  tokens_output: number | null
  tokens_cached: number | null
  cost_usd: number | null
}

export function listObservationsForTrace(traceId: string): ObservationRow[] {
  return db()
    .prepare(`
      SELECT span_id, trace_id, parent_span_id, name, observation_type, service_name,
             start_time_ns, end_time_ns, duration_ms, status_code, attributes_json,
             model, tokens_input, tokens_output, tokens_cached, cost_usd
      FROM observations
      WHERE trace_id = ?
      ORDER BY start_time_ns ASC
    `)
    .all(traceId) as ObservationRow[]
}

export function listObservationsForSession(sessionId: string): ObservationRow[] {
  const cols = `o.span_id, o.trace_id, o.parent_span_id, o.name, o.observation_type, o.service_name,
                o.start_time_ns, o.end_time_ns, o.duration_ms, o.status_code, o.attributes_json,
                o.model, o.tokens_input, o.tokens_output, o.tokens_cached, o.cost_usd`
  if (sessionId === "(no session)") {
    return db()
      .prepare(`
        SELECT ${cols}
        FROM observations o
        JOIN traces t ON t.trace_id = o.trace_id
        WHERE t.session_id IS NULL
        ORDER BY o.start_time_ns ASC
      `)
      .all() as ObservationRow[]
  }
  return db()
    .prepare(`
      SELECT ${cols}
      FROM observations o
      JOIN traces t ON t.trace_id = o.trace_id
      WHERE t.session_id = ?
      ORDER BY o.start_time_ns ASC
    `)
    .all(sessionId) as ObservationRow[]
}
