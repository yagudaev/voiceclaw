import type { ObservationRow } from "@/lib/db"

// Backwards-compatible "Raw" tab — the original flat observation table from
// the v1 session-detail page. Kept so the debugging workflow of scrolling
// through every span still exists alongside the richer tabs.
export function RawTab({
  observations,
  sessionStartNs,
}: {
  observations: ObservationRow[]
  sessionStartNs: number
}) {
  if (observations.length === 0) {
    return <div className="px-6 py-8 text-sm text-zinc-400">No observations for this session.</div>
  }

  return (
    <div className="px-6 py-6">
      <p className="text-xs text-zinc-400 mb-3">
        Flat list of every span across this session&apos;s traces. Same content as the Logs tab
        minus the filter chrome.
      </p>
      <table className="w-full text-xs border border-zinc-800 rounded overflow-hidden">
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
                +{Math.round((o.start_time_ns - sessionStartNs) / 1e6)}ms
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
    </div>
  )
}
