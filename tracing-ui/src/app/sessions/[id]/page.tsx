import Link from "next/link"
import {
  getVoiceTurnsForSession,
  listObservationsForSession,
  listTracesWithObservationsForSession,
  type ObservationRow,
  type TraceWithObservations,
  type VoiceTurn,
} from "@/lib/db"
import { SessionTabs, TABS, type TabKey } from "@/components/SessionTabs"
import { TranscriptTab } from "@/components/TranscriptTab"
import { LogsTab, type LogRow } from "@/components/LogsTab"
import { CostTab } from "@/components/CostTab"
import { LatencyTab } from "@/components/LatencyTab"
import { ContextTab } from "@/components/ContextTab"
import { RawTab } from "@/components/RawTab"

export const dynamic = "force-dynamic"

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab: tabParam } = await searchParams
  const sessionId = decodeURIComponent(id)
  const activeTab = resolveTab(tabParam)

  let traces: TraceWithObservations[] = []
  let observations: ObservationRow[] = []
  let voiceTurns: VoiceTurn[] = []
  let error: string | null = null

  try {
    ;[traces, observations, voiceTurns] = await Promise.all([
      listTracesWithObservationsForSession(sessionId),
      listObservationsForSession(sessionId),
      getVoiceTurnsForSession(sessionId),
    ])
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <p className="text-sm text-amber-300">Couldn&apos;t load session: {error}</p>
      </div>
    )
  }

  if (traces.length === 0) {
    return (
      <div className="px-6 py-6">
        <Link href="/sessions" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Sessions
        </Link>
        <p className="mt-4 text-sm text-zinc-400">No traces found for session {sessionId}.</p>
      </div>
    )
  }

  const startNs = Math.min(...traces.map((t) => t.start_time_ns))
  const endNs = Math.max(...traces.map((t) => Number(t.end_time_ns ?? t.start_time_ns)))
  const totalMs = Math.max(0, Math.round((endNs - startNs) / 1e6))
  const totalTokens = observations.reduce(
    (acc, o) => acc + (o.tokens_input ?? 0) + (o.tokens_output ?? 0),
    0,
  )
  const totalCost = observations.reduce((acc, o) => acc + (o.cost_usd ?? 0), 0)
  const userId = traces.find((t) => t.user_id)?.user_id ?? null

  return (
    <div className="flex h-[calc(100vh-49px)]">
      <aside className="w-[360px] shrink-0 border-r border-zinc-800 p-5 space-y-4 overflow-y-auto">
        <Link href="/sessions" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Sessions
        </Link>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Session</div>
          <div className="font-mono text-xs break-all mt-0.5">{sessionId}</div>
        </div>
        {userId && (
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">User</div>
            <div className="font-mono text-xs break-all mt-0.5">{userId}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Turns" value={String(traces.length)} />
          <Stat label="Observations" value={String(observations.length)} />
          <Stat label="Duration" value={formatDuration(totalMs)} />
          <Stat label="Tokens" value={totalTokens.toLocaleString()} />
          <Stat
            label="Cost"
            value={totalCost > 0 ? `$${totalCost.toFixed(4)}` : "—"}
          />
          <Stat
            label="Started"
            value={new Date(Number(startNs) / 1e6).toLocaleTimeString()}
          />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Turns</div>
          <ul className="space-y-1 text-xs">
            {traces.map((t, i) => (
              <li
                key={t.trace_id}
                className="rounded bg-zinc-900 border border-zinc-800 px-2 py-1"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <span>#{i + 1}</span>
                  <span className="tabular-nums text-zinc-500">
                    +{Math.round((t.start_time_ns - startNs) / 1e6).toLocaleString()}ms
                  </span>
                </div>
                <div className="text-zinc-300 truncate">{t.name ?? "(unnamed)"}</div>
                <div className="font-mono text-[10px] text-zinc-600">
                  {t.trace_id.slice(0, 16)}…
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="flex-1 overflow-y-auto">
        <SessionTabs sessionId={sessionId} active={activeTab} />
        <TabContent
          tab={activeTab}
          voiceTurns={voiceTurns}
          observations={observations}
          traces={traces}
          startNs={startNs}
          totalMs={totalMs}
        />
      </section>
    </div>
  )
}

function TabContent({
  tab,
  voiceTurns,
  observations,
  traces,
  startNs,
  totalMs,
}: {
  tab: TabKey
  voiceTurns: VoiceTurn[]
  observations: ObservationRow[]
  traces: TraceWithObservations[]
  startNs: number
  totalMs: number
}) {
  switch (tab) {
    case "transcript":
      return <TranscriptTab turns={voiceTurns} sessionStartNs={startNs} />
    case "logs":
      return <LogsTab rows={toLogRows(observations, startNs)} />
    case "cost":
      return <CostTab observations={observations} durationMs={totalMs} />
    case "latency":
      return <LatencyTab traces={traces} />
    case "context":
      return <ContextTab observations={observations} />
    case "raw":
      return <RawTab observations={observations} sessionStartNs={startNs} />
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 p-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm tabular-nums mt-0.5 break-all">{value}</div>
    </div>
  )
}

function resolveTab(raw: string | undefined): TabKey {
  const match = TABS.find((t) => t.key === raw)
  return match ? match.key : "transcript"
}

function toLogRows(observations: ObservationRow[], startNs: number): LogRow[] {
  return observations.map((o) => ({
    span_id: o.span_id,
    rel_ms: Math.max(0, Math.round((o.start_time_ns - startNs) / 1e6)),
    level: o.status_code === "2" || o.status_code === "ERROR" ? "ERROR" : "OK",
    service: o.service_name ?? "(unknown)",
    category: (o.name ?? "").split(".")[0] || "(none)",
    name: o.name ?? "—",
    summary: summarise(o),
    duration_ms: o.duration_ms,
    attributes_json: o.attributes_json,
  }))
}

// Compress a span's attributes into a one-line preview for the Logs table.
// Prefers the input/output shipped via langfuse.observation.* over the full
// attribute dump so the summary column stays legible.
function summarise(o: ObservationRow): string {
  if (!o.attributes_json) return ""
  try {
    const attrs = JSON.parse(o.attributes_json) as Record<string, unknown>
    const input = attrs["langfuse.observation.input"]
    const output = attrs["langfuse.observation.output"]
    const preferred = output ?? input
    if (typeof preferred === "string") {
      const trimmed = preferred.replace(/\s+/g, " ").trim()
      return trimmed.length > 140 ? trimmed.slice(0, 137) + "…" : trimmed
    }
    if (preferred != null) {
      const s = JSON.stringify(preferred).replace(/\s+/g, " ")
      return s.length > 140 ? s.slice(0, 137) + "…" : s
    }
  } catch {
    // fall through to empty
  }
  return ""
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
