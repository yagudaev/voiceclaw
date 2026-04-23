import type { ObservationRow } from "@/lib/db"
import { computeCost, loadPricingCatalog } from "@/lib/pricing"
import { CostDonut } from "./CostDonut"

// Category colour palette. Tuned to Tailwind zinc/slate accents so it blends
// with the dark app shell instead of fighting it.
const CATEGORY_COLORS: Record<string, string> = {
  "Realtime AI": "#60a5fa", // blue-400
  "Brain LLM": "#a78bfa", // violet-400
  STT: "#34d399", // emerald-400
  TTS: "#f59e0b", // amber-500
}

type Bucket = {
  label: string
  cost_usd: number
  tokens: number
}

export async function CostTab({
  observations,
  durationMs,
}: {
  observations: ObservationRow[]
  durationMs: number
}) {
  const catalog = await loadPricingCatalog()

  // Categorise by span name. Relay voice-turn spans = realtime AI. openclaw.llm
  // = the brain's Haiku/Sonnet call. openclaw.tool / chat_completions are
  // internal plumbing we don't bill directly. STT/TTS stay as placeholders
  // until we add those spans on the relay side.
  const buckets: Record<string, Bucket> = {
    "Realtime AI": { label: "Realtime AI", cost_usd: 0, tokens: 0 },
    "Brain LLM": { label: "Brain LLM", cost_usd: 0, tokens: 0 },
    STT: { label: "STT (placeholder)", cost_usd: 0, tokens: 0 },
    TTS: { label: "TTS (placeholder)", cost_usd: 0, tokens: 0 },
  }

  for (const o of observations) {
    const tokensIn = o.tokens_input ?? 0
    const tokensOut = o.tokens_output ?? 0
    const cached = o.tokens_cached ?? 0
    const reported = o.cost_usd ?? 0

    if (o.name === "voice-turn") {
      // Prefer the collector-resolved cost_usd; if it's zero (e.g. audio-token
      // pricing gap) fall back to the pricing helper.
      const cost =
        reported > 0
          ? reported
          : computeCost(catalog, o.model, { input: tokensIn, output: tokensOut, cached }).total_usd
      buckets["Realtime AI"].cost_usd += cost
      buckets["Realtime AI"].tokens += tokensIn + tokensOut
    } else if (o.name === "openclaw.llm") {
      const cost =
        reported > 0
          ? reported
          : computeCost(catalog, o.model, { input: tokensIn, output: tokensOut, cached }).total_usd
      buckets["Brain LLM"].cost_usd += cost
      buckets["Brain LLM"].tokens += tokensIn + tokensOut
    }
  }

  const entries = Object.values(buckets)
  const total = entries.reduce((acc, b) => acc + b.cost_usd, 0)
  const totalTokens = entries.reduce((acc, b) => acc + b.tokens, 0)
  const slices = entries
    .filter((b) => b.cost_usd > 0)
    .map((b) => ({
      label: b.label,
      value: b.cost_usd,
      color: CATEGORY_COLORS[b.label.replace(" (placeholder)", "")] ?? "#71717a",
    }))

  return (
    <div className="px-6 py-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] items-start">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Total cost" value={total > 0 ? `$${total.toFixed(4)}` : "$0"} />
          <KpiCard label="Session duration" value={formatDuration(durationMs)} />
          <KpiCard label="Total tokens" value={totalTokens.toLocaleString()} />
          <KpiCard
            label="$ / minute"
            value={
              durationMs > 0 && total > 0
                ? `$${(total / (durationMs / 60000)).toFixed(4)}`
                : "—"
            }
          />
        </div>

        <div className="rounded border border-zinc-800 p-4">
          {slices.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">
              No cost data yet. The collector fills in <code>cost_usd</code> from{" "}
              <code>gen_ai.usage.*</code> once model pricing resolves.
            </div>
          ) : (
            <CostDonut slices={slices} />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Breakdown</div>
        <table className="w-full text-xs border border-zinc-800 rounded overflow-hidden">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium text-right">Tokens</th>
              <th className="px-3 py-2 font-medium text-right">$</th>
              <th className="px-3 py-2 font-medium text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((b) => {
              const pct = total > 0 ? (b.cost_usd / total) * 100 : 0
              return (
                <tr key={b.label} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-300">{b.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.tokens.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {b.cost_usd > 0 ? `$${b.cost_usd.toFixed(4)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">
                    {b.cost_usd > 0 ? `${pct.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "—"
  if (ms < 1000) return `${ms}ms`
  const s = Math.round(ms / 100) / 10
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = Math.round(s - m * 60)
  return `${m}m ${rem}s`
}
