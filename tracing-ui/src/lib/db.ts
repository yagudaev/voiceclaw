// Server-only Prisma reader. The tracing-collector is the writer; we open
// the same SQLite file through Prisma for typed reads. Concurrent reads are
// safe because the collector sets WAL mode at startup — Prisma's SQLite
// driver does not re-issue `journal_mode` on connect.
//
// This module must only be imported from Server Components, Route Handlers,
// or server actions. Public function signatures match the previous raw-SQL
// reader so no caller changes are required.

import { Prisma, PrismaClient } from "@prisma/client"
import { homedir } from "node:os"
import { join } from "node:path"

const DEFAULT_PATH = join(homedir(), ".voiceclaw", "tracing.db")

// Singleton Prisma client. In dev, Next.js hot-reloads the module graph on
// every request; stash the client on globalThis to avoid connection churn.
const globalForPrisma = globalThis as unknown as { __vcTracingPrisma?: PrismaClient }

export const prisma: PrismaClient =
  globalForPrisma.__vcTracingPrisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDbUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.__vcTracingPrisma = prisma

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

// Sessions view is derived from traces + observations at query time. Uses a
// CTE to aggregate per-trace first so `turn_count` stays one-per-trace and
// doesn't fan out over the observations join.
export async function listSessions(limit = 50, offset = 0): Promise<SessionRow[]> {
  const rows = await prisma.$queryRaw<RawSessionRow[]>(Prisma.sql`
    WITH trace_totals AS (
      SELECT
        t.trace_id,
        t.session_id,
        t.user_id,
        CAST(t.start_time_ns AS REAL) AS start_time_ns,
        CAST(COALESCE(t.end_time_ns, t.start_time_ns) AS REAL) AS end_time_ns,
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
      CAST((MAX(end_time_ns) - MIN(start_time_ns)) / 1000000 AS REAL) AS duration_ms
    FROM trace_totals
    GROUP BY COALESCE(session_id, '(no session)')
    ORDER BY last_activity_ns DESC
    LIMIT ${limit} OFFSET ${offset}
  `)
  return rows.map((r) => ({
    session_id: r.session_id,
    user_id: r.user_id,
    started_at_ns: toNumber(r.started_at_ns) ?? 0,
    last_activity_ns: toNumber(r.last_activity_ns) ?? 0,
    turn_count: toNumber(r.turn_count) ?? 0,
    total_cost_usd: toNumber(r.total_cost_usd) ?? 0,
    total_tokens: toNumber(r.total_tokens) ?? 0,
    duration_ms: toNumber(r.duration_ms) ?? 0,
  }))
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

// We use $queryRaw for the trace/observation fetches because Prisma's SQLite
// connector rejects INTEGER column values > INT32 even on raw queries — the
// engine performs a range check based on the live column type regardless of
// the schema field type or cast level. Our start_time_ns values are
// nanosecond timestamps (≈ 1.8e18), so we CAST them to REAL in SQL so Prisma
// sees a REAL column at the wire level. Precision loss is below the
// microsecond floor, which is well below the display resolution the UI uses
// (everything is shown in ms). See the PR description for the writeup.
export async function listTracesForSession(sessionId: string): Promise<TraceRow[]> {
  if (sessionId === "(no session)") {
    const rows = await prisma.$queryRaw<RawTraceRow[]>(Prisma.sql`
      SELECT trace_id, session_id, user_id, name,
             CAST(start_time_ns AS REAL) AS start_time_ns,
             CAST(end_time_ns   AS REAL) AS end_time_ns,
             input_json, output_json, status
      FROM traces
      WHERE session_id IS NULL
      ORDER BY start_time_ns ASC
    `)
    return rows.map(toTraceRow)
  }
  const rows = await prisma.$queryRaw<RawTraceRow[]>(Prisma.sql`
    SELECT trace_id, session_id, user_id, name,
           CAST(start_time_ns AS REAL) AS start_time_ns,
           CAST(end_time_ns   AS REAL) AS end_time_ns,
           input_json, output_json, status
    FROM traces
    WHERE session_id = ${sessionId}
    ORDER BY start_time_ns ASC
  `)
  return rows.map(toTraceRow)
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

export async function listObservationsForTrace(traceId: string): Promise<ObservationRow[]> {
  const rows = await prisma.$queryRaw<RawObservationRow[]>(Prisma.sql`
    SELECT ${OBSERVATION_COLS}
    FROM observations
    WHERE trace_id = ${traceId}
    ORDER BY start_time_ns ASC
  `)
  return rows.map(toObservationRow)
}

export async function listObservationsForSession(sessionId: string): Promise<ObservationRow[]> {
  if (sessionId === "(no session)") {
    const rows = await prisma.$queryRaw<RawObservationRow[]>(Prisma.sql`
      SELECT ${OBSERVATION_COLS_PREFIXED}
      FROM observations o
      JOIN traces t ON t.trace_id = o.trace_id
      WHERE t.session_id IS NULL
      ORDER BY o.start_time_ns ASC
    `)
    return rows.map(toObservationRow)
  }
  const rows = await prisma.$queryRaw<RawObservationRow[]>(Prisma.sql`
    SELECT ${OBSERVATION_COLS_PREFIXED}
    FROM observations o
    JOIN traces t ON t.trace_id = o.trace_id
    WHERE t.session_id = ${sessionId}
    ORDER BY o.start_time_ns ASC
  `)
  return rows.map(toObservationRow)
}

// Grouped fetch: traces for the session with their observations nested under
// each trace. Returned in trace-start order, observations in span-start order.
export type TraceWithObservations = TraceRow & { observations: ObservationRow[] }

export async function listTracesWithObservationsForSession(
  sessionId: string,
): Promise<TraceWithObservations[]> {
  const [traces, obs] = await Promise.all([
    listTracesForSession(sessionId),
    listObservationsForSession(sessionId),
  ])
  if (traces.length === 0) return []
  const byTrace = new Map<string, ObservationRow[]>()
  for (const t of traces) byTrace.set(t.trace_id, [])
  for (const o of obs) {
    const bucket = byTrace.get(o.trace_id)
    if (bucket) bucket.push(o)
  }
  return traces.map((t) => ({ ...t, observations: byTrace.get(t.trace_id) ?? [] }))
}

// Voice-turn spans only, with parsed input/output. The `voice-turn` span is
// emitted once per turn by the relay and carries the user utterance (input as
// chat-format JSON) and the assistant reply (output as plain text or JSON).
export type VoiceTurn = {
  trace_id: string
  span_id: string
  start_time_ns: number
  end_time_ns: number | null
  duration_ms: number | null
  status_code: string | null
  model: string | null
  // Parsed messages from langfuse.observation.input — usually a JSON array of
  // {role, content} messages, though callers may send a single string.
  input_messages: ChatMessage[]
  // Parsed output — string by default, but some services emit JSON.
  output_text: string
  attributes: Record<string, unknown>
}

export type ChatMessage = {
  role: string
  content: string
}

export async function getVoiceTurnsForSession(sessionId: string): Promise<VoiceTurn[]> {
  const obs = (await listObservationsForSession(sessionId)).filter(
    (o) => o.name === "voice-turn",
  )
  return obs.map((o) => {
    const attrs = parseJson<Record<string, unknown>>(o.attributes_json) ?? {}
    const rawInput = (attrs["langfuse.observation.input"] as unknown) ?? null
    const rawOutput = (attrs["langfuse.observation.output"] as unknown) ?? null
    return {
      trace_id: o.trace_id,
      span_id: o.span_id,
      start_time_ns: o.start_time_ns,
      end_time_ns: o.end_time_ns,
      duration_ms: o.duration_ms,
      status_code: o.status_code,
      model: o.model,
      input_messages: coerceMessages(rawInput),
      output_text: coerceText(rawOutput),
      attributes: attrs,
    }
  })
}

// -- helpers ---------------------------------------------------------------

// We accept VOICECLAW_TRACING_DB (legacy, plain path used by the collector)
// or VOICECLAW_TRACING_DB_URL (Prisma-style, already `file:…` prefixed).
// Falling back to the default path keeps local dev friction-free.
function resolveDbUrl(): string {
  const fromUrl = process.env.VOICECLAW_TRACING_DB_URL
  if (fromUrl && fromUrl.length > 0) return fromUrl
  const fromPath = process.env.VOICECLAW_TRACING_DB ?? DEFAULT_PATH
  return fromPath.startsWith("file:") ? fromPath : `file:${fromPath}`
}

type RawSessionRow = {
  session_id: string
  user_id: string | null
  started_at_ns: bigint | number | null
  last_activity_ns: bigint | number | null
  turn_count: bigint | number
  total_cost_usd: bigint | number | null
  total_tokens: bigint | number | null
  duration_ms: bigint | number | null
}

type RawTraceRow = {
  trace_id: string
  session_id: string | null
  user_id: string | null
  name: string | null
  start_time_ns: bigint | number | null
  end_time_ns: bigint | number | null
  input_json: string | null
  output_json: string | null
  status: string | null
}

type RawObservationRow = {
  span_id: string
  trace_id: string
  parent_span_id: string | null
  name: string | null
  observation_type: string | null
  service_name: string | null
  start_time_ns: bigint | number | null
  end_time_ns: bigint | number | null
  duration_ms: bigint | number | null
  status_code: string | null
  attributes_json: string | null
  model: string | null
  tokens_input: bigint | number | null
  tokens_output: bigint | number | null
  tokens_cached: bigint | number | null
  cost_usd: number | null
}

// start_time_ns / end_time_ns are cast to REAL so Prisma's INT overflow
// check on the SQLite column doesn't fire — see listTracesForSession for
// the writeup. duration_ms, tokens_* stay INTEGER because they never come
// close to the INT32 boundary.
const OBSERVATION_COLS = Prisma.raw(
  `span_id, trace_id, parent_span_id, name, observation_type, service_name,
   CAST(start_time_ns AS REAL) AS start_time_ns,
   CAST(end_time_ns   AS REAL) AS end_time_ns,
   duration_ms, status_code, attributes_json,
   model, tokens_input, tokens_output, tokens_cached, cost_usd`,
)

const OBSERVATION_COLS_PREFIXED = Prisma.raw(
  `o.span_id, o.trace_id, o.parent_span_id, o.name, o.observation_type, o.service_name,
   CAST(o.start_time_ns AS REAL) AS start_time_ns,
   CAST(o.end_time_ns   AS REAL) AS end_time_ns,
   o.duration_ms, o.status_code, o.attributes_json,
   o.model, o.tokens_input, o.tokens_output, o.tokens_cached, o.cost_usd`,
)

function toTraceRow(r: RawTraceRow): TraceRow {
  return {
    trace_id: r.trace_id,
    session_id: r.session_id,
    user_id: r.user_id,
    name: r.name,
    start_time_ns: toNumber(r.start_time_ns) ?? 0,
    end_time_ns: toNumber(r.end_time_ns),
    input_json: r.input_json,
    output_json: r.output_json,
    status: r.status,
  }
}

function toObservationRow(r: RawObservationRow): ObservationRow {
  return {
    span_id: r.span_id,
    trace_id: r.trace_id,
    parent_span_id: r.parent_span_id,
    name: r.name,
    observation_type: r.observation_type,
    service_name: r.service_name,
    start_time_ns: toNumber(r.start_time_ns) ?? 0,
    end_time_ns: toNumber(r.end_time_ns),
    duration_ms: toNumber(r.duration_ms),
    status_code: r.status_code,
    attributes_json: r.attributes_json,
    model: r.model,
    tokens_input: toNumber(r.tokens_input),
    tokens_output: toNumber(r.tokens_output),
    tokens_cached: toNumber(r.tokens_cached),
    cost_usd: r.cost_usd,
  }
}

function toNumber(v: bigint | number | null | undefined): number | null {
  if (v == null) return null
  return typeof v === "bigint" ? Number(v) : v
}

function parseJson<T>(s: string | null | undefined): T | null {
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function coerceMessages(raw: unknown): ChatMessage[] {
  if (raw == null) return []
  // langfuse stores input as a string-encoded JSON blob in attributes_json.
  if (typeof raw === "string") {
    const parsed = parseJson<unknown>(raw)
    if (parsed == null) return [{ role: "user", content: raw }]
    return coerceMessages(parsed)
  }
  if (Array.isArray(raw)) {
    return raw
      .map((m) => {
        if (m && typeof m === "object") {
          const role = String((m as { role?: unknown }).role ?? "user")
          const content = coerceText((m as { content?: unknown }).content)
          return { role, content }
        }
        return { role: "user", content: coerceText(m) }
      })
      .filter((m) => m.content.length > 0)
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    if (typeof obj.role === "string") {
      return [{ role: obj.role, content: coerceText(obj.content) }]
    }
    return [{ role: "user", content: JSON.stringify(raw) }]
  }
  return [{ role: "user", content: String(raw) }]
}

function coerceText(raw: unknown): string {
  if (raw == null) return ""
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) {
    // Anthropic-style content blocks: [{type:"text", text:"…"}]
    return raw
      .map((b) => {
        if (b && typeof b === "object") {
          const bb = b as Record<string, unknown>
          if (typeof bb.text === "string") return bb.text
          if (typeof bb.content === "string") return bb.content
        }
        if (typeof b === "string") return b
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    if (typeof obj.text === "string") return obj.text
    if (typeof obj.content === "string") return obj.content
    return JSON.stringify(raw)
  }
  return String(raw)
}
