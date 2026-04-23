import type { ObservationRow, TraceWithObservations } from "@/lib/db"
import { LATENCY_CATEGORIES, type LatencyCategory } from "./LatencyTab.shared"
import { LatencyStackedBar } from "./LatencyStackedBar"

export function LatencyTab({ traces }: { traces: TraceWithObservations[] }) {
  if (traces.length === 0) {
    return <div className="px-6 py-8 text-sm text-zinc-400">No turns on this session yet.</div>
  }

  const perTurn = traces.map((t) => ({
    trace_id: t.trace_id,
    start_ns: t.start_time_ns,
    name: t.name ?? "(unnamed)",
    total_ms:
      t.end_time_ns != null ? Math.max(0, Math.round((t.end_time_ns - t.start_time_ns) / 1e6)) : 0,
    split: categorise(t.observations),
  }))

  const turnCount = traces.length
  const avgTurnMs =
    turnCount > 0
      ? Math.round(perTurn.reduce((acc, t) => acc + t.total_ms, 0) / turnCount)
      : 0

  // Overall split = sum across all turns per category. Rendered as a single
  // fat stacked bar up top so you can see where cumulative time goes.
  const overall: Record<LatencyCategory, number> = {
    endpointing: 0,
    voice: 0,
    transcriber: 0,
    llm_realtime: 0,
    brain: 0,
    transport: 0,
  }
  for (const t of perTurn) {
    for (const cat of LATENCY_CATEGORIES) overall[cat.key] += t.split[cat.key]
  }

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
        <div className="text-xs uppercase tracking-wide text-zinc-500">Overall split</div>
        <LatencyStackedBar values={overall} />
        <Legend />
      </div>

      <div className="rounded border border-zinc-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Trace</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
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

// Build the per-turn latency split. Two sources feed this:
//
//   1. voice.latency.* attributes stamped onto the voice-turn span by the
//      relay adapters. These carry the endpoint + provider-first-byte
//      metrics measured from provider wire events. They populate the
//      `endpointing` and `transport` buckets directly.
//
//   2. Span durations, categorised by name, for everything else (brain/tool
//      spans, external realtime spans, etc.). Anything we don't recognise
//      falls into "transport" so it's visible but doesn't mis-label.
//
// The voice-turn span's OWN duration is split: endpoint_ms goes into the
// `endpointing` bucket, the remainder counts as `llm_realtime`. Without this
// split the endpointing time would double-count — once in the attr, once in
// the span duration.
function categorise(observations: ObservationRow[]): Record<LatencyCategory, number> {
  const out: Record<LatencyCategory, number> = {
    endpointing: 0,
    voice: 0,
    transcriber: 0,
    llm_realtime: 0,
    brain: 0,
    transport: 0,
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
      // The provider-first-byte window overlaps the endpointing window — it's
      // the relay's view of "how long after I stopped sending audio did the
      // model start replying". Surface only the share that exceeds endpointing
      // as transport, so the two buckets don't double-count.
      if (providerFirstByteMs != null) {
        const transportShare = endpointMs != null
          ? Math.max(0, providerFirstByteMs - endpointMs)
          : providerFirstByteMs
        out.transport += transportShare
      }
      // Subtract endpoint time from the realtime-LLM slice so we don't
      // double-count. Clamp at zero in case the attrs arrived from a
      // different-protocol turn or are malformed.
      const realtimeShare = Math.max(0, dur - (endpointMs ?? 0))
      out.llm_realtime += realtimeShare
      continue
    }

    const cat = mapNameToCategory(name)
    out[cat] += dur
  }
  return out
}

function mapNameToCategory(name: string): LatencyCategory {
  if (name.includes("endpoint")) return "endpointing"
  if (name.includes("tts") || name.includes("voice-out") || name.includes("voice_out")) return "voice"
  if (name.includes("stt") || name.includes("transcrib")) return "transcriber"
  if (name.includes("realtime")) return "llm_realtime"
  if (name.startsWith("openclaw") || name.includes("brain") || name === "ask_brain") return "brain"
  return "transport"
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
