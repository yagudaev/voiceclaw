import Link from "next/link"
import { listSessions } from "@/lib/db"

export const dynamic = "force-dynamic"

export default function SessionsPage() {
  let sessions: ReturnType<typeof listSessions> = []
  let error: string | null = null
  try {
    sessions = listSessions(100)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Per-conversation observability grouped by sessionKey. Click a row to see transcript, logs, cost, latency, and swim lanes.
        </p>
      </div>

      {error ? (
        <div className="rounded border border-amber-700 bg-amber-950 px-4 py-3 text-sm text-amber-200">
          Couldn&apos;t open the tracing database at{" "}
          <code className="bg-amber-900 px-1 rounded">
            {process.env.VOICECLAW_TRACING_DB ?? "~/.voiceclaw/tracing.db"}
          </code>
          . Is the tracing-collector running? Error: {error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900 px-4 py-8 text-center text-sm text-zinc-400">
          No sessions yet. Start the tracing-collector (`yarn dev:tracing-collector`), make a voice call, and
          refresh.
        </div>
      ) : (
        <table className="w-full text-sm border border-zinc-800 rounded overflow-hidden">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Started</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Session</th>
              <th className="px-3 py-2 font-medium text-right">Turns</th>
              <th className="px-3 py-2 font-medium text-right">Duration</th>
              <th className="px-3 py-2 font-medium text-right">Tokens</th>
              <th className="px-3 py-2 font-medium text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.session_id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                  {new Date(Number(s.started_at_ns) / 1e6).toLocaleString()}
                </td>
                <td className="px-3 py-2">{s.user_id ?? <span className="text-zinc-500">—</span>}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/sessions/${encodeURIComponent(s.session_id)}`}
                    className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                  >
                    {s.session_id.slice(0, 18)}…
                  </Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{s.turn_count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatDuration(s.duration_ms)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{s.total_tokens.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {s.total_cost_usd > 0 ? `$${s.total_cost_usd.toFixed(4)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
