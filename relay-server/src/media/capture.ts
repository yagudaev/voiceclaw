// Per-session media capture: tees client-mic PCM + model-output PCM to on-disk
// flat files so the tracing UI can replay each turn. Video frames (Gemini Live
// screen share) land as numbered JPEGs with a sidecar timings.json.
//
// Files live under `~/.voiceclaw/media/<sessionKey>/`:
//
//   user-<turnId>.pcm            mono PCM16 little-endian
//   user-<turnId>.pcm.json       { "sampleRate": 24000, "channels": 1 }
//   assistant-<turnId>.pcm
//   assistant-<turnId>.pcm.json
//   video-<turnId>/0000.jpeg     (one JPEG per frame)
//   video-<turnId>/timings.json  { "frames": [{ "offset_ms": 0, "file": "0000.jpeg" }, …] }
//
// Capture is OPT-IN via `VOICECLAW_MEDIA_CAPTURE=enabled` (default off) so it
// never surprises prod operators with disk usage. When enabled, the session
// owns one instance; the relay calls `onUserAudioChunk` / `onAssistantAudioChunk`
// / `onVideoFrame` during the turn and `finalizeTurn()` at turn.ended to
// return the sidecar attrs to stamp on the voice-turn span.
//
// Langfuse Media upload is deferred behind a `enableLangfuseUpload` flag that
// is currently hardcoded to false — the Langfuse v5 Media API requires an
// external SDK call that we'd rather wire under a separate PR after this
// flat-file capture has shaken out in the real session pipeline. Local path
// capture alone is a huge UX win already.

import { createHash } from "node:crypto"
import { createWriteStream, existsSync, mkdirSync, type WriteStream } from "node:fs"
import { promises as fs } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { log } from "../log.js"
import {
  SESSION_DIR_NAME,
  PEAKS_TARGET_COUNT,
  THUMBNAIL_MAX_COUNT,
  buildSessionMediaAttrs,
  computePeaks,
  selectThumbnails,
  writeJsonFile,
  writeSessionWav,
  type SessionMediaAttrs,
  type TurnVideoEntry,
} from "./session-media.js"

export type MediaCaptureAttrs = {
  // Stamped on the voice-turn span. Vendor-neutral `media.*` prefix.
  [key: string]: string | number | boolean | undefined
}

export type MediaCaptureConfig = {
  // Defaults: `VOICECLAW_MEDIA_CAPTURE=enabled` + `~/.voiceclaw/media`.
  enabled?: boolean
  rootDir?: string
  userSampleRate?: number
  assistantSampleRate?: number
}

export class MediaCapture {
  private config: Required<Omit<MediaCaptureConfig, "enabled">> & { enabled: boolean }
  private sessionDir: string | null = null
  private sessionKey: string | null = null
  private sessionStartMs: number = 0
  private currentTurn: TurnState | null = null
  // Per-turn finalize results accumulated so finalizeSession() can stitch
  // them into session.wav / peaks.json / thumbnails.json without re-reading
  // every file off disk (paths are enough; contents are streamed at finalize
  // time for the WAV stitcher and peaks downsampler).
  private completedTurns: CompletedTurn[] = []

  constructor(config: MediaCaptureConfig = {}) {
    const enabled = config.enabled ?? (process.env.VOICECLAW_MEDIA_CAPTURE === "enabled")
    this.config = {
      enabled,
      rootDir:
        config.rootDir
        ?? process.env.VOICECLAW_MEDIA_DIR
        ?? join(homedir(), ".voiceclaw", "media"),
      // 24 kHz is VoiceClaw's client mic default and Gemini's output rate.
      userSampleRate: config.userSampleRate ?? 24000,
      assistantSampleRate: config.assistantSampleRate ?? 24000,
    }
  }

  startSession(sessionKey: string): void {
    if (!this.config.enabled) return
    // Sanitize — session keys can include `/` and other path chars when callers
    // derive them from external IDs. Hash anything unsafe so paths stay flat
    // and predictable.
    const safe = isSafeSegment(sessionKey) ? sessionKey : hashShort(sessionKey)
    this.sessionKey = safe
    this.sessionDir = join(this.config.rootDir, safe)
    this.sessionStartMs = Date.now()
    this.completedTurns = []
    try {
      mkdirSync(this.sessionDir, { recursive: true })
    } catch {
      // If we can't create the dir, disable capture for this session rather
      // than crash the relay.
      this.sessionKey = null
      this.sessionDir = null
    }
  }

  startTurn(turnId: string): void {
    if (!this.config.enabled || !this.sessionDir) return
    // Close any leftover turn state — shouldn't normally fire but guards
    // against a turn.started without a preceding turn.ended.
    void this.finalizeTurn()
    const safeTurn = isSafeSegment(turnId) ? turnId : hashShort(turnId)
    this.currentTurn = openTurn(this.sessionDir, safeTurn, this.config)
  }

  onUserAudioChunk(base64Pcm: string): void {
    const t = this.currentTurn
    if (!t || !t.userStream) return
    const buf = Buffer.from(base64Pcm, "base64")
    t.userStream.write(buf)
    t.userBytes += buf.byteLength
  }

  onAssistantAudioChunk(base64Pcm: string): void {
    const t = this.currentTurn
    if (!t || !t.assistantStream) return
    const buf = Buffer.from(base64Pcm, "base64")
    t.assistantStream.write(buf)
    t.assistantBytes += buf.byteLength
  }

  onVideoFrame(base64Jpeg: string, offsetMs: number): void {
    const t = this.currentTurn
    if (!t || !t.videoDir) return
    // Lazy-create the per-turn video dir on first frame so audio-only turns
    // don't leave empty scaffolding behind. Safe to call repeatedly.
    if (!t.videoDirReady) {
      try {
        mkdirSync(t.videoDir, { recursive: true })
        t.videoDirReady = true
      } catch {
        return
      }
    }
    const idx = t.videoFrames.length
    const file = `${String(idx).padStart(4, "0")}.jpeg`
    const abs = join(t.videoDir, file)
    try {
      const buf = Buffer.from(base64Jpeg, "base64")
      // Track the write promise and wait for settled before finalize so
      // timings.json can't list a frame whose JPEG hasn't landed yet.
      const p = fs.writeFile(abs, buf).catch(() => undefined)
      t.frameWrites.push(p)
      t.videoFrames.push({ offset_ms: offsetMs, file })
    } catch {
      // Drop the frame on sync-encode failure — don't kill the turn.
    }
  }

  // Close files and return attrs for the span. Safe to call if no turn is
  // active; returns an empty object in that case.
  async finalizeTurn(): Promise<MediaCaptureAttrs> {
    const t = this.currentTurn
    if (!t) return {}
    this.currentTurn = null

    const elapsedMs = Date.now() - t.startedAt
    const attrs: MediaCaptureAttrs = {
      "media.turn_id": t.turnId,
    }

    if (t.userStream) {
      await closeStream(t.userStream)
      const durationMs = estimatePcmDurationMs(t.userBytes, this.config.userSampleRate, 1)
      await writeSidecar(t.userPcmPath + ".json", {
        sampleRate: this.config.userSampleRate,
        channels: 1,
      })
      attrs["media.user_audio.path"] = t.userPcmPath
      attrs["media.user_audio.duration_ms"] = durationMs
      attrs["media.user_audio.sample_rate"] = this.config.userSampleRate
      attrs["media.user_audio.codec"] = "pcm_s16le"
      attrs["media.user_audio.bytes"] = t.userBytes
      attrs["media.user_audio.provider"] = "local"
    }

    if (t.assistantStream) {
      await closeStream(t.assistantStream)
      const durationMs = estimatePcmDurationMs(
        t.assistantBytes,
        this.config.assistantSampleRate,
        1,
      )
      await writeSidecar(t.assistantPcmPath + ".json", {
        sampleRate: this.config.assistantSampleRate,
        channels: 1,
      })
      attrs["media.assistant_audio.path"] = t.assistantPcmPath
      attrs["media.assistant_audio.duration_ms"] = durationMs
      attrs["media.assistant_audio.sample_rate"] = this.config.assistantSampleRate
      attrs["media.assistant_audio.codec"] = "pcm_s16le"
      attrs["media.assistant_audio.bytes"] = t.assistantBytes
      attrs["media.assistant_audio.provider"] = "local"
    }

    if (t.videoDir && t.videoFrames.length > 0) {
      // Wait for all per-frame JPEG writes to settle before emitting the
      // timings manifest — otherwise the UI can fetch timings.json and see
      // a frame that doesn't exist on disk yet.
      if (t.frameWrites.length > 0) await Promise.allSettled(t.frameWrites)
      const timingsPath = join(t.videoDir, "timings.json")
      await fs.writeFile(timingsPath, JSON.stringify({ frames: t.videoFrames }, null, 2))
      attrs["media.user_video.path"] = t.videoDir
      attrs["media.user_video.frame_count"] = t.videoFrames.length
      attrs["media.user_video.duration_ms"] = elapsedMs
      attrs["media.user_video.codec"] = "jpeg_sequence"
      attrs["media.user_video.provider"] = "local"
    }

    // Record this turn's summary for later session-level stitching. We keep
    // paths, not bytes — the session finalize path re-reads files off disk so
    // in-memory footprint stays O(1) regardless of session length.
    this.completedTurns.push({
      turnId: t.turnId,
      userPcmPath: t.userStream ? t.userPcmPath : null,
      userBytes: t.userBytes,
      assistantPcmPath: t.assistantStream ? t.assistantPcmPath : null,
      assistantBytes: t.assistantBytes,
      videoDir: t.videoDir && t.videoFrames.length > 0 ? t.videoDir : null,
      videoFrames: t.videoFrames.slice(),
      turnStartRelMs: Math.max(0, t.startedAt - this.sessionStartMs),
    })

    return attrs
  }

  // Finalize the session: stitch per-turn PCMs into session/{user,assistant}.wav,
  // downsample to peaks.json, and pick representative thumbnails. Returns the
  // vendor-neutral `media.session_*` attrs the relay should stamp on the final
  // voice-turn (or a sibling session-level span) so the collector indexes them.
  //
  // Idempotent: safe to call multiple times. A second call re-does the writes
  // with the current turn list, which is what we want if endSession() runs
  // twice due to an awkward disconnect/cleanup interleaving.
  async finalizeSession(): Promise<SessionMediaAttrs> {
    if (!this.config.enabled || !this.sessionDir) return {}
    if (this.completedTurns.length === 0) return {}

    const sessionMediaDir = join(this.sessionDir, SESSION_DIR_NAME)
    try {
      mkdirSync(sessionMediaDir, { recursive: true })
    } catch {
      return {}
    }

    const userPcmPaths = this.completedTurns
      .filter((t) => t.userPcmPath && t.userBytes > 0)
      .map((t) => t.userPcmPath as string)
    const assistantPcmPaths = this.completedTurns
      .filter((t) => t.assistantPcmPath && t.assistantBytes > 0)
      .map((t) => t.assistantPcmPath as string)

    const userWavPath = userPcmPaths.length > 0 ? join(sessionMediaDir, "user.wav") : null
    const assistantWavPath =
      assistantPcmPaths.length > 0 ? join(sessionMediaDir, "assistant.wav") : null
    let userBytes = 0
    let assistantBytes = 0
    if (userWavPath) {
      userBytes = await writeSessionWav({
        pcmPaths: userPcmPaths,
        outPath: userWavPath,
        sampleRate: this.config.userSampleRate,
      }).catch(() => 0)
    }
    if (assistantWavPath) {
      assistantBytes = await writeSessionWav({
        pcmPaths: assistantPcmPaths,
        outPath: assistantWavPath,
        sampleRate: this.config.assistantSampleRate,
      }).catch(() => 0)
    }

    // peaks.json — read back whichever WAVs we wrote and downsample their PCM
    // sections. We strip the 44-byte header since computePeaks operates on
    // raw PCM16-LE.
    const userPeaks = await loadWavPcm(userWavPath).then((pcm) => (pcm ? computePeaks(pcm, PEAKS_TARGET_COUNT) : []))
    const assistantPeaks = await loadWavPcm(assistantWavPath).then((pcm) => (pcm ? computePeaks(pcm, PEAKS_TARGET_COUNT) : []))
    const peaksPath = userWavPath || assistantWavPath ? join(sessionMediaDir, "peaks.json") : null
    if (peaksPath) {
      await writeJsonFile(peaksPath, {
        user: userPeaks,
        assistant: assistantPeaks,
        userDurationMs: estimatePcmDurationMs(userBytes, this.config.userSampleRate, 1),
        assistantDurationMs: estimatePcmDurationMs(
          assistantBytes,
          this.config.assistantSampleRate,
          1,
        ),
        sampleRate: this.config.userSampleRate,
      })
    }

    // thumbnails.json — uniformly sample frames across the session.
    const videoEntries: TurnVideoEntry[] = this.completedTurns
      .filter((t) => t.videoDir && t.videoFrames.length > 0)
      .map((t) => ({
        turnId: t.turnId,
        videoDir: t.videoDir,
        frames: t.videoFrames,
        turnStartMs: t.turnStartRelMs,
      }))
    const thumbnailsJson = selectThumbnails(videoEntries, this.sessionDir, THUMBNAIL_MAX_COUNT)
    const thumbnailsPath =
      thumbnailsJson.frames.length > 0 ? join(sessionMediaDir, "thumbnails.json") : null
    if (thumbnailsPath) {
      await writeJsonFile(thumbnailsPath, thumbnailsJson)
    }

    return buildSessionMediaAttrs({
      userWavPath,
      userDurationMs: estimatePcmDurationMs(userBytes, this.config.userSampleRate, 1),
      assistantWavPath,
      assistantDurationMs: estimatePcmDurationMs(
        assistantBytes,
        this.config.assistantSampleRate,
        1,
      ),
      sampleRate: this.config.userSampleRate,
      peaksPath,
      thumbnailsPath,
      thumbnailCount: thumbnailsJson.frames.length,
    })
  }

  async endSession(): Promise<void> {
    // Close out any unfinished turn — late close shouldn't lose captured
    // bytes. Awaited so callers can wait for on-disk state to settle before
    // tearing down the tracer.
    await this.finalizeTurn().catch(() => undefined)
    this.sessionDir = null
    this.sessionKey = null
    this.completedTurns = []
  }

  isEnabled(): boolean {
    return this.config.enabled
  }
}

// --- internal types + helpers ---

type TurnState = {
  turnId: string
  startedAt: number
  userPcmPath: string
  userStream: WriteStream | null
  userBytes: number
  assistantPcmPath: string
  assistantStream: WriteStream | null
  assistantBytes: number
  videoDir: string | null
  videoDirReady: boolean
  videoFrames: { offset_ms: number; file: string }[]
  frameWrites: Promise<void | undefined>[]
}

type CompletedTurn = {
  turnId: string
  userPcmPath: string | null
  userBytes: number
  assistantPcmPath: string | null
  assistantBytes: number
  videoDir: string | null
  videoFrames: { offset_ms: number; file: string }[]
  turnStartRelMs: number
}

function openTurn(
  sessionDir: string,
  turnId: string,
  _cfg: Required<Omit<MediaCaptureConfig, "enabled">> & { enabled: boolean },
): TurnState {
  const userPath = join(sessionDir, `user-${turnId}.pcm`)
  const assistantPath = join(sessionDir, `assistant-${turnId}.pcm`)
  const videoDir = join(sessionDir, `video-${turnId}`)
  const userStream = openStreamOrNull(userPath, "user")
  const assistantStream = openStreamOrNull(assistantPath, "assistant")
  // Video dir is created lazily on first frame to avoid scattering empty
  // `video-<turnId>/` dirs for audio-only turns.
  const videoDirReady = existsSync(videoDir)
  return {
    turnId,
    startedAt: Date.now(),
    userPcmPath: userPath,
    userStream,
    userBytes: 0,
    assistantPcmPath: assistantPath,
    assistantStream,
    assistantBytes: 0,
    videoDir,
    videoDirReady,
    videoFrames: [],
    frameWrites: [],
  }
}

// Open a PCM write stream, attaching an async `error` handler up front.
// Without this, a later async write failure (disk full, I/O error, file
// gets unlinked mid-call) emits an unhandled `error` event which kills
// the relay process. We'd rather silently drop capture for this turn.
function openStreamOrNull(path: string, label: string): WriteStream | null {
  try {
    const s = createWriteStream(path)
    s.on("error", (err) => {
      log(
        `[media-capture] ${label} stream error on ${path}: ${
          err instanceof Error ? err.message : String(err)
        }. Dropping capture for this stream.`,
      )
    })
    return s
  } catch {
    return null
  }
}

function closeStream(stream: WriteStream): Promise<void> {
  return new Promise((resolve) => {
    stream.end(() => resolve())
  })
}

async function writeSidecar(path: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fs.writeFile(path, JSON.stringify(payload, null, 2))
  } catch {
    // non-fatal
  }
}

function estimatePcmDurationMs(bytes: number, sampleRate: number, channels: number): number {
  if (bytes <= 0 || sampleRate <= 0) return 0
  const samples = bytes / (channels * 2) // int16
  return Math.round((samples / sampleRate) * 1000)
}

function isSafeSegment(s: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(s) && s.length < 128
}

// Map an unsafe session key onto a stable filesystem-safe name. NOT a
// security primitive — collision resistance is all we need because the
// session key is already trusted-in (we're just path-sanitizing it).
// We use SHA-256 to avoid CodeQL's weak-hash warnings on SHA-1/MD5;
// nothing about the security of the system relies on this being collision
// resistant against an adversary.
function hashShort(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16)
}

// Exposed so callers (e.g. tests) can assert the resolved media root matches
// expectations without replicating the env-var lookup logic.
export function defaultMediaRoot(): string {
  return process.env.VOICECLAW_MEDIA_DIR ?? join(homedir(), ".voiceclaw", "media")
}

export function resolveSessionDir(sessionKey: string, rootDir = defaultMediaRoot()): string {
  const safe = isSafeSegment(sessionKey) ? sessionKey : hashShort(sessionKey)
  return resolve(rootDir, safe)
}

// Read a WAV file written by writeSessionWav and return just its PCM data
// section (everything past the 44-byte canonical header). Returns null if
// the path is null or the file can't be read — callers treat null as "no
// peaks for this track".
async function loadWavPcm(path: string | null): Promise<Buffer | null> {
  if (!path) return null
  try {
    const buf = await fs.readFile(path)
    if (buf.length <= 44) return null
    return buf.subarray(44)
  } catch {
    return null
  }
}
