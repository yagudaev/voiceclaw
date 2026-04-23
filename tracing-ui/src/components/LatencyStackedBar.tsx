"use client"

import { LATENCY_CATEGORIES, type LatencyCategory } from "./LatencyTab.shared"

export type CategoryStats = {
  avg_ms: number
  total_ms: number
  min_ms: number
  max_ms: number
  p50_ms: number
  p95_ms: number
  count: number
}

export type CategoryStatsMap = Record<LatencyCategory, CategoryStats>

export function LatencyStackedBar({ stats }: { stats: CategoryStatsMap }) {
  const avgTotal = LATENCY_CATEGORIES.reduce((acc, c) => acc + stats[c.key].avg_ms, 0)

  if (avgTotal === 0) {
    return (
      <div className="h-8 rounded border border-dashed border-zinc-800 flex items-center justify-center text-xs text-zinc-600">
        no latency data
      </div>
    )
  }

  return (
    <div className="h-8 rounded overflow-visible flex border border-zinc-800 relative">
      {LATENCY_CATEGORIES.map((c) => {
        const s = stats[c.key]
        if (s.avg_ms <= 0) return null
        const pct = (s.avg_ms / avgTotal) * 100
        return (
          <div
            key={c.key}
            style={{ width: `${pct}%`, background: c.color }}
            className="group relative flex items-center justify-center text-[10px] font-medium text-zinc-900 cursor-default first:rounded-l last:rounded-r"
          >
            {pct >= 6 ? `${c.label.split(" ")[0]}` : ""}
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 hidden group-hover:block whitespace-nowrap rounded border border-zinc-700 bg-zinc-900 shadow-lg px-3 py-2 text-[11px] text-zinc-200 text-left">
              <div className="font-semibold pb-1 mb-1 border-b border-zinc-700 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                {c.label}
              </div>
              <StatsGrid stats={s} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatsGrid({ stats }: { stats: CategoryStats }) {
  const rows: [string, string][] = [
    ["Avg", `${Math.round(stats.avg_ms).toLocaleString()}ms`],
    ["p50", `${Math.round(stats.p50_ms).toLocaleString()}ms`],
    ["p95", `${Math.round(stats.p95_ms).toLocaleString()}ms`],
    ["Min", `${Math.round(stats.min_ms).toLocaleString()}ms`],
    ["Max", `${Math.round(stats.max_ms).toLocaleString()}ms`],
    ["Total", `${Math.round(stats.total_ms).toLocaleString()}ms`],
    ["Turns", stats.count.toLocaleString()],
  ]
  return (
    <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 tabular-nums">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-zinc-400">{k}</span>
          <span className="text-right">{v}</span>
        </div>
      ))}
    </div>
  )
}
