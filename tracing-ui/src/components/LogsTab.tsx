"use client"

import { Fragment, useMemo, useState } from "react"

export type LogRow = {
  span_id: string
  rel_ms: number
  level: "ERROR" | "OK"
  service: string
  category: string
  name: string
  summary: string
  duration_ms: number | null
  attributes_json: string | null
}

export function LogsTab({ rows }: { rows: LogRow[] }) {
  const [level, setLevel] = useState<string>("all")
  const [service, setService] = useState<string>("all")
  const [category, setCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"time" | "duration">("time")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const services = useMemo(() => uniqueSorted(rows.map((r) => r.service)), [rows])
  const categories = useMemo(() => uniqueSorted(rows.map((r) => r.category)), [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (level !== "all" && r.level !== level) return false
      if (service !== "all" && r.service !== service) return false
      if (category !== "all" && r.category !== category) return false
      return true
    })
  }, [rows, level, service, category])

  const sorted = useMemo(() => {
    const out = [...filtered]
    out.sort((a, b) => {
      const av = sortBy === "time" ? a.rel_ms : (a.duration_ms ?? -1)
      const bv = sortBy === "time" ? b.rel_ms : (b.duration_ms ?? -1)
      return sortDir === "asc" ? av - bv : bv - av
    })
    return out
  }, [filtered, sortBy, sortDir])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (rows.length === 0) {
    return <div className="px-6 py-8 text-sm text-zinc-400">No observations for this session.</div>
  }

  return (
    <div className="px-6 py-6 space-y-4">
      <div className="flex flex-wrap gap-3 items-center text-xs">
        <Filter label="Level" value={level} onChange={setLevel} options={["all", "ERROR", "OK"]} />
        <Filter label="Service" value={service} onChange={setService} options={["all", ...services]} />
        <Filter label="Category" value={category} onChange={setCategory} options={["all", ...categories]} />
        <span className="text-zinc-500 ml-auto tabular-nums">
          Showing {sorted.length.toLocaleString()} of {rows.length.toLocaleString()}
        </span>
      </div>

      <table className="w-full text-xs border border-zinc-800 rounded overflow-hidden">
        <thead className="bg-zinc-900 text-zinc-400 text-left">
          <tr>
            <th className="px-3 py-2 font-medium w-10"></th>
            <SortHeader label="Time" active={sortBy === "time"} dir={sortDir} onClick={() => toggleSort("time")} />
            <th className="px-3 py-2 font-medium">Level</th>
            <th className="px-3 py-2 font-medium">Service</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Summary</th>
            <SortHeader
              label="Dur"
              active={sortBy === "duration"}
              dir={sortDir}
              onClick={() => toggleSort("duration")}
              align="right"
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const isExpanded = expanded.has(r.span_id)
            return (
              <Fragment key={r.span_id}>
                <tr
                  className="border-t border-zinc-800 align-top cursor-pointer hover:bg-zinc-900/40"
                  onClick={() => toggle(r.span_id)}
                >
                  <td className="px-3 py-2 text-zinc-500 select-none">{isExpanded ? "▾" : "▸"}</td>
                  <td className="px-3 py-2 font-mono text-zinc-500 tabular-nums">
                    +{r.rel_ms.toLocaleString()}ms
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={[
                        "rounded px-2 py-0.5 text-[10px] uppercase tracking-wide",
                        r.level === "ERROR"
                          ? "bg-red-950 text-red-300 border border-red-900"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-800",
                      ].join(" ")}
                    >
                      {r.level}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{r.service}</td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{r.category}</td>
                  <td className="px-3 py-2 font-mono text-zinc-200">{r.name}</td>
                  <td className="px-3 py-2 text-zinc-400 max-w-xs truncate">{r.summary}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                    {r.duration_ms != null ? `${r.duration_ms}ms` : "—"}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-t border-zinc-900 bg-zinc-950">
                    <td></td>
                    <td colSpan={7} className="px-3 py-3">
                      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-zinc-900/50 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-300">
                        {prettyJson(r.attributes_json)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  function toggleSort(col: "time" | "duration") {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else {
      setSortBy(col)
      setSortDir(col === "time" ? "asc" : "desc")
    }
  }
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-zinc-500 uppercase tracking-wide text-[10px]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align,
}: {
  label: string
  active: boolean
  dir: "asc" | "desc"
  onClick: () => void
  align?: "left" | "right"
}) {
  return (
    <th
      onClick={onClick}
      className={[
        "px-3 py-2 font-medium cursor-pointer select-none",
        align === "right" ? "text-right" : "",
        active ? "text-zinc-100" : "",
      ].join(" ")}
    >
      {label}
      {active && <span className="ml-1 text-zinc-500">{dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  )
}

function uniqueSorted(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))).sort()
}

function prettyJson(raw: string | null): string {
  if (!raw) return "(no attributes)"
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}
