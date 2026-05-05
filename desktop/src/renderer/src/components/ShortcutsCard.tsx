import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'

type ShortcutAction =
  | 'toggleCall'
  | 'mute'
  | 'annotate'
  | 'clearAnnotations'
  | 'screenShare'

type ShortcutEntry = {
  action: ShortcutAction
  accelerator: string
  defaultAccelerator: string
}

const ACTION_LABEL: Record<ShortcutAction, string> = {
  toggleCall: 'Start or end a call',
  mute: 'Toggle mute',
  annotate: 'Toggle annotate (drawing)',
  clearAnnotations: 'Clear annotations',
  screenShare: 'Toggle screen share',
}

const ACTION_DESCRIPTION: Record<ShortcutAction, string> = {
  toggleCall: 'Start a new realtime call when idle, or end the active call.',
  mute: 'Mute or unmute the microphone during an active call.',
  annotate: 'Enter or leave drawing mode while screen-sharing.',
  clearAnnotations: 'Erase every stroke currently drawn on the overlay.',
  screenShare: 'Start or stop screen-sharing during an active call.',
}

export function ShortcutsCard() {
  const [entries, setEntries] = useState<ShortcutEntry[]>([])
  const [recordingFor, setRecordingFor] = useState<ShortcutAction | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    void refresh()
  }, [])

  const refresh = useCallback(async () => {
    const list = await window.electronAPI.shortcuts.list()
    setEntries(list)
  }, [])

  async function setAccelerator(action: ShortcutAction, accelerator: string) {
    setStatusMessage(null)
    const result = await window.electronAPI.shortcuts.set(action, accelerator)
    if (!result.ok) {
      setStatusMessage(`Couldn't bind ${formatAccelerator(accelerator)} — ${result.error}`)
    }
    await refresh()
  }

  async function clearAccelerator(action: ShortcutAction) {
    setStatusMessage(null)
    await window.electronAPI.shortcuts.clear(action)
    await refresh()
  }

  async function resetDefaults() {
    setStatusMessage(null)
    const list = await window.electronAPI.shortcuts.resetDefaults()
    setEntries(list)
  }

  function startRecording(action: ShortcutAction) {
    setStatusMessage(null)
    setRecordingFor(action)
  }

  function cancelRecording() {
    setRecordingFor(null)
  }

  function onRecorded(accelerator: string) {
    if (!recordingFor) return
    const action = recordingFor
    setRecordingFor(null)
    void setAccelerator(action, accelerator)
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h3>
        <Button variant="ghost" size="sm" onClick={resetDefaults}>
          Reset defaults
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Global shortcuts work even when VoiceClaw is in the background. Click a binding to
        record a new combination, or clear it to unbind.
      </p>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.action}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground">{ACTION_LABEL[entry.action]}</p>
              <p className="text-xs text-muted-foreground">{ACTION_DESCRIPTION[entry.action]}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {recordingFor === entry.action ? (
                <RecordingChip onRecorded={onRecorded} onCancel={cancelRecording} />
              ) : (
                <button
                  type="button"
                  onClick={() => startRecording(entry.action)}
                  className="font-mono text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors min-w-[7rem] text-center"
                  title="Click to record a new combination"
                >
                  {entry.accelerator
                    ? formatAccelerator(entry.accelerator)
                    : <span className="text-muted-foreground">unbound</span>}
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAccelerator(entry.action)}
                disabled={!entry.accelerator}
              >
                Clear
              </Button>
            </div>
          </div>
        ))}
      </div>

      {statusMessage && (
        <p className="text-xs text-destructive">{statusMessage}</p>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function RecordingChip(props: {
  onRecorded: (accelerator: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') {
      props.onCancel()
      return
    }
    const accelerator = buildAccelerator(e)
    if (!accelerator) return
    props.onRecorded(accelerator)
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={props.onCancel}
      className="font-mono text-xs px-2 py-1 rounded border border-[var(--brand-rust)] bg-[var(--brand-rust)]/10 min-w-[7rem] text-center cursor-text outline-none"
    >
      Press combo…
    </div>
  )
}

function buildAccelerator(e: React.KeyboardEvent): string | null {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Control')
  if (e.metaKey) parts.push('Command')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const key = normalizeKey(e.key)
  if (!key) return null
  // Ignore pure modifier presses — wait for a real key.
  if (key === 'Control' || key === 'Command' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
    return null
  }
  parts.push(key)
  return parts.join('+')
}

function normalizeKey(raw: string): string {
  if (raw.length === 1) return raw.toUpperCase()
  if (raw === ' ') return 'Space'
  if (/^F\d{1,2}$/i.test(raw)) return raw.toUpperCase()
  if (raw === 'ArrowUp') return 'Up'
  if (raw === 'ArrowDown') return 'Down'
  if (raw === 'ArrowLeft') return 'Left'
  if (raw === 'ArrowRight') return 'Right'
  if (raw === 'Meta') return 'Command'
  return raw
}

function formatAccelerator(s: string): string {
  return s
    .split('+')
    .map((part) => {
      if (part === 'Control') return 'Ctrl'
      if (part === 'Command') return '⌘'
      if (part === 'Alt') return '⌥'
      if (part === 'Shift') return '⇧'
      return part
    })
    .join(' ')
}
