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
import { join, resolve, extname } from "node:path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MEDIA_ROOT = process.env.VOICECLAW_MEDIA_DIR
  ?? join(homedir(), ".voiceclaw", "media")

// PCM sidecar sample rate keys we accept, in order of preference.
const SAMPLE_RATE_KEYS = ["sampleRate", "sample_rate_hz", "sample_rate"]

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
    const wav = pcmToWav(bytes, sampleRate, 1)
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
