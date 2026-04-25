import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, Volume1, Volume } from 'lucide-react'
import { cn } from '../lib/cn'

interface VolumeControlProps {
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onMutedChange: (muted: boolean) => void
  disabled?: boolean
}

const SLIDER_HEIGHT = 96

export function VolumeControl({
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
  disabled,
}: VolumeControlProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const Icon = pickIcon(muted ? 0 : volume, muted)

  useEffect(() => {
    if (!open) return
    const onDocPointerDown = (e: PointerEvent) => {
      if (draggingRef.current) return
      const root = containerRef.current
      if (root && !root.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleIconClick = useCallback(() => {
    if (disabled) return
    if (open) {
      onMutedChange(!muted)
      return
    }
    setOpen(true)
  }, [disabled, open, muted, onMutedChange])

  const updateFromClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const ratio = 1 - (clientY - rect.top) / rect.height
      const next = Math.max(0, Math.min(1, ratio))
      onVolumeChange(next)
      if (muted && next > 0) onMutedChange(false)
    },
    [muted, onMutedChange, onVolumeChange],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return
      e.preventDefault()
      draggingRef.current = true
      const target = e.currentTarget
      target.setPointerCapture?.(e.pointerId)
      updateFromClientY(e.clientY)
    },
    [disabled, updateFromClientY],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      updateFromClientY(e.clientY)
    },
    [updateFromClientY],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    const target = e.currentTarget
    target.releasePointerCapture?.(e.pointerId)
  }, [])

  const handleSliderKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return
      const step = e.shiftKey ? 0.1 : 0.05
      const displayed = muted ? 0 : volume
      const adjust = (next: number) => {
        onVolumeChange(next)
        if (muted) onMutedChange(false)
      }
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowRight':
          e.preventDefault()
          adjust(Math.min(1, displayed + step))
          break
        case 'ArrowDown':
        case 'ArrowLeft':
          e.preventDefault()
          adjust(Math.max(0, displayed - step))
          break
        case 'Home':
          e.preventDefault()
          adjust(0)
          break
        case 'End':
          e.preventDefault()
          adjust(1)
          break
      }
    },
    [disabled, volume, muted, onMutedChange, onVolumeChange],
  )

  const fillPct = Math.round((muted ? 0 : volume) * 100)

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={
          open
            ? muted
              ? 'Unmute agent audio'
              : 'Mute agent audio'
            : muted
              ? 'Agent audio muted. Open volume slider.'
              : 'Open agent volume slider'
        }
        aria-pressed={open ? muted : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={handleIconClick}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-150',
          'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          'disabled:opacity-50 disabled:pointer-events-none',
          muted ? 'text-destructive' : 'text-foreground',
        )}
      >
        <Icon size={20} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Agent output volume"
          className={cn(
            'absolute left-1/2 -translate-x-1/2 -translate-y-2 bottom-full z-50',
            'flex flex-col items-center gap-2 rounded-md border border-border bg-card px-2 py-3',
            'vc-panel-shadow',
          )}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {muted ? 'mute' : `${fillPct}%`}
          </div>
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Agent output volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fillPct}
            aria-orientation="vertical"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleSliderKey}
            className={cn(
              'relative w-2 cursor-pointer rounded-full bg-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            )}
            style={{ height: SLIDER_HEIGHT }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full bg-primary"
              style={{ height: `${fillPct}%` }}
            />
            <div
              className="absolute left-1/2 size-3 -translate-x-1/2 rounded-full border border-border bg-background shadow-sm"
              style={{ bottom: `calc(${fillPct}% - 6px)` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickIcon(level: number, muted: boolean) {
  if (muted || level <= 0) return VolumeX
  if (level < 0.34) return Volume
  if (level < 0.67) return Volume1
  return Volume2
}
