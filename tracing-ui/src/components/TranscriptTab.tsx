"use client"

import { useMemo, useState } from "react"
import type { MediaRow, VoiceTurn } from "@/lib/db"
import { MediaTimeline } from "./MediaTimeline"

export function TranscriptTab({
  sessionId,
  turns,
  media,
  sessionStartNs,
  durationMs,
}: {
  sessionId: string
  turns: VoiceTurn[]
  media: MediaRow[]
  sessionStartNs: number
  durationMs: number
}) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [seekRequest, setSeekRequest] = useState({ timeMs: 0, nonce: 0 })
  const activeTraceId = useMemo(
    () => activeTurnTraceId(turns, sessionStartNs, currentTimeMs),
    [currentTimeMs, sessionStartNs, turns],
  )

  if (turns.length === 0) {
    return (
      <div className="px-6 py-8 text-sm text-zinc-400">
        No <code className="rounded bg-zinc-900 px-1">voice-turn</code> spans on this session.
        Transcript is derived from those — make sure the relay is emitting them.
      </div>
    )
  }

  return (
    <div>
      <MediaTimeline
        sessionId={sessionId}
        media={media}
        durationMs={durationMs}
        turns={turns}
        sessionStartNs={sessionStartNs}
        highlightedTraceId={activeTraceId}
        seekRequest={seekRequest}
        onTimeChange={setCurrentTimeMs}
      />
      <div className="px-6 py-6 space-y-4 max-w-3xl">
        {turns.map((turn, idx) => {
          const relMs = turnStartMs(turn, sessionStartNs)
          return (
            <TurnBlock
              key={turn.span_id}
              turn={turn}
              index={idx + 1}
              sessionStartNs={sessionStartNs}
              active={turn.trace_id === activeTraceId}
              onSeek={() => {
                setCurrentTimeMs(relMs)
                setSeekRequest((prev) => ({ timeMs: relMs, nonce: prev.nonce + 1 }))
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function TurnBlock({
  turn,
  index,
  sessionStartNs,
  active,
  onSeek,
}: {
  turn: VoiceTurn
  index: number
  sessionStartNs: number
  active: boolean
  onSeek: () => void
}) {
  const relMs = turnStartMs(turn, sessionStartNs)
  const sys = turn.input_messages.find((m) => m.role === "system")
  const userMsgs = turn.input_messages.filter((m) => m.role === "user")
  const userText = userMsgs.map((m) => m.content).join("\n\n")

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSeek}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSeek()
      }}
      className={[
        "block w-full cursor-pointer rounded border p-3 text-left transition-colors",
        active
          ? "border-blue-500/60 bg-blue-500/10"
          : "border-transparent hover:border-zinc-800 hover:bg-zinc-950/60",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="rounded bg-zinc-900 px-2 py-0.5 text-zinc-400">Turn {index}</span>
        <span className="font-mono tabular-nums">+{formatOffset(relMs)}</span>
        {turn.duration_ms != null && (
          <span className="tabular-nums text-zinc-600">· {turn.duration_ms}ms</span>
        )}
        {turn.model && <span className="font-mono text-zinc-600">· {turn.model}</span>}
      </div>

      {sys && <SystemBubble text={sys.content} />}

      {userText && <Bubble role="user" text={userText} />}

      {turn.output_text && <Bubble role="assistant" text={turn.output_text} />}

      {!userText && !turn.output_text && (
        <div className="text-xs text-zinc-500 italic">
          This turn has no captured text. Check raw attributes on the{" "}
          <code className="rounded bg-zinc-900 px-1">voice-turn</code> span.
        </div>
      )}
    </div>
  )
}

function SystemBubble({ text }: { text: string }) {
  // Collapsible <details> keeps the system prompt out of the way but one click
  // away. Dark-mode-friendly styling to match the rest of the app.
  return (
    <details
      className="rounded border border-zinc-800 bg-zinc-950/50 text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-zinc-400 hover:text-zinc-200">
        System prompt{" "}
        <span className="text-zinc-600 tabular-nums">({text.length.toLocaleString()} chars)</span>
      </summary>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words border-t border-zinc-800 px-3 py-2 font-mono text-[11px] text-zinc-400">
        {text}
      </pre>
    </details>
  )
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words",
          isUser
            ? "bg-blue-600/20 border border-blue-500/30 text-zinc-50"
            : "bg-zinc-900 border border-zinc-800 text-zinc-100",
        ].join(" ")}
      >
        <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
          {isUser ? "User" : "Assistant"}
        </div>
        <div>{text}</div>
      </div>
    </div>
  )
}

function formatOffset(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const rem = Math.round(s - m * 60)
  return `${m}m${rem.toString().padStart(2, "0")}s`
}

function activeTurnTraceId(
  turns: VoiceTurn[],
  sessionStartNs: number,
  currentTimeMs: number,
): string | null {
  if (turns.length === 0) return null
  let active = turns[0]
  for (const turn of turns) {
    const startMs = turnStartMs(turn, sessionStartNs)
    if (startMs <= currentTimeMs) active = turn
    else break
  }
  return active.trace_id
}

function turnStartMs(turn: VoiceTurn, sessionStartNs: number): number {
  return Math.max(0, Math.round((turn.start_time_ns - sessionStartNs) / 1e6))
}
