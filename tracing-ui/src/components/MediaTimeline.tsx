"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MediaRow, TraceWithObservations, VoiceTurn } from "@/lib/db"
import { ThumbnailStrip, type ThumbnailFrame, nearestFrameIndex } from "./ThumbnailStrip"
import { WaveformView } from "./WaveformView"
import { getSessionMediaUrls, mediaPathUrl } from "./media-paths"

export type MediaTimelineProps = {
  sessionId: string
  media: MediaRow[]
  durationMs: number
  turns?: VoiceTurn[] | TraceWithObservations[]
  sessionStartNs?: number
  highlightedTraceId?: string | null
  seekRequest?: { timeMs: number; nonce: number }
  onTimeChange?: (timeMs: number) => void
}

export function MediaTimeline({
  sessionId,
  media,
  durationMs,
  turns = [],
  sessionStartNs,
  highlightedTraceId,
  seekRequest,
  onTimeChange,
}: MediaTimelineProps) {
  const userAudioRef = useRef<HTMLAudioElement>(null)
  const assistantAudioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [frames, setFrames] = useState<ThumbnailFrame[]>([])
  const urls = useMemo(() => getSessionMediaUrls(sessionId, media), [media, sessionId])
  const totalMs = Math.max(1, durationMs || inferDurationMs(media))
  const hasSessionUser = media.some((m) => m.kind === "session_user_audio")
  const hasSessionAssistant = media.some((m) => m.kind === "session_assistant_audio")
  const primaryRef = hasSessionUser || !hasSessionAssistant ? userAudioRef : assistantAudioRef

  useEffect(() => {
    const user = userAudioRef.current
    const assistant = assistantAudioRef.current
    if (user) user.playbackRate = rate
    if (assistant) assistant.playbackRate = rate
  }, [rate])

  useEffect(() => {
    drawNearestFrame(canvasRef.current, urls.sessionDir, frames, currentTimeMs)
  }, [currentTimeMs, frames, urls.sessionDir])

  const seek = useCallback(
    (timeMs: number) => {
      const nextMs = clamp(timeMs, 0, totalMs)
      setCurrentTimeMs(nextMs)
      syncAudioTime(userAudioRef.current, nextMs)
      syncAudioTime(assistantAudioRef.current, nextMs)
    },
    [totalMs],
  )

  useEffect(() => {
    if (seekRequest) seek(seekRequest.timeMs)
  }, [seek, seekRequest])

  useEffect(() => {
    onTimeChange?.(currentTimeMs)
  }, [currentTimeMs, onTimeChange])

  const togglePlay = useCallback(async () => {
    const user = userAudioRef.current
    const assistant = assistantAudioRef.current
    if (playing) {
      user?.pause()
      assistant?.pause()
      setPlaying(false)
      return
    }
    syncAudioTime(user, currentTimeMs)
    syncAudioTime(assistant, currentTimeMs)
    const results = await Promise.all([playAudio(user), playAudio(assistant)])
    if (results.some(Boolean)) {
      setPlaying(true)
    } else {
      setPlaying(false)
    }
  }, [currentTimeMs, playing])

  const onPrimaryTimeUpdate = useCallback(() => {
    const primary = primaryRef.current
    if (!primary) return
    const nextMs = primary.currentTime * 1000
    setCurrentTimeMs(nextMs)
    correctDrift(userAudioRef.current, nextMs)
    correctDrift(assistantAudioRef.current, nextMs)
    if (nextMs >= totalMs - 50) setPlaying(false)
  }, [primaryRef, totalMs])

  const markers = useMemo(
    () => buildTurnMarkers(turns, sessionStartNs, totalMs),
    [sessionStartNs, totalMs, turns],
  )

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/70 p-5">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">
              Session media
            </div>
            <div className="text-sm text-zinc-100">Captured audio/video</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-100 hover:bg-zinc-900"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <div className="font-mono text-xs tabular-nums text-zinc-400">
              {formatTime(currentTimeMs)} / {formatTime(totalMs)}
            </div>
            <select
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
            >
              {[0.5, 1, 1.25, 1.5, 2].map((value) => (
                <option key={value} value={value}>
                  {value}x
                </option>
              ))}
            </select>
          </div>
        </div>

        <canvas ref={canvasRef} className="h-64 w-full rounded border border-zinc-800 bg-black" />

        <WaveformView
          peaksUrl={urls.peaksUrl}
          currentTimeMs={currentTimeMs}
          durationMs={totalMs}
          onSeek={seek}
        />

        <ThumbnailStrip
          thumbnailsUrl={urls.thumbnailsUrl}
          sessionDir={urls.sessionDir}
          currentTimeMs={currentTimeMs}
          durationMs={totalMs}
          onSeek={seek}
          onFrames={setFrames}
        />

        {markers.length > 0 && (
          <div className="relative h-3 rounded bg-zinc-900">
            {markers.map((marker) => (
              <button
                key={marker.id}
                type="button"
                onClick={() => seek(marker.startMs)}
                className={[
                  "absolute top-0 h-3 min-w-1 rounded-sm",
                  marker.id === highlightedTraceId ? "bg-blue-300" : "bg-zinc-500 hover:bg-zinc-300",
                ].join(" ")}
                style={{
                  left: `${marker.leftPct}%`,
                  width: `${marker.widthPct}%`,
                }}
                title={marker.label}
              />
            ))}
          </div>
        )}

        <audio
          ref={userAudioRef}
          src={urls.userAudioUrl ?? undefined}
          preload="metadata"
          onTimeUpdate={primaryRef === userAudioRef ? onPrimaryTimeUpdate : undefined}
          onEnded={() => setPlaying(false)}
        />
        <audio
          ref={assistantAudioRef}
          src={urls.assistantAudioUrl ?? undefined}
          preload="metadata"
          onTimeUpdate={primaryRef === assistantAudioRef ? onPrimaryTimeUpdate : undefined}
          onEnded={() => setPlaying(false)}
        />
      </div>
    </div>
  )
}

function buildTurnMarkers(
  turns: Array<VoiceTurn | TraceWithObservations>,
  sessionStartNs: number | undefined,
  totalMs: number,
): { id: string; label: string; startMs: number; leftPct: number; widthPct: number }[] {
  if (sessionStartNs == null) return []
  return turns.map((turn, index) => {
    const startMs = Math.max(0, Math.round((Number(turn.start_time_ns) - sessionStartNs) / 1e6))
    const endMs =
      turn.end_time_ns != null
        ? Math.max(startMs, Math.round((Number(turn.end_time_ns) - sessionStartNs) / 1e6))
        : startMs + 250
    return {
      id: turn.trace_id,
      label: `Turn ${index + 1}`,
      startMs,
      leftPct: clamp((startMs / totalMs) * 100, 0, 100),
      widthPct: Math.max(0.5, clamp(((endMs - startMs) / totalMs) * 100, 0.5, 100)),
    }
  })
}

function drawNearestFrame(
  canvas: HTMLCanvasElement | null,
  sessionDir: string,
  frames: ThumbnailFrame[],
  currentTimeMs: number,
) {
  if (!canvas) return
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const idx = nearestFrameIndex(frames, currentTimeMs)
  if (idx < 0) {
    const rect = canvas.getBoundingClientRect()
    const scale = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(rect.width * scale))
    canvas.height = Math.max(1, Math.floor(rect.height * scale))
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#71717a"
    ctx.font = `${12 * scale}px system-ui, sans-serif`
    ctx.fillText("No video captured", 14 * scale, 24 * scale)
    return
  }
  const frame = frames[idx]
  const img = new Image()
  img.onload = () => {
    const rect = canvas.getBoundingClientRect()
    const scale = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(rect.width * scale))
    canvas.height = Math.max(1, Math.floor(rect.height * scale))
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const fitted = fitRect(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height)
    ctx.drawImage(img, fitted.x, fitted.y, fitted.width, fitted.height)
  }
  img.src = mediaPathUrl(sessionDir, frame.frameFile)
}

function fitRect(srcWidth: number, srcHeight: number, destWidth: number, destHeight: number) {
  const scale = Math.min(destWidth / Math.max(1, srcWidth), destHeight / Math.max(1, srcHeight))
  const width = srcWidth * scale
  const height = srcHeight * scale
  return {
    x: (destWidth - width) / 2,
    y: (destHeight - height) / 2,
    width,
    height,
  }
}

function syncAudioTime(audio: HTMLAudioElement | null, timeMs: number) {
  if (!audio) return
  audio.currentTime = timeMs / 1000
}

async function playAudio(audio: HTMLAudioElement | null): Promise<boolean> {
  if (!audio || !audio.src) return false
  try {
    await audio.play()
    return true
  } catch {
    return false
  }
}

function correctDrift(audio: HTMLAudioElement | null, targetMs: number) {
  if (!audio || audio.paused) return
  const driftMs = Math.abs(audio.currentTime * 1000 - targetMs)
  if (driftMs > 50) syncAudioTime(audio, targetMs)
}

function inferDurationMs(media: MediaRow[]): number {
  const durations = media
    .filter((m) => m.kind === "session_user_audio" || m.kind === "session_assistant_audio")
    .map((m) => m.duration_ms ?? 0)
  return Math.max(1, ...durations)
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
