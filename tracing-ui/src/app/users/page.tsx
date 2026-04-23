export const dynamic = "force-dynamic"

import Link from "next/link"
import { listSessions } from "@/lib/db"

export default function UsersPage() {
  let sessions: ReturnType<typeof listSessions> = []
  try {
    sessions = listSessions(1000)
  } catch {
    /* no-op; handled below */
  }

  const byUser = new Map<string, { sessions: number; turns: number; cost: number; tokens: number; lastActive: number }>()
  for (const s of sessions) {
    const u = s.user_id ?? "(anonymous)"
    const entry = byUser.get(u) ?? { sessions: 0, turns: 0, cost: 0, tokens: 0, lastActive: 0 }
    entry.sessions += 1
    entry.turns += s.turn_count
    entry.cost += s.total_cost_usd
    entry.tokens += s.total_tokens
    entry.lastActive = Math.max(entry.lastActive, Number(s.last_activity_ns))
    byUser.set(u, entry)
  }

  const rows = Array.from(byUser.entries()).sort(([, a], [, b]) => b.lastActive - a.lastActive)

  return (
    <div className="px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-zinc-400 mt-1">Aggregated by `userId` set on the voice-turn trace.</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900 px-4 py-8 text-center text-sm text-zinc-400">
          No sessions yet.
        </div>
      ) : (
        <table className="w-full text-sm border border-zinc-800 rounded overflow-hidden">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium text-right">Sessions</th>
              <th className="px-3 py-2 font-medium text-right">Turns</th>
              <th className="px-3 py-2 font-medium text-right">Tokens</th>
              <th className="px-3 py-2 font-medium text-right">Cost</th>
              <th className="px-3 py-2 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([user, agg]) => (
              <tr key={user} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                <td className="px-3 py-2">
                  <Link href={`/users/${encodeURIComponent(user)}`} className="text-blue-400 hover:text-blue-300">
                    {user}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{agg.sessions}</td>
                <td className="px-3 py-2 text-right tabular-nums">{agg.turns}</td>
                <td className="px-3 py-2 text-right tabular-nums">{agg.tokens.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {agg.cost > 0 ? `$${agg.cost.toFixed(4)}` : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                  {new Date(agg.lastActive / 1e6).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
