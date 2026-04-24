// OTLP-HTTP ingest: decodes the OTel ExportTraceServiceRequest protobuf sent
// by `@opentelemetry/exporter-trace-otlp-http`, extracts relevant fields, and
// writes to SQLite via db.ts.
//
// We accept both protobuf and JSON OTLP per the spec — the exporter uses
// protobuf by default; JSON is handy for curl-based testing.

// `@opentelemetry/otlp-transformer` is the OTel-JS exporter-side library, so
// its public API only exposes `deserializeResponse` (for sender-side response
// parsing). We need the reverse — decode an incoming ExportTraceServiceRequest
// body. The protobuf types are bundled in the package's generated root; we
// deep-import it to avoid pulling in protobufjs + the proto file manually.
// Pinned path: `@opentelemetry/otlp-transformer` 0.215.
import otlpRootModule from "@opentelemetry/otlp-transformer/build/esm/generated/root.js"
import { openDb, upsertTrace, upsertObservation, upsertMedia, type TraceRow, type ObservationRow, type MediaRow } from "./db.js"
import type Database from "better-sqlite3"

type ProtoType = { decode: (buf: Uint8Array) => unknown }
type OtlpRoot = {
  opentelemetry: {
    proto: {
      collector: {
        trace: {
          v1: { ExportTraceServiceRequest: ProtoType }
        }
      }
    }
  }
}
const otlpRoot = (otlpRootModule as unknown as { default?: OtlpRoot }).default
  ?? (otlpRootModule as unknown as OtlpRoot)
const ExportTraceServiceRequest =
  otlpRoot.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest

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

        // Media: when the span carries `media.<role>.path` (or a Langfuse
        // media id) from the relay's capture pipeline, insert one row per
        // modality so the tracing UI's Turns tab can locate the bytes. Each
        // (span_id, kind) is a natural key — re-emitting the same span
        // updates the existing row rather than duplicating.
        for (const row of extractMediaRows(attrs, traceId, spanId, sessionIdFromResource ?? stringAttr(attrs, "session.id"))) {
          upsertMedia(db, row)
        }

        // Update (or insert) the trace-level row. Service name hints at the
        // trace's origin; session/user come from resource attrs.
        //
        // Merge semantics:
        //  - session/user/name/input/output — first-writer-wins on first
        //    non-null value (late root span can still supply name/input if
        //    children land first).
        //  - status — "error wins": once any span in the trace is an error
        //    the trace is tagged error, regardless of arrival order. OTel
        //    StatusCode: 0=UNSET, 1=OK, 2=ERROR.
        const prev = tracesTouched.get(traceId)
        const isRoot = parentSpanId == null
        const spanStatusIsError = Number(span.status?.code ?? 0) === 2
        const nextStatus =
          prev?.status === "error" || spanStatusIsError ? "error" : (prev?.status ?? "ok")
        const merged: TraceRow = {
          trace_id: traceId,
          session_id:
            (prev?.session_id ?? sessionIdFromResource ?? stringAttr(attrs, "session.id")) ?? null,
          user_id: (prev?.user_id ?? userIdFromResource ?? stringAttr(attrs, "user.id")) ?? null,
          name: prev?.name ?? (isRoot ? span.name ?? null : null),
          start_time_ns: Math.min(prev?.start_time_ns ?? startNs ?? 0, startNs ?? Number.MAX_SAFE_INTEGER),
          end_time_ns:
            prev?.end_time_ns != null && endNs != null
              ? Math.max(prev.end_time_ns, endNs)
              : (endNs ?? prev?.end_time_ns ?? null),
          input_json:
            prev?.input_json ??
            (isRoot ? stringAttr(attrs, "langfuse.observation.input") ?? null : null),
          output_json:
            prev?.output_json ??
            (isRoot ? stringAttr(attrs, "langfuse.observation.output") ?? null : null),
          metadata_json: null,
          status: nextStatus,
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
    // JSON OTLP — the encoded values (traceId, spanId, timestamps) follow the
    // OTel JSON mapping (hex strings for ids, decimal strings for 64-bit ints).
    // Our downstream coercers already handle both hex + Uint8Array ids and
    // number/string/bigint timestamps.
    return JSON.parse(buf.toString("utf8")) as OtlpRequest
  }
  // Protobuf — decode via the generated ExportTraceServiceRequest type. Do NOT
  // use the otlp-transformer's `deserializeResponse` helper here: it decodes
  // the collector-side response body (a different proto message) so nested
  // fields silently mis-parse.
  return ExportTraceServiceRequest.decode(buf) as OtlpRequest
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

// Media rows are emitted by the relay on voice-turn spans using the vendor-
// neutral `media.<role>.*` attribute family.
//
// Per-turn (role is one of user_audio / assistant_audio / user_video):
//   `media.<role>.path`, `media.<role>.duration_ms`, ...
//
// Session-scoped (stamped on the final voice-turn span at session finalize):
//   `media.session_audio.user.path`, `media.session_audio.assistant.path`,
//   `media.session_audio.peaks_path`, `media.session_video.thumbnails_path`,
//   plus *.duration_ms and sample_rate. These become separate media rows so
//   the UI can find them via `kind` without reading raw attributes.
//
// A missing `path` + `url` + `langfuse_id` means there's nothing to serve,
// so we skip the row.
function extractMediaRows(
  attrs: Record<string, unknown>,
  traceId: string,
  spanId: string,
  sessionId: string | null,
): MediaRow[] {
  const rows: MediaRow[] = []
  const roles: { attrKey: string; kind: string }[] = [
    { attrKey: "user_audio", kind: "user_audio" },
    { attrKey: "assistant_audio", kind: "assistant_audio" },
    { attrKey: "user_video", kind: "video" },
  ]
  for (const { attrKey, kind } of roles) {
    const path = stringAttr(attrs, `media.${attrKey}.path`)
    const url = stringAttr(attrs, `media.${attrKey}.url`)
    const langfuseId = stringAttr(attrs, `media.${attrKey}.langfuse_id`)
    if (!path && !url && !langfuseId) continue
    const codec = stringAttr(attrs, `media.${attrKey}.codec`)
    const sampleRate = numberAttr(attrs, `media.${attrKey}.sample_rate`)
    const bytes = numberAttr(attrs, `media.${attrKey}.bytes`)
    const duration = numberAttr(attrs, `media.${attrKey}.duration_ms`)
    const startOffset = numberAttr(attrs, `media.${attrKey}.start_offset_ms`) ?? 0
    rows.push({
      trace_id: traceId,
      span_id: spanId,
      session_id: sessionId,
      kind,
      codec: codec ?? null,
      sample_rate_hz: sampleRate,
      bytes,
      duration_ms: duration,
      start_offset_ms: startOffset,
      file_path: path ?? null,
      langfuse_media_id: langfuseId ?? null,
    })
  }

  // Session-scoped rows. Kinds are namespaced as `session_*` so the UI can
  // distinguish these from per-turn rows without attribute-sniffing.
  const sessionSampleRate = numberAttr(attrs, "media.session_audio.sample_rate")
  const sessionUser = stringAttr(attrs, "media.session_audio.user.path")
  if (sessionUser) {
    rows.push({
      trace_id: traceId,
      span_id: spanId,
      session_id: sessionId,
      kind: "session_user_audio",
      codec: "wav_pcm_s16le",
      sample_rate_hz: sessionSampleRate,
      bytes: null,
      duration_ms: numberAttr(attrs, "media.session_audio.user.duration_ms"),
      start_offset_ms: 0,
      file_path: sessionUser,
      langfuse_media_id: null,
    })
  }
  const sessionAssistant = stringAttr(attrs, "media.session_audio.assistant.path")
  if (sessionAssistant) {
    rows.push({
      trace_id: traceId,
      span_id: spanId,
      session_id: sessionId,
      kind: "session_assistant_audio",
      codec: "wav_pcm_s16le",
      sample_rate_hz: sessionSampleRate,
      bytes: null,
      duration_ms: numberAttr(attrs, "media.session_audio.assistant.duration_ms"),
      start_offset_ms: 0,
      file_path: sessionAssistant,
      langfuse_media_id: null,
    })
  }
  const peaksPath = stringAttr(attrs, "media.session_audio.peaks_path")
  if (peaksPath) {
    rows.push({
      trace_id: traceId,
      span_id: spanId,
      session_id: sessionId,
      kind: "session_peaks",
      codec: "json",
      sample_rate_hz: sessionSampleRate,
      bytes: null,
      duration_ms: null,
      start_offset_ms: 0,
      file_path: peaksPath,
      langfuse_media_id: null,
    })
  }
  const thumbsPath = stringAttr(attrs, "media.session_video.thumbnails_path")
  if (thumbsPath) {
    rows.push({
      trace_id: traceId,
      span_id: spanId,
      session_id: sessionId,
      kind: "session_thumbnails",
      codec: "json",
      sample_rate_hz: null,
      bytes: null,
      duration_ms: null,
      start_offset_ms: 0,
      file_path: thumbsPath,
      langfuse_media_id: null,
    })
  }
  return rows
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
