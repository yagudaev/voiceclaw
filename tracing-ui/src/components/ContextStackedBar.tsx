"use client"

import type { ContextSection } from "@/lib/context-breakdown"

const SECTION_COLORS: Record<ContextSection["kind"], string> = {
  system: "#60a5fa",
  workspace_bootstrap: "#a78bfa",
  tools: "#34d399",
  history: "#fbbf24",
  user: "#f472b6",
  other: "#71717a",
}

export function ContextStackedBar({ sections }: { sections: ContextSection[] }) {
  const total = sections.reduce((acc, s) => acc + s.chars, 0)
  if (total === 0) {
    return (
      <div className="h-7 rounded border border-dashed border-zinc-800 flex items-center justify-center text-xs text-zinc-600">
        no input captured
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="h-7 rounded overflow-hidden flex border border-zinc-800">
        {sections.map((s) => {
          const pct = (s.chars / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={s.kind + s.label}
              title={`${s.label}: ${s.chars.toLocaleString()} chars (${pct.toFixed(1)}%)`}
              style={{ width: `${pct}%`, background: SECTION_COLORS[s.kind] }}
              className="flex items-center justify-center text-[10px] font-medium text-zinc-900"
            >
              {pct >= 10 ? s.label.split(" ")[0] : ""}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
        {sections.map((s) => (
          <span key={s.kind + s.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: SECTION_COLORS[s.kind] }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
