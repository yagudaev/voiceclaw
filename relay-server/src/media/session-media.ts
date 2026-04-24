// Session-level media artifacts: stitch per-turn PCM/JPEG captures into
// session-scoped WAVs, a peaks.json for waveform rendering, and a
// thumbnails.json manifest selecting a bounded set of representative frames
// across the whole session.
//
// Layout (in addition to the per-turn files written by capture.ts):
//
//   ~/.voiceclaw/media/<sessionKey>/
//     session/
//       user.wav           - mono 16-bit PCM, full session duration
//       assistant.wav      - mono 16-bit PCM, full session duration
//       peaks.json         - { user: number[], assistant: number[], ... }
//       thumbnails.json    - { frames: [{ frameFile, timeMs }] }
//
// The per-turn `user-<turnId>.pcm` and `video-<turnId>/*.jpeg` files stay
// exactly where capture.ts wrote them — thumbnails.json just lists which
// already-existing files the UI should render.
//
// All functions here are pure-ish I/O helpers. MediaCapture drives them from
// finalizeSession().

import { promises as fs } from "node:fs"
import { join, basename, dirname, relative } from "node:path"

export const SESSION_DIR_NAME = "session"
export const PEAKS_TARGET_COUNT = 2000
export const THUMBNAIL_MAX_COUNT = 20

export type TurnAudioEntry = {
  turnId: string
  userPcmPath: string | null
  userBytes: number
  assistantPcmPath: string | null
  assistantBytes: number
  turnStartMs: number // session-relative, for ordering
}

export type TurnVideoEntry = {
  turnId: string
  videoDir: string | null
  frames: { file: string, offset_ms: number }[]
  turnStartMs: number // session-relative
}

export type PeaksJson = {
  user: number[]
  assistant: number[]
  userDurationMs: number
  assistantDurationMs: number
  sampleRate: number
}

export type ThumbnailsJson = {
  frames: { frameFile: string, timeMs: number }[]
}

export type SessionMediaAttrs = {
  "media.session_audio.user.path"?: string
  "media.session_audio.user.duration_ms"?: number
  "media.session_audio.assistant.path"?: string
  "media.session_audio.assistant.duration_ms"?: number
  "media.session_audio.sample_rate"?: number
  "media.session_audio.peaks_path"?: string
  "media.session_video.thumbnails_path"?: string
  "media.session_video.frame_count"?: number
}

// Stitch a sequence of per-turn PCM files into a single mono 16-bit WAV at the
// given sample rate. Order is preserved as given. Missing / unreadable files
// are skipped (with no gap insertion — the spec is to concatenate what
// actually exists, not pad with silence). Returns total PCM bytes written.
export async function writeSessionWav(opts: {
  pcmPaths: string[]
  outPath: string
  sampleRate: number
}): Promise<number> {
  const { pcmPaths, outPath, sampleRate } = opts
  const buffers: Buffer[] = []
  for (const p of pcmPaths) {
    if (!p) continue
    try {
      const buf = await fs.readFile(p)
      if (buf.length > 0) buffers.push(buf)
    } catch {
      // Skip missing / unreadable segments — capture may have aborted mid-turn.
    }
  }
  const pcm = Buffer.concat(buffers)
  await fs.mkdir(dirname(outPath), { recursive: true })
  const wav = pcmToWav(pcm, sampleRate, 1)
  await fs.writeFile(outPath, wav)
  return pcm.length
}

// Downsample a concatenated PCM16-LE buffer into `targetCount` max-absolute
// peaks. A "peak" here is the max absolute sample amplitude in each bucket,
// normalized into [0, 1] so the UI can render without knowing the bit depth.
//
// Handles non-multiple lengths by assigning each sample to a bucket via
// floor(i / samplesPerBucket). The last bucket may be slightly shorter; that's
// fine — 2000 peaks across ~40s still produce a smooth waveform.
export function computePeaks(pcm: Buffer, targetCount: number = PEAKS_TARGET_COUNT): number[] {
  if (pcm.length < 2 || targetCount <= 0) return []
  const totalSamples = Math.floor(pcm.length / 2)
  if (totalSamples === 0) return []
  // Effective count never exceeds available samples — short recordings get
  // one-peak-per-sample instead of lossy over-sampling.
  const count = Math.min(targetCount, totalSamples)
  const samplesPerBucket = totalSamples / count
  const out = new Array<number>(count).fill(0)
  for (let i = 0; i < totalSamples; i++) {
    const b = Math.min(count - 1, Math.floor(i / samplesPerBucket))
    const s = pcm.readInt16LE(i * 2)
    const abs = Math.abs(s)
    if (abs > out[b]) out[b] = abs
  }
  // Normalize to [0, 1] against int16 range.
  return out.map((v) => v / 32767)
}

// Given ordered per-turn video entries, uniformly sample up to `maxCount`
// frames across the whole session. Result preserves order and includes a
// timeMs (session-relative) alongside the frame file path (relative to the
// session root so the UI can stitch into its `/api/media/<sessionId>/...`
// URL layout).
//
// Uniform spacing: for N total frames we pick indices round((i+0.5) * N/K)
// for i in 0..K-1, clamped. This avoids edge-biasing toward the first/last
// frame which pure floor-division would do.
export function selectThumbnails(
  entries: TurnVideoEntry[],
  sessionRootDir: string,
  maxCount: number = THUMBNAIL_MAX_COUNT,
): ThumbnailsJson {
  type FlatFrame = { frameFile: string, timeMs: number }
  const flat: FlatFrame[] = []
  for (const e of entries) {
    if (!e.videoDir) continue
    for (const f of e.frames) {
      const abs = join(e.videoDir, f.file)
      // file paths stored in thumbnails.json are relative to the session dir,
      // so the UI can combine sessionDir + frameFile → URL without knowing
      // the absolute VOICECLAW_MEDIA_DIR.
      const rel = relative(sessionRootDir, abs)
      flat.push({ frameFile: rel, timeMs: e.turnStartMs + f.offset_ms })
    }
  }
  if (flat.length === 0 || maxCount <= 0) return { frames: [] }
  const k = Math.min(maxCount, flat.length)
  const picked: FlatFrame[] = []
  for (let i = 0; i < k; i++) {
    const idx = Math.min(flat.length - 1, Math.floor(((i + 0.5) * flat.length) / k))
    picked.push(flat[idx])
  }
  return { frames: picked }
}

// Write a JSON payload with 2-space indent; best-effort, silent on failure
// because media artifacts should never bring down a session finalize path.
export async function writeJsonFile(path: string, payload: unknown): Promise<void> {
  try {
    await fs.mkdir(dirname(path), { recursive: true })
    await fs.writeFile(path, JSON.stringify(payload, null, 2))
  } catch {
    // non-fatal
  }
}

// Build the session media attrs the relay stamps on the final voice-turn
// (or a sibling session-level span). All keys are vendor-neutral `media.*`.
export function buildSessionMediaAttrs(opts: {
  userWavPath: string | null
  userDurationMs: number
  assistantWavPath: string | null
  assistantDurationMs: number
  sampleRate: number
  peaksPath: string | null
  thumbnailsPath: string | null
  thumbnailCount: number
}): SessionMediaAttrs {
  const attrs: SessionMediaAttrs = {}
  if (opts.userWavPath) {
    attrs["media.session_audio.user.path"] = opts.userWavPath
    attrs["media.session_audio.user.duration_ms"] = opts.userDurationMs
  }
  if (opts.assistantWavPath) {
    attrs["media.session_audio.assistant.path"] = opts.assistantWavPath
    attrs["media.session_audio.assistant.duration_ms"] = opts.assistantDurationMs
  }
  if (opts.userWavPath || opts.assistantWavPath) {
    attrs["media.session_audio.sample_rate"] = opts.sampleRate
  }
  if (opts.peaksPath) attrs["media.session_audio.peaks_path"] = opts.peaksPath
  if (opts.thumbnailsPath) {
    attrs["media.session_video.thumbnails_path"] = opts.thumbnailsPath
    attrs["media.session_video.frame_count"] = opts.thumbnailCount
  }
  return attrs
}

// --- helpers (private) ---

// Wrap raw PCM16-LE bytes in a minimal 44-byte RIFF/WAVE header. Mirrors the
// header the tracing-ui's media route emits so both producers agree on the
// on-the-wire format.
function pcmToWav(pcm: Buffer, sampleRate: number, channels: number): Buffer {
  const byteRate = sampleRate * channels * 2
  const blockAlign = channels * 2
  const dataSize = pcm.length
  const buf = Buffer.alloc(44 + dataSize)
  let off = 0
  buf.write("RIFF", off); off += 4
  buf.writeUInt32LE(36 + dataSize, off); off += 4
  buf.write("WAVE", off); off += 4
  buf.write("fmt ", off); off += 4
  buf.writeUInt32LE(16, off); off += 4
  buf.writeUInt16LE(1, off); off += 2
  buf.writeUInt16LE(channels, off); off += 2
  buf.writeUInt32LE(sampleRate, off); off += 4
  buf.writeUInt32LE(byteRate, off); off += 4
  buf.writeUInt16LE(blockAlign, off); off += 2
  buf.writeUInt16LE(16, off); off += 2
  buf.write("data", off); off += 4
  buf.writeUInt32LE(dataSize, off); off += 4
  pcm.copy(buf, off)
  return buf
}

// Test-only, kept private (name mangles don't matter for a private helper —
// we expose it to unit tests via the module boundary below).
export const _internal = { pcmToWav, basename }
