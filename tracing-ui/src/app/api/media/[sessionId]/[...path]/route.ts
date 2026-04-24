// Serves captured media bytes to the Turns tab. Files live under
// `~/.voiceclaw/media/<sessionId>/...` where the relay writes them during a
// call. Raw PCM16 audio is re-wrapped into WAV on the fly because browsers
// don't play PCM directly; everything else is streamed verbatim with a
// best-guess Content-Type.
//
// Path-traversal defence: we resolve the requested path inside the session's
// root and reject anything that escapes. Anchoring to the session root (not
// just the media dir) also prevents cross-session reads.

import { promises as fs } from "node:fs"
import { homedir } from "node:os"
import { join, resolve, extname, basename } from "node:path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MEDIA_ROOT = process.env.VOICECLAW_MEDIA_DIR
  ?? join(homedir(), ".voiceclaw", "media")

// PCM sidecar sample rate keys we accept, in order of preference.
const SAMPLE_RATE_KEYS = ["sampleRate", "sample_rate_hz", "sample_rate"]

// User audio is captured post-AEC on the iOS client and echo-gated to match
// what Gemini received (silence frames when the speaker is playing back).
// Result: the raw user PCM is ~30 dB quieter on average than the assistant.
// We auto-normalize user-* files at WAV wrap time so browser playback is
// audible. The on-disk PCM is never mutated — only the streamed copy.
// Proper fix (capture a separate un-gated mic tap in the iOS native module)
// tracked as a follow-up; this is the zero-risk viewer-side patch.
const USER_AUDIO_TARGET_PEAK_I16 = 29000 // ~-1 dB from int16 max (32767)
const USER_AUDIO_MAX_GAIN = 8 // cap amplification — silent files stay silent

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string; path: string[] }> },
) {
  const { sessionId, path } = await ctx.params
  if (!sessionId || !Array.isArray(path) || path.length === 0) {
    return new NextResponse("bad request", { status: 400 })
  }

  const sessionRoot = resolve(MEDIA_ROOT, sessionId)
  const target = resolve(sessionRoot, ...path)
  if (!target.startsWith(sessionRoot + "/") && target !== sessionRoot) {
    return new NextResponse("forbidden", { status: 403 })
  }

  let bytes: Buffer
  try {
    bytes = await fs.readFile(target)
  } catch {
    return new NextResponse("not found", { status: 404 })
  }

  const ext = extname(target).toLowerCase()

  if (ext === ".pcm") {
    const sampleRate = await readSampleRate(target)
    const isUserAudio = basename(target).startsWith("user-")
    const pcmForWav = isUserAudio ? normalizePcmGain(bytes) : bytes
    const wav = pcmToWav(pcmForWav, sampleRate, 1)
    return new NextResponse(wav as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": "audio/wav",
        "cache-control": "no-store",
        "content-length": String(wav.byteLength),
      },
    })
  }

  const contentType = guessContentType(ext)
  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
      "content-length": String(bytes.byteLength),
    },
  })
}

// --- helpers ---

async function readSampleRate(pcmPath: string): Promise<number> {
  // Sidecar convention: `foo.pcm` + `foo.pcm.json` with `{ sampleRate }`. Fall
  // back to 24 kHz since both Gemini Live (output) and VoiceClaw's client
  // microphone (input) default there.
  try {
    const side = await fs.readFile(pcmPath + ".json", "utf8")
    const parsed = JSON.parse(side) as Record<string, unknown>
    for (const k of SAMPLE_RATE_KEYS) {
      const v = parsed[k]
      if (typeof v === "number" && v > 0) return v
    }
  } catch {
    // ignore
  }
  return 24000
}

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

// Scan once for peak absolute sample, compute the gain that would bring the
// peak to TARGET_PEAK_I16, cap it at MAX_GAIN, and apply in a second pass with
// clamping to ±32767. Returns a fresh Buffer; input is untouched.
function normalizePcmGain(pcm: Buffer): Buffer {
  if (pcm.length < 2) return pcm
  const sampleCount = Math.floor(pcm.length / 2)
  let peak = 0
  for (let i = 0; i < sampleCount; i++) {
    const s = pcm.readInt16LE(i * 2)
    const a = Math.abs(s)
    if (a > peak) peak = a
  }
  if (peak === 0) return pcm
  const gain = Math.min(USER_AUDIO_MAX_GAIN, USER_AUDIO_TARGET_PEAK_I16 / peak)
  if (gain <= 1.0001) return pcm
  const out = Buffer.alloc(pcm.length)
  for (let i = 0; i < sampleCount; i++) {
    const s = pcm.readInt16LE(i * 2)
    let scaled = Math.round(s * gain)
    if (scaled > 32767) scaled = 32767
    else if (scaled < -32768) scaled = -32768
    out.writeInt16LE(scaled, i * 2)
  }
  return out
}

function guessContentType(ext: string): string {
  switch (ext) {
    case ".wav": return "audio/wav"
    case ".mp3": return "audio/mpeg"
    case ".ogg": return "audio/ogg"
    case ".jpeg":
    case ".jpg": return "image/jpeg"
    case ".png": return "image/png"
    case ".webp": return "image/webp"
    case ".json": return "application/json"
    case ".webm": return "video/webm"
    case ".mp4": return "video/mp4"
    default: return "application/octet-stream"
  }
}
