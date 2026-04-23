import type { ObservationRow } from "@/lib/db"
import { parseContextBreakdown, type ContextBreakdown } from "@/lib/context-breakdown"
import { ContextStackedBar } from "./ContextStackedBar"

export function ContextTab({ observations }: { observations: ObservationRow[] }) {
  const llmSpans = observations.filter((o) => o.name === "openclaw.llm")
  if (llmSpans.length === 0) {
    return (
      <div className="px-6 py-8 text-sm text-zinc-400">
        No <code className="rounded bg-zinc-900 px-1">openclaw.llm</code> spans on this session —
        context breakdown is brain-only for now.
      </div>
    )
  }

  type Entry = {
    span_id: string
    trace_id: string
    rel_ms: number
    model: string | null
    breakdown: ContextBreakdown
  }

  const minStart = Math.min(...llmSpans.map((o) => o.start_time_ns))
  const entries: Entry[] = llmSpans.map((o) => {
    const attrs = parseAttributes(o.attributes_json)
    const input = attrs["langfuse.observation.input"]
    const usage = attrs["langfuse.observation.usage_details"]
    const cacheRead = coerceNumber(attrs["gen_ai.usage.cache_read_input_tokens"])
    const cacheCreation = coerceNumber(attrs["gen_ai.usage.cache_creation_input_tokens"])
    return {
      span_id: o.span_id,
      trace_id: o.trace_id,
      rel_ms: Math.max(0, Math.round((o.start_time_ns - minStart) / 1e6)),
      model: o.model,
      breakdown: parseContextBreakdown(input, usage, {
        read: cacheRead ?? undefined,
        creation: cacheCreation ?? undefined,
      }),
    }
  })

  // Session-wide cache gauge: cache_read / (cache_read + fresh_input), summed
  // across every openclaw.llm span that reported provider tokens. Spans
  // without usage_details are skipped so one empty span doesn't tank the
  // gauge.
  let totalInput = 0
  let totalCached = 0
  for (const e of entries) {
    const p = e.breakdown.provider_tokens
    if (!p) continue
    totalInput += p.input
    totalCached += p.cached
  }
  const sessionCachePct = totalInput > 0 ? (totalCached / totalInput) * 100 : null

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Session cache hit"
          value={sessionCachePct != null ? `${sessionCachePct.toFixed(1)}%` : "—"}
        />
        <KpiCard label="Brain turns" value={String(entries.length)} />
        <KpiCard label="Input tokens" value={totalInput.toLocaleString()} />
        <KpiCard label="Cache-read tokens" value={totalCached.toLocaleString()} />
      </div>

      {sessionCachePct != null && <CacheGauge pct={sessionCachePct} />}

      <div className="space-y-4">
        {entries.map((e, idx) => (
          <TurnCard key={e.span_id} index={idx + 1} entry={e} />
        ))}
      </div>
    </div>
  )
}

type Entry = {
  span_id: string
  trace_id: string
  rel_ms: number
  model: string | null
  breakdown: ContextBreakdown
}

function TurnCard({ index, entry }: { index: number; entry: Entry }) {
  const { breakdown } = entry
  const provider = breakdown.provider_tokens
  return (
    <div className="rounded border border-zinc-800 p-4 space-y-3">
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="rounded bg-zinc-900 px-2 py-0.5 text-zinc-400">Brain turn {index}</span>
        <span className="font-mono tabular-nums">+{entry.rel_ms.toLocaleString()}ms</span>
        {entry.model && <span className="font-mono text-zinc-600">· {entry.model}</span>}
        {provider && (
          <span className="tabular-nums text-zinc-600">
            · {provider.input.toLocaleString()} in / {provider.output.toLocaleString()} out
          </span>
        )}
      </div>

      <ContextStackedBar sections={breakdown.sections} />

      {provider && (
        <CacheBar cached={provider.cached} fresh={Math.max(0, provider.input - provider.cached)} />
      )}

      <table className="w-full text-xs">
        <thead className="text-zinc-500 text-left">
          <tr>
            <th className="px-1 py-1 font-medium">Section</th>
            <th className="px-1 py-1 font-medium text-right">Chars</th>
            <th className="px-1 py-1 font-medium text-right">Tokens (est)</th>
            <th className="px-1 py-1 font-medium text-right">% of ctx</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.sections.map((s) => {
            const pct =
              breakdown.total_chars > 0 ? (s.chars / breakdown.total_chars) * 100 : 0
            return (
              <tr key={s.kind + s.label} className="border-t border-zinc-900">
                <td className="px-1 py-1 text-zinc-300">{s.label}</td>
                <td className="px-1 py-1 text-right tabular-nums text-zinc-300">
                  {s.chars.toLocaleString()}
                </td>
                <td className="px-1 py-1 text-right tabular-nums text-zinc-400">
                  {s.tokens_est.toLocaleString()}
                </td>
                <td className="px-1 py-1 text-right tabular-nums text-zinc-400">
                  {pct.toFixed(1)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CacheBar({ cached, fresh }: { cached: number; fresh: number }) {
  const total = cached + fresh
  if (total === 0) return null
  const cachedPct = (cached / total) * 100
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <span>Cache utilisation</span>
        <span className="tabular-nums">
          {cached.toLocaleString()} cached / {fresh.toLocaleString()} fresh
          <span className="text-zinc-600"> ({cachedPct.toFixed(1)}% hit)</span>
        </span>
      </div>
      <div className="h-3 rounded overflow-hidden flex border border-zinc-800">
        {cached > 0 && (
          <div
            title={`Cache-read: ${cached.toLocaleString()}`}
            style={{ width: `${cachedPct}%`, background: "#22c55e" }}
          />
        )}
        {fresh > 0 && (
          <div
            title={`Fresh input: ${fresh.toLocaleString()}`}
            style={{ width: `${100 - cachedPct}%`, background: "#f97316" }}
          />
        )}
      </div>
    </div>
  )
}

function CacheGauge({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="rounded border border-zinc-800 p-4 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-wide text-zinc-500">Cache hit — session</span>
        <span className="tabular-nums text-zinc-200">{clamped.toFixed(1)}%</span>
      </div>
      <div className="h-3 rounded overflow-hidden flex border border-zinc-800">
        <div style={{ width: `${clamped}%`, background: "#22c55e" }} />
        <div style={{ width: `${100 - clamped}%`, background: "#f97316" }} />
      </div>
      <p className="text-[11px] text-zinc-500">
        Green = cache-read tokens (paid at cache rate). Orange = fresh input (paid full).
      </p>
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

function parseAttributes(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // ignore
  }
  return {}
}

function coerceNumber(raw: unknown): number | null {
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) {
    return Number(raw)
  }
  return null
}
