import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Ban } from 'lucide-react'
import type { ToolCallEntry } from '../lib/tool-call-store'

const RESPONSE_COLLAPSE_THRESHOLD = 800

interface ToolCallRowProps {
  entry: ToolCallEntry
}

export function ToolCallRow({ entry }: ToolCallRowProps) {
  const { status, name, args, result, error, startedAt, durationMs, step } = entry
  const [responseCollapsed, setResponseCollapsed] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status !== 'in-progress') {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
      return
    }
    const tick = () => setElapsed(Date.now() - startedAt)
    tick()
    intervalRef.current = setInterval(tick, 200)
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
    }
  }, [status, startedAt])

  const displayMs = status === 'in-progress' ? elapsed : (durationMs ?? 0)
  const errored = status === 'error'
  const responseText = errored ? (error ?? '') : (result ?? '')
  const responseLooksStructured = isStructured(responseText)
  const showCollapseToggle =
    status === 'success' && responseText.length > RESPONSE_COLLAPSE_THRESHOLD

  return (
    <div className="mb-3 mx-1">
      <div
        className="rounded-md border bg-[var(--panel)]/60 px-3 py-2.5 text-xs"
        style={{
          borderColor: errored ? 'rgb(220 38 38 / 0.55)' : 'var(--line, hsl(var(--border)))',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusIcon status={status} />
            <code className="font-mono text-[11px] text-foreground/90 truncate">{name}</code>
          </div>
          <span className={`flex-shrink-0 tabular-nums ${statusTextClass(status)}`}>
            {statusLabel(status)} · {formatMs(displayMs)}
          </span>
        </div>

        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mb-1">
            Parameters
          </div>
          <pre className="rounded bg-background/60 border border-border/40 p-2 font-mono text-[10px] leading-relaxed overflow-auto max-h-40 whitespace-pre-wrap break-all">
            {prettyPrint(args)}
          </pre>
        </div>

        {(status === 'in-progress' || responseText.length > 0) && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                {errored ? 'Error' : 'Response'}
              </div>
              {showCollapseToggle && (
                <button
                  type="button"
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setResponseCollapsed((v) => !v)}
                  aria-expanded={!responseCollapsed}
                >
                  {responseCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                  {responseCollapsed ? 'Show full response' : 'Collapse'}
                </button>
              )}
            </div>
            {status === 'in-progress' && step && (
              <div className="mb-1 text-[11px] italic text-muted-foreground">
                {step}
                <span className="inline-block ml-1 w-0.5 h-3 bg-current align-middle animate-pulse" />
              </div>
            )}
            <ResponseBody
              text={responseText}
              status={status}
              errored={errored}
              structured={responseLooksStructured}
              collapsed={responseCollapsed}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ResponseBody({
  text,
  status,
  errored,
  structured,
  collapsed,
}: {
  text: string
  status: ToolCallEntry['status']
  errored: boolean
  structured: boolean
  collapsed: boolean
}) {
  if (text.length === 0) {
    if (status === 'in-progress') {
      return (
        <div className="text-[11px] text-muted-foreground/80 italic">
          Waiting for the assistant to respond
          <span className="inline-block ml-1 w-0.5 h-3 bg-current align-middle animate-pulse" />
        </div>
      )
    }
    return null
  }

  const display = collapsed ? text.slice(0, RESPONSE_COLLAPSE_THRESHOLD) + '…' : text
  const monoClass = structured ? 'font-mono text-[10px]' : 'text-[11px]'
  const accent = errored
    ? 'border-l-2 border-l-destructive bg-destructive/5'
    : 'border-l-2 border-l-[var(--accent,theme(colors.foreground/40))]'

  return (
    <div
      className={`rounded-sm pl-2.5 pr-2 py-2 leading-relaxed whitespace-pre-wrap break-words ${monoClass} ${accent} ${errored ? 'text-destructive' : 'text-foreground/90'}`}
    >
      {structured ? prettyPrint(display) : display}
      {status === 'in-progress' && !errored && (
        <span className="inline-block ml-0.5 w-0.5 h-3 bg-current align-middle animate-pulse" />
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: ToolCallEntry['status'] }) {
  switch (status) {
    case 'in-progress':
      return <Loader2 size={13} className="animate-spin text-muted-foreground" />
    case 'success':
      return <CheckCircle2 size={13} className="text-[var(--brand-sage)]" />
    case 'error':
      return <XCircle size={13} className="text-destructive" />
    case 'cancelled':
      return <Ban size={13} className="text-muted-foreground" />
  }
}

function statusLabel(status: ToolCallEntry['status']): string {
  switch (status) {
    case 'in-progress': return 'in-progress'
    case 'success': return 'done'
    case 'error': return 'failed'
    case 'cancelled': return 'cancelled'
  }
}

function statusTextClass(status: ToolCallEntry['status']): string {
  switch (status) {
    case 'in-progress': return 'text-muted-foreground'
    case 'success': return 'text-[var(--brand-sage)]'
    case 'error': return 'text-destructive'
    case 'cancelled': return 'text-muted-foreground'
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function prettyPrint(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function isStructured(raw: string): boolean {
  if (!raw) return false
  const trimmed = raw.trimStart()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
}
