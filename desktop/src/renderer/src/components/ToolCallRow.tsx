import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Ban } from 'lucide-react'
import type { ToolCallEntry } from '../lib/tool-call-store'

interface ToolCallRowProps {
  entry: ToolCallEntry
}

export function ToolCallRow({ entry }: ToolCallRowProps) {
  const { status, name, args, result, error, startedAt, durationMs } = entry
  const [argsExpanded, setArgsExpanded] = useState(false)
  const [resultExpanded, setResultExpanded] = useState(status === 'error')
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

  useEffect(() => {
    if (status === 'error') setResultExpanded(true)
  }, [status])

  const displayMs = status === 'in-progress' ? elapsed : (durationMs ?? 0)

  return (
    <div className="mb-2 mx-1">
      <div className="flex items-start gap-2 px-3 py-2 rounded border border-border/60 bg-muted/30 text-xs">
        <div className="mt-0.5 flex-shrink-0">
          <StatusIcon status={status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-[11px] text-foreground/90 truncate">{name}</code>
            <span className={`flex-shrink-0 tabular-nums ${statusTextClass(status)}`}>
              {statusLabel(status)} · {formatMs(displayMs)}
            </span>
          </div>

          {args && (
            <button
              className="mt-1 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setArgsExpanded((v) => !v)}
            >
              {argsExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <span className="truncate max-w-[280px]">{summarize(args)}</span>
            </button>
          )}

          {argsExpanded && (
            <pre className="mt-1.5 rounded bg-background/50 border border-border/40 p-2 text-[10px] leading-relaxed overflow-auto max-h-40 whitespace-pre-wrap break-all">
              {prettyPrint(args)}
            </pre>
          )}

          {(status === 'success' || status === 'error' || status === 'cancelled') && result && (
            <button
              className="mt-1 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setResultExpanded((v) => !v)}
            >
              {resultExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <span>{resultExpanded ? 'Hide result' : 'Show result'}</span>
            </button>
          )}

          {status === 'error' && error && !result && (
            <div className="mt-1 text-destructive leading-relaxed break-words">{error}</div>
          )}

          {resultExpanded && result && (
            <pre className="mt-1.5 rounded bg-background/50 border border-border/40 p-2 text-[10px] leading-relaxed overflow-auto max-h-40 whitespace-pre-wrap break-all">
              {prettyPrint(result)}
            </pre>
          )}

          {resultExpanded && status === 'error' && error && (
            <div className="mt-1 text-destructive text-[10px] leading-relaxed break-words">{error}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Helpers ---

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

function summarize(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    const values = Object.values(parsed)
      .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
      .join(', ')
    return values.length > 80 ? values.slice(0, 77) + '…' : values
  } catch {
    return raw.length > 80 ? raw.slice(0, 77) + '…' : raw
  }
}

function prettyPrint(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}
