import type { ObservationRow, TraceWithObservations } from "@/lib/db"
import { LATENCY_CATEGORIES, type LatencyCategory } from "./LatencyTab.shared"
import { LatencyStackedBar, type CategoryStats, type CategoryStatsMap } from "./LatencyStackedBar"

const TTFT_TOOLTIP =
  "Time to first token. For audio, the first token is the first audio frame. For video, the first video frame. For text, the first text chunk."

export function LatencyTab({ traces }: { traces: TraceWithObservations[] }) {
  if (traces.length === 0) {
    return <div className="px-6 py-8 text-sm text-zinc-400">No turns on this session yet.</div>
  }

  const perTurn = traces.map((t) => ({
    trace_id: t.trace_id,
    start_ns: t.start_time_ns,
    name: t.name ?? "(unnamed)",
    total_ms:
      t.end_time_ns != null ? Math.max(0, Math.round((Number(t.end_time_ns) - Number(t.start_time_ns)) / 1e6)) : 0,
    ttft_ms: extractTtftMs(t),
    split: categorise(t.observations),
  }))

  const turnCount = traces.length
  const avgTurnMs =
    turnCount > 0
      ? Math.round(perTurn.reduce((acc, t) => acc + t.total_ms, 0) / turnCount)
      : 0

  // Bar width = avg ms per category for a representative turn. Tooltip
  // surfaces avg / p50 / p95 / min / max / total / count so the summary
  // doubles as a mini-histogram.
  const stats = computeCategoryStats(perTurn)

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total turns" value={turnCount.toLocaleString()} />
        <KpiCard label="Avg turn latency" value={`${avgTurnMs.toLocaleString()}ms`} />
        <KpiCard
          label="Total time"
          value={`${perTurn.reduce((acc, t) => acc + t.total_ms, 0).toLocaleString()}ms`}
        />
        <KpiCard label="Tracked categories" value={String(LATENCY_CATEGORIES.length)} />
      </div>

      <div className="rounded border border-zinc-800 p-4 space-y-3">
        <div className="text-xs uppercase tracking-wide text-zinc-500">
          Avg turn breakdown{" "}
          <span className="normal-case tracking-normal text-zinc-600">
            — hover a segment for details
          </span>
        </div>
        <LatencyStackedBar stats={stats} />
        <Legend />
      </div>

      <div className="rounded border border-zinc-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Trace</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
              <th
                className="px-3 py-2 font-medium text-right"
                title={TTFT_TOOLTIP}
              >
                TTFT
                <span className="ml-1 text-zinc-600 cursor-help" aria-hidden>
                  ⓘ
                </span>
              </th>
              {LATENCY_CATEGORIES.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium text-right">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perTurn.map((t, i) => (
              <tr key={t.trace_id} className="border-t border-zinc-800">
                <td className="px-3 py-2 tabular-nums text-zinc-400">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-zinc-500">
                  {t.trace_id.slice(0, 12)}…{" "}
                  <span className="text-zinc-600">({t.name})</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-100">
                  {t.total_ms.toLocaleString()}ms
                </td>
                <td
                  className="px-3 py-2 text-right tabular-nums text-zinc-300"
                  title={t.ttft_ms == null ? "TTFT not emitted by relay for this turn" : undefined}
                >
                  {t.ttft_ms != null ? `${t.ttft_ms.toLocaleString()}ms` : "—"}
                </td>
                {LATENCY_CATEGORIES.map((c) => (
                  <td
                    key={c.key}
                    className="px-3 py-2 text-right tabular-nums text-zinc-300"
                  >
                    {t.split[c.key] > 0 ? `${t.split[c.key].toLocaleString()}ms` : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-zinc-500">
        <span className="text-zinc-400">TTFT</span> — {TTFT_TOOLTIP} Pulled from{" "}
        <code className="rounded bg-zinc-900 px-1">gen_ai.response.first_token_ns</code> on the
        voice-turn span, or derived from the earliest{" "}
        <code className="rounded bg-zinc-900 px-1">first_token</code>/
        <code className="rounded bg-zinc-900 px-1">first_chunk</code>/
        <code className="rounded bg-zinc-900 px-1">first_audio_frame</code> event on any child
        span.
      </p>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
      {LATENCY_CATEGORIES.map((c) => (
        <span key={c.key} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: c.color }}
          />
          {c.label}
        </span>
      ))}
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-lg tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

// Per-category distribution across turns. `count` is the number of turns
// that had any measurable time in this category — not total turn count — so
// sparse categories don't mis-report their averages.
function computeCategoryStats(
  perTurn: { split: Record<LatencyCategory, number> }[],
): CategoryStatsMap {
  const out = {} as CategoryStatsMap
  for (const cat of LATENCY_CATEGORIES) {
    const samples = perTurn.map((t) => t.split[cat.key]).filter((v) => v > 0)
    out[cat.key] = summarise(samples)
  }
  return out
}

function summarise(samples: number[]): CategoryStats {
  if (samples.length === 0) {
    return { avg_ms: 0, total_ms: 0, min_ms: 0, max_ms: 0, p50_ms: 0, p95_ms: 0, count: 0 }
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const total = sorted.reduce((a, b) => a + b, 0)
  return {
    avg_ms: total / sorted.length,
    total_ms: total,
    min_ms: sorted[0],
    max_ms: sorted[sorted.length - 1],
    p50_ms: percentile(sorted, 0.5),
    p95_ms: percentile(sorted, 0.95),
    count: sorted.length,
  }
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.floor(p * sortedAsc.length))
  return sortedAsc[idx]
}

// Build per-turn latency split. voice-turn spans are decomposed using the
// relay's voice.latency.* attrs: endpoint_ms → endpointing, remainder of span
// duration → realtime. provider_first_byte_ms (minus endpoint) → transport
// (avoids double-counting; it's an overlapping window). Other spans are
// bucketed by name.
function categorise(observations: ObservationRow[]): Record<LatencyCategory, number> {
  const out: Record<LatencyCategory, number> = {
    endpointing: 0,
    realtime: 0,
    transport: 0,
    brain: 0,
    other: 0,
  }
  for (const o of observations) {
    const dur = o.duration_ms ?? 0
    if (dur <= 0) continue
    const name = (o.name ?? "").toLowerCase()

    if (name === "voice-turn") {
      const attrs = parseAttrs(o.attributes_json)
      const endpointMs = numberFromAttrs(attrs, "voice.latency.endpoint_ms")
      const providerFirstByteMs = numberFromAttrs(attrs, "voice.latency.provider_first_byte_ms")
      if (endpointMs != null) out.endpointing += endpointMs
      if (providerFirstByteMs != null) {
        const transportShare = endpointMs != null
          ? Math.max(0, providerFirstByteMs - endpointMs)
          : providerFirstByteMs
        out.transport += transportShare
      }
      out.realtime += Math.max(0, dur - (endpointMs ?? 0))
      continue
    }

    out[mapNameToCategory(name)] += dur
  }
  return out
}

function mapNameToCategory(name: string): LatencyCategory {
  if (name.includes("endpoint")) return "endpointing"
  if (name.includes("realtime")) return "realtime"
  if (name.startsWith("openclaw") || name.includes("brain") || name === "ask_brain") return "brain"
  return "other"
}

// TTFT (Time To First Token) — the interval between the turn's start and the
// first output chunk. Tries, in order:
//   1. `gen_ai.response.first_token_ns` on the voice-turn (root) span — the
//      canonical OTel-ish attribute we want the relay to emit going forward.
//   2. The same attribute on any child span (e.g. the realtime LLM span).
//   3. The earliest `first_token` / `first_chunk` / `first_audio_frame` event
//      on the root or any child.
// Returns null if nothing is found, in which case the UI renders "—".
function extractTtftMs(trace: TraceWithObservations): number | null {
  // Preferred: relay-stamped voice.latency.first_output_from_turn_start_ms
  // (modality-agnostic, already in ms, server-computed).
  const fromVoiceLatency = readVoiceLatencyFirstOutputMs(trace)
  if (fromVoiceLatency != null) return fromVoiceLatency

  const startNs = Number(trace.start_time_ns)
  if (!Number.isFinite(startNs) || startNs <= 0) return null

  const firstTokenNs = findFirstTokenNs(trace)
  if (firstTokenNs == null) return null

  const deltaMs = Math.round((firstTokenNs - startNs) / 1e6)
  return deltaMs < 0 ? null : deltaMs
}

function findFirstTokenNs(trace: TraceWithObservations): number | null {
  const rootObs = trace.observations.find((o) => o.span_id === trace.trace_id)
  const candidates = [rootObs, ...trace.observations]

  // 1 + 2: attribute on root or child.
  for (const o of candidates) {
    if (!o) continue
    const ns = readFirstTokenAttr(o)
    if (ns != null) return ns
  }

  // 3: earliest event with a known name.
  let earliest: number | null = null
  for (const o of trace.observations) {
    const fromEvent = readFirstTokenEvent(o)
    if (fromEvent == null) continue
    if (earliest == null || fromEvent < earliest) earliest = fromEvent
  }
  return earliest
}

function readFirstTokenAttr(o: ObservationRow): number | null {
  if (!o.attributes_json) return null
  try {
    const attrs = JSON.parse(o.attributes_json) as Record<string, unknown>
    const raw = attrs["gen_ai.response.first_token_ns"] ?? attrs["voice.first_token_ns"]
    if (raw == null) return null
    const n = typeof raw === "number" ? raw : Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

// TTFT can also come straight from the relay's voice.latency.* attrs — that
// metric is ms-from-turn-start and modality-agnostic (audio OR text, whichever
// came first). Prefer it when present since it's measured server-side with a
// consistent definition across providers.
function readVoiceLatencyFirstOutputMs(trace: TraceWithObservations): number | null {
  const rootObs = trace.observations.find((o) => o.span_id === trace.trace_id)
  const candidates = [rootObs, ...trace.observations]
  for (const o of candidates) {
    if (!o?.attributes_json) continue
    try {
      const attrs = JSON.parse(o.attributes_json) as Record<string, unknown>
      const raw =
        attrs["voice.latency.first_output_from_turn_start_ms"] ??
        attrs["voice.latency.first_audio_from_turn_start_ms"] ??
        attrs["voice.latency.first_text_from_turn_start_ms"]
      if (raw == null) continue
      const n = typeof raw === "number" ? raw : Number(raw)
      if (Number.isFinite(n) && n >= 0) return n
    } catch {
      continue
    }
  }
  return null
}

const FIRST_TOKEN_EVENT_NAMES = new Set(["first_token", "first_chunk", "first_audio_frame"])

type SpanEvent = { name?: string; timeUnixNano?: string | number | bigint }

function readFirstTokenEvent(o: ObservationRow): number | null {
  const raw = (o as { events_json?: string | null }).events_json
  if (!raw) return null
  try {
    const events = JSON.parse(raw) as SpanEvent[]
    let earliest: number | null = null
    for (const e of events) {
      if (!e?.name || !FIRST_TOKEN_EVENT_NAMES.has(e.name)) continue
      const ts = e.timeUnixNano
      const n = typeof ts === "number" ? ts : Number(ts ?? NaN)
      if (Number.isFinite(n) && n > 0 && (earliest == null || n < earliest)) earliest = n
    }
    return earliest
  } catch {
    return null
  }
}

function parseAttrs(json: string | null): Record<string, unknown> {
  if (!json) return {}
  try {
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function numberFromAttrs(attrs: Record<string, unknown>, key: string): number | null {
  const v = attrs[key]
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}
