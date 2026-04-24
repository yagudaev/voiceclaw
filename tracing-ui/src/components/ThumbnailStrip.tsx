"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { mediaPathUrl } from "./media-paths"

export type ThumbnailFrame = {
  frameFile: string
  timeMs: number
}

export type ThumbnailsJson = {
  frames: ThumbnailFrame[]
}

export type ThumbnailStripProps = {
  thumbnailsUrl: string
  sessionDir: string
  currentTimeMs: number
  durationMs: number
  onSeek: (timeMs: number) => void
  onFrames?: (frames: ThumbnailFrame[]) => void
}

export function ThumbnailStrip({
  thumbnailsUrl,
  sessionDir,
  currentTimeMs,
  durationMs,
  onSeek,
  onFrames,
}: ThumbnailStripProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [frames, setFrames] = useState<ThumbnailFrame[]>([])
  const [missing, setMissing] = useState(false)
  const activeIndex = useMemo(
    () => nearestFrameIndex(frames, currentTimeMs),
    [frames, currentTimeMs],
  )

  useEffect(() => {
    let cancelled = false
    setMissing(false)
    fetch(thumbnailsUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return
        const nextFrames = isThumbnailsJson(json) ? json.frames.slice(0, 20) : []
        setFrames(nextFrames)
        setMissing(nextFrames.length === 0)
        onFrames?.(nextFrames)
      })
      .catch(() => {
        if (cancelled) return
        setMissing(true)
        onFrames?.([])
      })
    return () => {
      cancelled = true
    }
  }, [onFrames, thumbnailsUrl])

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = stripRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
      onSeek(clamp(ratio, 0, 1) * durationMs)
    },
    [durationMs, onSeek],
  )

  if (missing) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-4 text-center text-xs text-zinc-500">
        No video thumbnails captured.
      </div>
    )
  }

  return (
    <div
      ref={stripRef}
      className="grid h-20 cursor-ew-resize grid-flow-col auto-cols-fr overflow-hidden rounded border border-zinc-800 bg-zinc-950"
      onClick={(e) => seekFromClientX(e.clientX)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        seekFromClientX(e.clientX)
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) seekFromClientX(e.clientX)
      }}
    >
      {frames.map((frame, index) => (
        <div
          key={`${frame.frameFile}-${frame.timeMs}`}
          className={[
            "relative min-w-0 border-r border-zinc-950 last:border-r-0",
            activeIndex === index ? "ring-2 ring-inset ring-blue-400" : "",
          ].join(" ")}
        >
          <img
            src={mediaPathUrl(sessionDir, frame.frameFile)}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1 font-mono text-[10px] text-zinc-200">
            {formatTime(frame.timeMs)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function nearestFrameIndex(frames: ThumbnailFrame[], currentTimeMs: number): number {
  if (frames.length === 0) return -1
  let bestIndex = 0
  let bestDelta = Number.POSITIVE_INFINITY
  for (let i = 0; i < frames.length; i++) {
    const delta = Math.abs(frames[i].timeMs - currentTimeMs)
    if (delta < bestDelta) {
      bestIndex = i
      bestDelta = delta
    }
  }
  return bestIndex
}

function isThumbnailsJson(value: unknown): value is ThumbnailsJson {
  if (!value || typeof value !== "object") return false
  const frames = (value as ThumbnailsJson).frames
  return Array.isArray(frames)
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
