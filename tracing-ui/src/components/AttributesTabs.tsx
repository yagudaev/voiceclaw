"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"

export type AttributeRow = {
  key: string
  value: string
}

export function AttributesTabs({
  attributes,
  raw,
  maxHeightClass = "max-h-80",
}: {
  attributes?: Record<string, unknown> | null
  raw?: string | null
  maxHeightClass?: string
}) {
  const [tab, setTab] = useState<"fields" | "json">("fields")
  const [filter, setFilter] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const parsed = useMemo(() => attributes ?? parseRawAttributes(raw), [attributes, raw])
  const rows = useMemo(() => flattenAttributes(parsed), [parsed])
  const json = useMemo(() => formatRawJson(parsed, raw), [parsed, raw])
  const normalizedFilter = filter.trim().toLowerCase()
  const visibleRows = useMemo(() => {
    if (!normalizedFilter) return rows
    return rows.filter((row) => {
      return (
        row.key.toLowerCase().includes(normalizedFilter) ||
        row.value.toLowerCase().includes(normalizedFilter)
      )
    })
  }, [rows, normalizedFilter])

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="rounded border border-zinc-800 bg-zinc-950/40">
      <div className="flex items-center border-b border-zinc-800">
        <TabButton active={tab === "fields"} onClick={() => setTab("fields")}>
          Fields
        </TabButton>
        <TabButton active={tab === "json"} onClick={() => setTab("json")}>
          JSON
        </TabButton>
      </div>

      {tab === "fields" ? (
        <div className="p-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter Fields..."
            className="mb-2 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/70"
          />

          {rows.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-zinc-500">No attributes</div>
          ) : visibleRows.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-zinc-500">No matching fields</div>
          ) : (
            <div className={`${maxHeightClass} overflow-auto rounded border border-zinc-900`}>
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-zinc-900 text-zinc-500">
                  <tr>
                    <th className="w-[42%] px-2 py-1.5 font-medium">Key</th>
                    <th className="px-2 py-1.5 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {visibleRows.map((row) => {
                    const isExpanded = expanded.has(row.key)
                    const displayValue = isExpanded ? row.value : truncateValue(row.value)
                    const canExpand = row.value.length > VALUE_PREVIEW_CHARS
                    return (
                      <tr key={row.key} className="align-top">
                        <td className="px-2 py-1.5 font-mono text-zinc-300 break-all">
                          {row.key}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-zinc-400 break-all">
                          {canExpand ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(row.key)}
                              className="block w-full text-left hover:text-zinc-200"
                            >
                              {displayValue}
                            </button>
                          ) : (
                            displayValue
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <pre className={`${maxHeightClass} overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] text-zinc-300`}>
          {json}
        </pre>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "border-r border-zinc-800 px-3 py-1.5 text-xs",
        active ? "bg-zinc-900 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

const VALUE_PREVIEW_CHARS = 200

export function flattenAttributes(
  attrs: Record<string, unknown> | null | undefined,
): AttributeRow[] {
  if (!attrs || Object.keys(attrs).length === 0) return []
  const rows: AttributeRow[] = []
  for (const key of Object.keys(attrs).sort()) {
    flattenValue(key, attrs[key], rows)
  }
  return rows
}

function flattenValue(path: string, value: unknown, rows: AttributeRow[]) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      rows.push({ key: path, value: "[]" })
      return
    }
    value.forEach((entry, index) => flattenValue(`${path}[${index}]`, entry, rows))
    return
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      rows.push({ key: path, value: "{}" })
      return
    }
    for (const [childKey, childValue] of entries) {
      flattenValue(`${path}.${childKey}`, childValue, rows)
    }
    return
  }
  rows.push({ key: path, value: formatFieldValue(value) })
}

function parseRawAttributes(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return isPlainObject(parsed) ? parsed : { value: parsed }
  } catch {
    return { value: raw }
  }
}

function formatRawJson(attrs: Record<string, unknown> | null, raw: string | null | undefined) {
  if (attrs) return JSON.stringify(attrs, null, 2)
  if (!raw) return "(no attributes)"
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function formatFieldValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

function truncateValue(value: string): string {
  if (value.length <= VALUE_PREVIEW_CHARS) return value
  return `${value.slice(0, VALUE_PREVIEW_CHARS).trimEnd()}...`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
