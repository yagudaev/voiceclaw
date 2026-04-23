export const dynamic = "force-dynamic"

import { listSessions } from "@/lib/db"

export default function DashboardPage() {
  let sessions: ReturnType<typeof listSessions> = []
  let error: string | null = null
  try {
    sessions = listSessions(1000)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  if (error) {
    return (
      <div className="px-6 py-6 text-sm text-amber-300">
        Couldn&apos;t load dashboard data: {error}
      </div>
    )
  }

  const dayBuckets = new Map<string, { cost: number; tokens: number; calls: number; duration: number }>()
  for (const s of sessions) {
    const day = new Date(Number(s.started_at_ns) / 1e6).toISOString().slice(0, 10)
    const bucket = dayBuckets.get(day) ?? { cost: 0, tokens: 0, calls: 0, duration: 0 }
    bucket.cost += s.total_cost_usd
    bucket.tokens += s.total_tokens
    bucket.calls += 1
    bucket.duration += s.duration_ms
    dayBuckets.set(day, bucket)
  }
  const days = Array.from(dayBuckets.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 14)

  const totalCost = sessions.reduce((acc, s) => acc + s.total_cost_usd, 0)
  const totalTokens = sessions.reduce((acc, s) => acc + s.total_tokens, 0)

  return (
    <div className="px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Rolling stats across all sessions. v1 snapshot — charts, top-errors, model breakdown
          per the spec land incrementally.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Sessions" value={sessions.length.toLocaleString()} />
        <KpiCard label="Total tokens" value={totalTokens.toLocaleString()} />
        <KpiCard label="Total cost" value={totalCost > 0 ? `$${totalCost.toFixed(2)}` : "—"} />
        <KpiCard label="Latest" value={sessions[0] ? new Date(Number(sessions[0].started_at_ns) / 1e6).toLocaleString() : "—"} />
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-wide text-zinc-500">Last 14 days</h2>
        <table className="mt-2 w-full text-sm border border-zinc-800 rounded overflow-hidden">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Day</th>
              <th className="px-3 py-2 font-medium text-right">Calls</th>
              <th className="px-3 py-2 font-medium text-right">Tokens</th>
              <th className="px-3 py-2 font-medium text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {days.map(([day, bucket]) => (
              <tr key={day} className="border-t border-zinc-800">
                <td className="px-3 py-2 font-mono">{day}</td>
                <td className="px-3 py-2 text-right tabular-nums">{bucket.calls}</td>
                <td className="px-3 py-2 text-right tabular-nums">{bucket.tokens.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {bucket.cost > 0 ? `$${bucket.cost.toFixed(4)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
