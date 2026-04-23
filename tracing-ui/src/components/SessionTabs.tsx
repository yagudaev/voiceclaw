import Link from "next/link"

export type TabKey =
  | "transcript"
  | "logs"
  | "cost"
  | "latency"
  | "context"
  | "raw"

export const TABS: { key: TabKey; label: string }[] = [
  { key: "transcript", label: "Transcript" },
  { key: "logs", label: "Logs" },
  { key: "cost", label: "Cost" },
  { key: "latency", label: "Latency" },
  { key: "context", label: "Context" },
  { key: "raw", label: "Raw" },
]

export function SessionTabs({ sessionId, active }: { sessionId: string; active: TabKey }) {
  const base = `/sessions/${encodeURIComponent(sessionId)}`
  return (
    <div className="flex gap-1 border-b border-zinc-800 px-1">
      {TABS.map((t) => {
        const isActive = t.key === active
        return (
          <Link
            key={t.key}
            href={`${base}?tab=${t.key}`}
            prefetch={false}
            className={[
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
              isActive
                ? "border-blue-400 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            ].join(" ")}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
