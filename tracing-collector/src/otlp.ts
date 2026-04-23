// OTLP-HTTP ingest: decodes the OTel ExportTraceServiceRequest protobuf sent
// by `@opentelemetry/exporter-trace-otlp-http`, extracts relevant fields, and
// writes to SQLite via db.ts.
//
// We accept both protobuf and JSON OTLP per the spec — the exporter uses
// protobuf by default; JSON is handy for curl-based testing.

import { ProtobufTraceSerializer, JsonTraceSerializer } from "@opentelemetry/otlp-transformer"
import { openDb, upsertTrace, upsertObservation, type TraceRow, type ObservationRow } from "./db.js"
import type Database from "better-sqlite3"

type AnyValue = { stringValue?: string; intValue?: number | string; doubleValue?: number; boolValue?: boolean; kvlistValue?: { values: KeyValue[] }; arrayValue?: { values: AnyValue[] } }
type KeyValue = { key: string; value?: AnyValue }
type OtlpSpan = {
  traceId: string | Uint8Array
  spanId: string | Uint8Array
  parentSpanId?: string | Uint8Array
  name?: string
  kind?: number | string
  startTimeUnixNano?: string | number | bigint
  endTimeUnixNano?: string | number | bigint
  attributes?: KeyValue[]
  events?: Array<{ name?: string; timeUnixNano?: string | number | bigint; attributes?: KeyValue[] }>
  status?: { code?: number | string; message?: string }
}
type OtlpScopeSpans = { scope?: { name?: string; version?: string }; spans?: OtlpSpan[] }
type OtlpResourceSpans = { resource?: { attributes?: KeyValue[] }; scopeSpans?: OtlpScopeSpans[] }
type OtlpRequest = { resourceSpans?: OtlpResourceSpans[] }

const db: Database.Database = openDb()

export async function ingest(buf: Buffer, contentType: string | undefined) {
  const req = decode(buf, contentType ?? "application/x-protobuf")
  const tracesTouched = new Map<string, TraceRow>()

  for (const rs of req.resourceSpans ?? []) {
    const resourceAttrs = attrsToObject(rs.resource?.attributes ?? [])
    const serviceName = typeof resourceAttrs["service.name"] === "string" ? resourceAttrs["service.name"] : null
    const sessionIdFromResource =
      typeof resourceAttrs["session.id"] === "string" ? resourceAttrs["session.id"] : null
    const userIdFromResource =
      typeof resourceAttrs["user.id"] === "string" ? resourceAttrs["user.id"] : null

    for (const ss of rs.scopeSpans ?? []) {
      for (const span of ss.spans ?? []) {
        const attrs = attrsToObject(span.attributes ?? [])
        const traceId = toHex(span.traceId)
        const spanId = toHex(span.spanId)
        const parentSpanId = span.parentSpanId ? toHex(span.parentSpanId) : null
        const startNs = toNs(span.startTimeUnixNano)
        const endNs = toNs(span.endTimeUnixNano) ?? null
        const durationMs =
          startNs != null && endNs != null ? Math.max(0, Math.round((Number(endNs - startNs)) / 1_000_000)) : null

        // Promote usage/cost attrs into columns for fast aggregation.
        const tokensInput =
          numberAttr(attrs, "gen_ai.usage.input_tokens") ??
          extractFromUsageDetails(attrs, "input") ??
          null
        const tokensOutput =
          numberAttr(attrs, "gen_ai.usage.output_tokens") ??
          extractFromUsageDetails(attrs, "output") ??
          null
        const tokensCached =
          numberAttr(attrs, "gen_ai.usage.cache_read_input_tokens") ??
          extractFromUsageDetails(attrs, "cache_read") ??
          null

        const obs: ObservationRow = {
          span_id: spanId,
          trace_id: traceId,
          parent_span_id: parentSpanId,
          name: span.name ?? null,
          kind: span.kind != null ? String(span.kind) : null,
          observation_type: stringAttr(attrs, "langfuse.observation.type"),
          service_name: serviceName,
          start_time_ns: startNs ?? 0,
          end_time_ns: endNs,
          duration_ms: durationMs,
          status_code: span.status?.code != null ? String(span.status.code) : null,
          status_message: span.status?.message ?? null,
          attributes_json: JSON.stringify(attrs),
          events_json: span.events && span.events.length > 0 ? JSON.stringify(span.events) : null,
          model:
            stringAttr(attrs, "langfuse.observation.model.name") ??
            stringAttr(attrs, "gen_ai.request.model"),
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          tokens_cached: tokensCached,
          cost_usd: null, // TODO: compute via pricing module
        }
        upsertObservation(db, obs)

        // Update (or insert) the trace-level row. Service name hints at the
        // trace's origin; session/user come from resource attrs.
        const prev = tracesTouched.get(traceId)
        const merged: TraceRow = {
          trace_id: traceId,
          session_id:
            (prev?.session_id ?? sessionIdFromResource ?? stringAttr(attrs, "session.id")) ?? null,
          user_id: (prev?.user_id ?? userIdFromResource ?? stringAttr(attrs, "user.id")) ?? null,
          name: prev?.name ?? (parentSpanId == null ? span.name ?? null : null),
          start_time_ns: Math.min(prev?.start_time_ns ?? startNs ?? 0, startNs ?? Number.MAX_SAFE_INTEGER),
          end_time_ns:
            prev?.end_time_ns != null && endNs != null
              ? Math.max(prev.end_time_ns, endNs)
              : (endNs ?? prev?.end_time_ns ?? null),
          input_json: prev?.input_json ?? stringAttr(attrs, "langfuse.observation.input") ?? null,
          output_json: prev?.output_json ?? stringAttr(attrs, "langfuse.observation.output") ?? null,
          metadata_json: null,
          status: prev?.status ?? (span.status?.code === 2 ? "error" : "ok"),
        }
        tracesTouched.set(traceId, merged)
      }
    }
  }

  for (const t of tracesTouched.values()) {
    upsertTrace(db, t)
  }
}

function decode(buf: Buffer, contentType: string): OtlpRequest {
  if (contentType.startsWith("application/json")) {
    return JsonTraceSerializer.deserializeResponse(buf) as unknown as OtlpRequest
  }
  return ProtobufTraceSerializer.deserializeResponse(buf) as unknown as OtlpRequest
}

function attrsToObject(kvs: KeyValue[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const kv of kvs) {
    if (!kv.key) continue
    out[kv.key] = coerceAnyValue(kv.value)
  }
  return out
}

function coerceAnyValue(v: AnyValue | undefined): unknown {
  if (!v) return null
  if (v.stringValue != null) return v.stringValue
  if (v.intValue != null) return Number(v.intValue)
  if (v.doubleValue != null) return v.doubleValue
  if (v.boolValue != null) return v.boolValue
  if (v.arrayValue?.values) return v.arrayValue.values.map(coerceAnyValue)
  if (v.kvlistValue?.values) return attrsToObject(v.kvlistValue.values)
  return null
}

function toHex(val: string | Uint8Array | undefined): string {
  if (val == null) return ""
  if (typeof val === "string") return val
  return Buffer.from(val).toString("hex")
}

function toNs(val: string | number | bigint | undefined): number | null {
  if (val == null) return null
  if (typeof val === "number") return val
  if (typeof val === "bigint") return Number(val)
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

function stringAttr(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key]
  return typeof v === "string" ? v : null
}

function numberAttr(attrs: Record<string, unknown>, key: string): number | null {
  const v = attrs[key]
  return typeof v === "number" ? v : null
}

function extractFromUsageDetails(attrs: Record<string, unknown>, key: string): number | null {
  const raw = attrs["langfuse.observation.usage_details"]
  if (typeof raw !== "string") return null
  try {
    const parsed = JSON.parse(raw)
    const v = parsed?.[key]
    return typeof v === "number" ? v : null
  } catch {
    return null
  }
}
