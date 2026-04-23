"use client"

import { LATENCY_CATEGORIES, type LatencyCategory } from "./LatencyTab.shared"

// A pure-CSS horizontal stacked bar. Uses flexbox so each segment's width is
// proportional to its duration without pulling in another Chart.js dataset.
// Segments with zero duration are skipped so the bar doesn't render
// zero-width flex children with tooltips attached.
export function LatencyStackedBar({ values }: { values: Record<LatencyCategory, number> }) {
  const total = LATENCY_CATEGORIES.reduce((acc, c) => acc + values[c.key], 0)

  if (total === 0) {
    return (
      <div className="h-8 rounded border border-dashed border-zinc-800 flex items-center justify-center text-xs text-zinc-600">
        no latency data
      </div>
    )
  }

  return (
    <div className="h-8 rounded overflow-hidden flex border border-zinc-800">
      {LATENCY_CATEGORIES.map((c) => {
        const v = values[c.key]
        if (v <= 0) return null
        const pct = (v / total) * 100
        return (
          <div
            key={c.key}
            title={`${c.label}: ${v.toLocaleString()}ms (${pct.toFixed(1)}%)`}
            style={{ width: `${pct}%`, background: c.color }}
            className="flex items-center justify-center text-[10px] font-medium text-zinc-900"
          >
            {pct >= 6 ? `${c.label.split(" ")[0]}` : ""}
          </div>
        )
      })}
    </div>
  )
}
