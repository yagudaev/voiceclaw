import Link from "next/link"
import { listObservationsForSession, listTracesForSession } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sessionId = decodeURIComponent(id)

  let traces: ReturnType<typeof listTracesForSession> = []
  let observations: ReturnType<typeof listObservationsForSession> = []
  let error: string | null = null

  try {
    traces = listTracesForSession(sessionId)
    observations = listObservationsForSession(sessionId)
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
  const totalMs = Math.round((endNs - startNs) / 1e6)
  const totalTokens = observations.reduce(
    (acc, o) => acc + (o.tokens_input ?? 0) + (o.tokens_output ?? 0),
    0,
  )
  const totalCost = observations.reduce((acc, o) => acc + (o.cost_usd ?? 0), 0)

  return (
    <div className="flex h-[calc(100vh-49px)]">
      <aside className="w-[380px] border-r border-zinc-800 p-5 space-y-4 overflow-y-auto">
        <Link href="/sessions" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Sessions
        </Link>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Session</div>
          <div className="font-mono text-xs break-all">{sessionId}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Turns" value={String(traces.length)} />
          <Stat label="Observations" value={String(observations.length)} />
          <Stat label="Duration" value={formatDuration(totalMs)} />
          <Stat label="Tokens" value={totalTokens.toLocaleString()} />
          <Stat label="Cost" value={totalCost > 0 ? `$${totalCost.toFixed(4)}` : "—"} />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Turns</div>
          <ul className="space-y-1 text-xs">
            {traces.map((t) => (
              <li key={t.trace_id} className="px-2 py-1 rounded bg-zinc-900">
                <div className="font-mono text-zinc-400">{t.trace_id.slice(0, 16)}…</div>
                <div>{t.name ?? "(unnamed)"}</div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="flex-1 overflow-y-auto p-5">
        <h2 className="text-lg font-semibold">Trace observations</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Flat list of all spans across this session&apos;s traces. Transcript, logs, cost, latency, and swim-lane
          views are implemented incrementally — see{" "}
          <code className="bg-zinc-900 rounded px-1">docs/tracing-ui/SPEC.md</code> for the full feature set.
        </p>
        <table className="mt-4 w-full text-xs border border-zinc-800 rounded overflow-hidden">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Start</th>
              <th className="px-3 py-2 font-medium">Service</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium text-right">Duration</th>
              <th className="px-3 py-2 font-medium text-right">Tokens</th>
              <th className="px-3 py-2 font-medium text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {observations.map((o) => (
              <tr key={o.span_id} className="border-t border-zinc-800 align-top">
                <td className="px-3 py-2 font-mono text-zinc-500 tabular-nums">
                  +{Math.round((o.start_time_ns - startNs) / 1e6)}ms
                </td>
                <td className="px-3 py-2">{o.service_name ?? "—"}</td>
                <td className="px-3 py-2">{o.name ?? "—"}</td>
                <td className="px-3 py-2">
                  {o.observation_type ?? <span className="text-zinc-600">SPAN</span>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{o.model ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {o.duration_ms != null ? `${o.duration_ms}ms` : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {o.tokens_input != null || o.tokens_output != null
                    ? `${o.tokens_input ?? 0}→${o.tokens_output ?? 0}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {o.cost_usd != null && o.cost_usd > 0 ? `$${o.cost_usd.toFixed(4)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 p-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm tabular-nums mt-0.5">{value}</div>
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
