"use client"

// Three-pane timeline view of the session: turn rail → span timeline → span
// detail. Modelled on Langfuse's per-trace timeline and structured so a reader
// can follow a single turn down to individual tool-call / brain-call spans.
//
// Selection state lives in the URL (?turn=<spanId>&step=<spanId>) so reloads
// preserve context — especially useful when a reviewer shares a link to a
// particular step. Client-side router updates keep the rest of the page
// interactive without full reloads.

import { useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { MediaRow, ObservationRow, TraceWithObservations } from "@/lib/db"
import { AttributesTabs } from "./AttributesTabs"
import { MediaTimeline } from "./MediaTimeline"

export type TurnsTabProps = {
  sessionId: string
  traces: TraceWithObservations[]
  media: MediaRow[]
  sessionStartNs: number
}

export function TurnsTab({ sessionId, traces, media, sessionStartNs }: TurnsTabProps) {
  const router = useRouter()
  const search = useSearchParams()

  const turnParam = search.get("turn")
  const stepParam = search.get("step")

  const activeTraceId = turnParam ?? traces[0]?.trace_id ?? null
  const activeTrace = useMemo(
    () => traces.find((t) => t.trace_id === activeTraceId) ?? null,
    [traces, activeTraceId],
  )

  // Default to the first real observation (typically the voice-turn root) so
  // the detail panel opens on actual attrs — not a synthesized empty row.
  const activeStepSpanId = stepParam ?? activeTrace?.observations[0]?.span_id ?? null
  const activeStep = useMemo(() => {
    if (!activeTrace) return null
    return activeTrace.observations.find((o) => o.span_id === activeStepSpanId)
      ?? activeTrace.observations[0]
      ?? null
  }, [activeTrace, activeStepSpanId])

  const setSelection = useCallback(
    (nextTurn: string | null, nextStep: string | null) => {
      const params = new URLSearchParams(search.toString())
      params.set("tab", "turns")
      if (nextTurn) params.set("turn", nextTurn)
      else params.delete("turn")
      if (nextStep) params.set("step", nextStep)
      else params.delete("step")
      router.replace(`/sessions/${encodeURIComponent(sessionId)}?${params.toString()}`, {
        scroll: false,
      })
    },
    [router, search, sessionId],
  )

  const sessionTotalMs = useMemo(() => {
    const endNs = Math.max(...traces.map((t) => Number(t.end_time_ns ?? t.start_time_ns)))
    return Math.max(0, Math.round((endNs - sessionStartNs) / 1e6))
  }, [sessionStartNs, traces])

  if (traces.length === 0) {
    return (
      <div className="px-6 py-8 text-sm text-zinc-400">
        No turns on this session yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[220px_minmax(0,1fr)_360px] h-[calc(100vh-97px)]">
      <TurnRail
        traces={traces}
        sessionStartNs={sessionStartNs}
        activeTraceId={activeTraceId}
        onSelect={(id) => setSelection(id, id)}
      />
      <TimelinePanel
        trace={activeTrace}
        traces={traces}
        media={media}
        sessionId={sessionId}
        sessionStartNs={sessionStartNs}
        sessionTotalMs={sessionTotalMs}
        activeStepSpanId={activeStep?.span_id ?? null}
        onSelectStep={(spanId) => setSelection(activeTraceId, spanId)}
      />
      <DetailPanel step={activeStep} />
    </div>
  )
}

// --- turn rail (left) ---

function TurnRail({
  traces,
  sessionStartNs,
  activeTraceId,
  onSelect,
}: {
  traces: TraceWithObservations[]
  sessionStartNs: number
  activeTraceId: string | null
  onSelect: (traceId: string) => void
}) {
  return (
    <aside className="border-r border-zinc-800 overflow-y-auto">
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500">
        Turns
      </div>
      <ul className="py-1">
        {traces.map((t, i) => {
          const isActive = t.trace_id === activeTraceId
          const relMs = Math.max(0, Math.round((Number(t.start_time_ns) - sessionStartNs) / 1e6))
          const durMs =
            t.end_time_ns != null
              ? Math.max(0, Math.round((Number(t.end_time_ns) - Number(t.start_time_ns)) / 1e6))
              : null
          return (
            <li key={t.trace_id}>
              <button
                type="button"
                onClick={() => onSelect(t.trace_id)}
                className={[
                  "w-full text-left px-3 py-2 border-l-2 transition-colors text-xs",
                  isActive
                    ? "border-blue-400 bg-zinc-900/60 text-zinc-100"
                    : "border-transparent hover:bg-zinc-900/40 text-zinc-300",
                ].join(" ")}
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <span>#{i + 1}</span>
                  <span className="tabular-nums text-zinc-500">+{formatOffset(relMs)}</span>
                </div>
                <div className="truncate text-zinc-200">{t.name ?? "(unnamed)"}</div>
                <div className="font-mono text-[10px] text-zinc-600 flex justify-between">
                  <span>{t.trace_id.slice(0, 10)}…</span>
                  {durMs != null && <span>{durMs}ms</span>}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

// --- timeline middle panel ---

function TimelinePanel({
  trace,
  traces,
  media,
  sessionId,
  sessionStartNs,
  sessionTotalMs,
  activeStepSpanId,
  onSelectStep,
}: {
  trace: TraceWithObservations | null
  traces: TraceWithObservations[]
  media: MediaRow[]
  sessionId: string
  sessionStartNs: number
  sessionTotalMs: number
  activeStepSpanId: string | null
  onSelectStep: (spanId: string) => void
}) {
  if (!trace) {
    return <div className="px-6 py-8 text-sm text-zinc-400">Pick a turn on the left.</div>
  }

  const turnStart = Number(trace.start_time_ns)
  const turnEnd = Number(trace.end_time_ns ?? turnStart)
  const turnTotalMs = Math.max(1, Math.round((turnEnd - turnStart) / 1e6))
  const tree = buildSpanTree(trace)

  return (
    <div className="overflow-y-auto">
      <MediaTimeline
        sessionId={sessionId}
        media={media}
        durationMs={sessionTotalMs}
        turns={traces}
        sessionStartNs={sessionStartNs}
        highlightedTraceId={trace.trace_id}
      />

      <div className="px-5 py-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Timeline ·{" "}
            <span className="text-zinc-300">{tree.length} spans</span>
          </span>
          <span className="tabular-nums">{turnTotalMs.toLocaleString()}ms</span>
        </div>

        {tree.map((node) => (
          <TimelineRow
            key={node.span_id}
            label={node.name ?? "(unnamed)"}
            spanId={node.span_id}
            serviceName={node.service_name}
            startMs={Math.max(0, Math.round((Number(node.start_time_ns) - turnStart) / 1e6))}
            durationMs={node.duration_ms ?? 0}
            turnTotalMs={turnTotalMs}
            depth={node.depth}
            isActive={activeStepSpanId === node.span_id}
            onClick={() => onSelectStep(node.span_id)}
          />
        ))}
      </div>
    </div>
  )
}

function TimelineRow({
  label,
  spanId,
  serviceName,
  startMs,
  durationMs,
  turnTotalMs,
  depth,
  isActive,
  isRoot,
  onClick,
}: {
  label: string
  spanId: string
  serviceName: string | null
  startMs: number
  durationMs: number
  turnTotalMs: number
  depth: number
  isActive: boolean
  isRoot?: boolean
  onClick: () => void
}) {
  const offsetPct = turnTotalMs > 0 ? Math.min(100, (startMs / turnTotalMs) * 100) : 0
  const widthPct =
    turnTotalMs > 0 ? Math.max(0.5, Math.min(100 - offsetPct, (durationMs / turnTotalMs) * 100)) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded px-2 py-1.5 hover:bg-zinc-900 transition-colors",
        isActive ? "bg-zinc-900 ring-1 ring-blue-500/40" : "",
      ].join(" ")}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(180px,40%)_80px] items-center gap-3 text-xs">
        <div className="truncate">
          <span className={isRoot ? "text-zinc-100 font-medium" : "text-zinc-200"}>
            {label}
          </span>
          {serviceName && (
            <span className="ml-2 text-[10px] text-zinc-500 font-mono">{serviceName}</span>
          )}
          <span className="ml-2 text-[10px] font-mono text-zinc-600">{spanId.slice(0, 8)}…</span>
        </div>
        <div className="relative h-2 rounded bg-zinc-900">
          <div
            className={[
              "absolute h-2 rounded",
              isRoot ? "bg-blue-400/40" : "bg-blue-400/70",
            ].join(" ")}
            style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
          />
        </div>
        <div className="text-right tabular-nums text-zinc-400">{durationMs.toLocaleString()}ms</div>
      </div>
    </button>
  )
}

// --- right-side detail panel ---

function DetailPanel({ step }: { step: ObservationRow | null }) {
  if (!step) {
    return (
      <aside className="border-l border-zinc-800 overflow-y-auto p-4 text-sm text-zinc-400">
        Click a step to see its details.
      </aside>
    )
  }

  const attrs = parseAttrs(step.attributes_json)
  const toolInput = pickAttr(attrs, [
    "gen_ai.tool.input",
    "gen_ai.request.input",
    "langfuse.observation.input",
  ])
  const toolOutput = pickAttr(attrs, [
    "gen_ai.tool.output",
    "gen_ai.response.output",
    "langfuse.observation.output",
  ])
  const events = parseEvents(step.events_json)

  return (
    <aside className="border-l border-zinc-800 overflow-y-auto">
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-4 py-2">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">Span</div>
        <div className="text-sm text-zinc-100 truncate">{step.name ?? "(unnamed)"}</div>
        <div className="text-[10px] font-mono text-zinc-600 truncate">{step.span_id}</div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        <StatGrid
          rows={[
            ["Duration", step.duration_ms != null ? `${step.duration_ms}ms` : "—"],
            ["Service", step.service_name ?? "—"],
            ["Status", formatStatus(step.status_code, step.status_message)],
            ["Model", step.model ?? "—"],
            ["Tokens in", step.tokens_input?.toLocaleString() ?? "—"],
            ["Tokens out", step.tokens_output?.toLocaleString() ?? "—"],
            ["Tokens cached", step.tokens_cached?.toLocaleString() ?? "—"],
            ["Cost", step.cost_usd != null ? `$${step.cost_usd.toFixed(4)}` : "—"],
          ]}
        />

        {toolInput != null && <Section title="Input" value={toolInput} />}
        {toolOutput != null && <Section title="Output" value={toolOutput} />}

        {events.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Events</div>
            <ul className="rounded border border-zinc-800 divide-y divide-zinc-900 font-mono text-[11px]">
              {events.map((e, i) => (
                <li key={i} className="px-2 py-1 flex items-center justify-between">
                  <span className="text-zinc-300">{e.name ?? "(unnamed)"}</span>
                  <span className="text-zinc-600 tabular-nums">{e.relMs}ms</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">All attributes</div>
          <AttributesTabs attributes={attrs} />
        </div>
      </div>
    </aside>
  )
}

function StatGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded border border-zinc-800 p-2">
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{k}</dt>
          <dd className="text-xs tabular-nums text-zinc-200 mt-0.5 break-all">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Section({ title, value }: { title: string; value: unknown }) {
  const asString = typeof value === "string" ? value : JSON.stringify(value, null, 2)
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{title}</div>
      <pre className="rounded border border-zinc-800 bg-zinc-900/50 p-2 font-mono text-[11px] text-zinc-200 max-h-64 overflow-auto whitespace-pre-wrap break-words">
        {asString}
      </pre>
    </div>
  )
}

// --- helpers (private) ---

type SpanNode = ObservationRow & { depth: number; children: SpanNode[] }

function buildSpanTree(trace: TraceWithObservations): SpanNode[] {
  const byId = new Map<string, SpanNode>()
  for (const o of trace.observations) {
    byId.set(o.span_id, { ...o, depth: 0, children: [] })
  }
  const roots: SpanNode[] = []
  for (const node of byId.values()) {
    const parent = node.parent_span_id ? byId.get(node.parent_span_id) : null
    if (parent) {
      node.depth = parent.depth + 1
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  // Stable order: start time ASC.
  const byStart = (a: SpanNode, b: SpanNode) => Number(a.start_time_ns) - Number(b.start_time_ns)
  roots.sort(byStart)
  const flat: SpanNode[] = []
  function walk(node: SpanNode) {
    flat.push(node)
    node.children.sort(byStart)
    for (const c of node.children) walk(c)
  }
  for (const r of roots) walk(r)
  return flat
}

function parseAttrs(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed
  } catch {
    return {}
  }
}

function pickAttr(
  attrs: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const k of keys) {
    if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== "") {
      const v = attrs[k]
      if (typeof v === "string") {
        const trimmed = v.trim()
        if (!trimmed) continue
        // Prettify JSON strings — tool input/output is often JSON-encoded.
        try {
          return JSON.parse(trimmed)
        } catch {
          return trimmed
        }
      }
      return v
    }
  }
  return null
}

function parseEvents(
  raw: string | null,
): { name?: string; relMs: number }[] {
  if (!raw) return []
  try {
    const events = JSON.parse(raw) as Array<{ name?: string; timeUnixNano?: string | number }>
    const first = events[0]?.timeUnixNano
    const base = first != null ? Number(first) : 0
    return events.map((e) => ({
      name: e.name,
      relMs:
        e.timeUnixNano != null ? Math.round((Number(e.timeUnixNano) - base) / 1e6) : 0,
    }))
  } catch {
    return []
  }
}

function formatStatus(code: string | null, message: string | null): string {
  if (!code) return "—"
  const label = code === "2" || code === "ERROR" ? "error" : code === "1" || code === "OK" ? "ok" : code
  return message ? `${label} · ${message}` : label
}

function formatOffset(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const rem = Math.round(s - m * 60)
  return `${m}m${rem.toString().padStart(2, "0")}s`
}
