"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type PeaksJson = {
  user: number[]
  assistant: number[]
  userDurationMs: number
  assistantDurationMs: number
  sampleRate: number
}

export type WaveformViewProps = {
  peaksUrl: string
  currentTimeMs: number
  durationMs: number
  onSeek: (timeMs: number) => void
}

export function WaveformView({
  peaksUrl,
  currentTimeMs,
  durationMs,
  onSeek,
}: WaveformViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [peaks, setPeaks] = useState<PeaksJson | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMissing(false)
    fetch(peaksUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return
        if (isPeaksJson(json)) setPeaks(json)
        else setMissing(true)
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    return () => {
      cancelled = true
    }
  }, [peaksUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks) return
    drawWaveform(canvas, peaks, currentTimeMs, durationMs)
  }, [peaks, currentTimeMs, durationMs])

  const handlePointer = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
      onSeek(clamp(ratio, 0, 1) * durationMs)
    },
    [durationMs, onSeek],
  )

  if (missing) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-6 text-center text-xs text-zinc-500">
        No audio captured for this session.
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="h-36 w-full cursor-pointer rounded border border-zinc-800 bg-zinc-950"
      onClick={(e) => handlePointer(e.clientX)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        handlePointer(e.clientX)
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) handlePointer(e.clientX)
      }}
    />
  )
}

export function mapPeakToTrackY(peak: number, baselineY: number, halfHeight: number): number {
  return baselineY - normalizePeak(peak) * halfHeight
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  peaks: PeaksJson,
  currentTimeMs: number,
  durationMs: number,
) {
  const rect = canvas.getBoundingClientRect()
  const scale = window.devicePixelRatio || 1
  const width = Math.max(1, Math.floor(rect.width * scale))
  const height = Math.max(1, Math.floor(rect.height * scale))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = "#09090b"
  ctx.fillRect(0, 0, width, height)

  const paddingX = 10 * scale
  const trackHeight = (height - 32 * scale) / 2
  const assistantBase = 20 * scale + trackHeight / 2
  const userBase = 22 * scale + trackHeight + trackHeight / 2
  const halfHeight = Math.max(4 * scale, trackHeight * 0.42)

  drawTicks(ctx, width, height, paddingX, durationMs, scale)
  drawTrack(ctx, peaks.assistant, paddingX, width - paddingX, assistantBase, halfHeight, "#34d399")
  drawTrack(ctx, peaks.user, paddingX, width - paddingX, userBase, halfHeight, "#60a5fa")
  drawTrackLabel(ctx, "Assistant", paddingX, assistantBase - halfHeight - 3 * scale, "#a7f3d0", scale)
  drawTrackLabel(ctx, "User", paddingX, userBase - halfHeight - 3 * scale, "#bfdbfe", scale)

  const playheadX = paddingX + clamp(currentTimeMs / Math.max(1, durationMs), 0, 1) * (width - paddingX * 2)
  ctx.strokeStyle = "#f4f4f5"
  ctx.lineWidth = 1 * scale
  ctx.beginPath()
  ctx.moveTo(playheadX, 0)
  ctx.lineTo(playheadX, height)
  ctx.stroke()
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  values: number[],
  left: number,
  right: number,
  baseline: number,
  halfHeight: number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, (right - left) / Math.max(1, values.length) * 0.72)
  const count = values.length
  if (count === 0) {
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(left, baseline)
    ctx.lineTo(right, baseline)
    ctx.stroke()
    ctx.globalAlpha = 1
    return
  }
  for (let i = 0; i < count; i++) {
    const x = left + (i / Math.max(1, count - 1)) * (right - left)
    const top = mapPeakToTrackY(values[i], baseline, halfHeight)
    const bottom = baseline + (baseline - top)
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.stroke()
  }
}

function drawTicks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  paddingX: number,
  durationMs: number,
  scale: number,
) {
  const intervalMs = 10_000
  const count = Math.floor(durationMs / intervalMs)
  ctx.strokeStyle = "#27272a"
  ctx.fillStyle = "#71717a"
  ctx.lineWidth = 1 * scale
  ctx.font = `${10 * scale}px ui-monospace, SFMono-Regular, Menlo, monospace`
  for (let i = 0; i <= count; i++) {
    const time = i * intervalMs
    const x = paddingX + (time / Math.max(1, durationMs)) * (width - paddingX * 2)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    ctx.fillText(`${time / 1000}s`, x + 4 * scale, height - 7 * scale)
  }
}

function drawTrackLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  scale: number,
) {
  ctx.fillStyle = color
  ctx.font = `${10 * scale}px ui-monospace, SFMono-Regular, Menlo, monospace`
  ctx.fillText(label, x, y)
}

function isPeaksJson(value: unknown): value is PeaksJson {
  if (!value || typeof value !== "object") return false
  const candidate = value as PeaksJson
  return Array.isArray(candidate.user) && Array.isArray(candidate.assistant)
}

function normalizePeak(peak: number): number {
  if (!Number.isFinite(peak) || peak <= 0) return 0
  const normalized = peak > 1 ? peak / 32767 : peak
  return clamp(normalized, 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
