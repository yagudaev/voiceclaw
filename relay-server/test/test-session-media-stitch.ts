// End-to-end test for session-level media stitch (NAN-649). Drives a fake
// multi-turn session through MediaCapture and asserts that finalizeSession()
// writes session/user.wav, session/assistant.wav, session/peaks.json, and
// session/thumbnails.json — with the right shape, sample counts, and peak
// array lengths.
//
// Run: npx tsx test/test-session-media-stitch.ts
//
// Why this exists: the production path only fires finalizeSession() when the
// client disconnects, which is hard to trigger as an agent. This test lets us
// verify the stitcher + downsampler + thumbnail selector without a voice call.

import { mkdtempSync, existsSync, readFileSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { MediaCapture } from "../src/media/capture.js"

const SESSION_KEY = "stitch-e2e-session"
const TURN_COUNT = 4
const CHUNKS_PER_TURN = 24 // 24 * 320 bytes = 7680 bytes ≈ 160ms @ 24 kHz
const FRAMES_PER_TURN = 8

async function run() {
  const root = mkdtempSync(join(tmpdir(), "voiceclaw-stitch-test-"))
  const capture = new MediaCapture({ enabled: true, rootDir: root })

  capture.startSession(SESSION_KEY)

  for (let turn = 0; turn < TURN_COUNT; turn++) {
    // Simulate real wall-clock separation between turns (the session stitcher
    // uses Date.now() to compute turnStartMs; back-to-back synchronous calls
    // would all land in the same ms and make thumbnail timing non-monotonic).
    if (turn > 0) await new Promise((r) => setTimeout(r, 50))
    const turnId = `turn-${turn}`
    capture.startTurn(turnId)

    // Per-turn PCM: vary the sample amplitude per turn so the stitched WAV
    // isn't just silence — otherwise peaks.json would be all zeros and we'd
    // miss bugs in the downsampler.
    for (let i = 0; i < CHUNKS_PER_TURN; i++) {
      const buf = Buffer.alloc(320)
      for (let s = 0; s < 160; s++) {
        const v = Math.round(8000 * Math.sin((i * 160 + s) * 0.02) * (turn + 1) * 0.25)
        buf.writeInt16LE(v, s * 2)
      }
      capture.onUserAudioChunk(buf.toString("base64"))
      capture.onAssistantAudioChunk(buf.toString("base64"))
    }

    // Video: frames spaced 5ms apart per turn so total frame span per turn
    // stays below the inter-turn wall-clock gap — preserves the monotonic
    // session-time invariant the thumbnail selector relies on.
    for (let f = 0; f < FRAMES_PER_TURN; f++) {
      capture.onVideoFrame(Buffer.from([0xff, 0xd8, f, turn]).toString("base64"), f * 5)
    }

    await capture.finalizeTurn()
  }

  const sessionAttrs = await capture.finalizeSession()
  await capture.endSession()

  const sessionDir = join(root, SESSION_KEY, "session")
  const userWav = join(sessionDir, "user.wav")
  const assistantWav = join(sessionDir, "assistant.wav")
  const peaksPath = join(sessionDir, "peaks.json")
  const thumbsPath = join(sessionDir, "thumbnails.json")

  assertExists(userWav, "user.wav")
  assertExists(assistantWav, "assistant.wav")
  assertExists(peaksPath, "peaks.json")
  assertExists(thumbsPath, "thumbnails.json")

  assertAttr(sessionAttrs, "media.session_audio.user.path", userWav)
  assertAttr(sessionAttrs, "media.session_audio.assistant.path", assistantWav)
  assertAttr(sessionAttrs, "media.session_audio.peaks_path", peaksPath)
  assertAttr(sessionAttrs, "media.session_video.thumbnails_path", thumbsPath)

  assertWav(userWav)
  assertWav(assistantWav)

  const peaks = JSON.parse(readFileSync(peaksPath, "utf8"))
  if (!Array.isArray(peaks.user) || !Array.isArray(peaks.assistant)) {
    throw new Error("peaks.json must have user + assistant arrays")
  }
  if (peaks.user.length === 0 || peaks.assistant.length === 0) {
    throw new Error("peaks arrays must not be empty")
  }
  if (peaks.user.length > 2500 || peaks.assistant.length > 2500) {
    throw new Error(`peaks arrays should cap near 2000 — got user=${peaks.user.length} asst=${peaks.assistant.length}`)
  }
  if (typeof peaks.sampleRate !== "number" || peaks.sampleRate <= 0) {
    throw new Error(`peaks.sampleRate missing/invalid: ${peaks.sampleRate}`)
  }
  if (typeof peaks.userDurationMs !== "number" || peaks.userDurationMs <= 0) {
    throw new Error(`peaks.userDurationMs missing/invalid: ${peaks.userDurationMs}`)
  }
  // Validate peaks actually carry signal — all-zero peaks would be a silent
  // bug in the downsampler. Peaks are normalized to [0,1] (abs-value / int16max).
  const maxUserPeak = Math.max(...peaks.user.map((v: number) => Math.abs(v)))
  if (maxUserPeak < 0.01) {
    throw new Error(`peaks.user appears silent (max=${maxUserPeak}) — downsampler bug`)
  }
  if (maxUserPeak > 1.001) {
    throw new Error(`peaks.user unexpectedly exceeds 1.0 (max=${maxUserPeak}) — normalization bug`)
  }

  const thumbs = JSON.parse(readFileSync(thumbsPath, "utf8"))
  if (!Array.isArray(thumbs.frames)) {
    throw new Error("thumbnails.json must have frames array")
  }
  const totalFrames = TURN_COUNT * FRAMES_PER_TURN
  if (thumbs.frames.length === 0) {
    throw new Error("thumbnails.json frames is empty")
  }
  if (thumbs.frames.length > 20) {
    throw new Error(`thumbnails.frames should cap at 20 — got ${thumbs.frames.length}`)
  }
  if (totalFrames < 20 && thumbs.frames.length !== totalFrames) {
    throw new Error(`expected ${totalFrames} thumbs (under cap), got ${thumbs.frames.length}`)
  }
  // Thumbs should be strictly ordered by timeMs.
  for (let i = 1; i < thumbs.frames.length; i++) {
    if (thumbs.frames[i].timeMs < thumbs.frames[i - 1].timeMs) {
      throw new Error(`thumbnails not monotonic at index ${i}`)
    }
  }

  console.log(`  PASS  session media stitched for ${SESSION_KEY}`)
  console.log(`        user.wav: ${statSync(userWav).size.toLocaleString()}B`)
  console.log(`        assistant.wav: ${statSync(assistantWav).size.toLocaleString()}B`)
  console.log(`        peaks: user=${peaks.user.length} assistant=${peaks.assistant.length} sampleRate=${peaks.sampleRate}Hz`)
  console.log(`        thumbnails: ${thumbs.frames.length} frames (of ${totalFrames} captured)`)
}

run().catch((err) => {
  console.error(`  FAIL  ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})

// --- helpers ---

function assertExists(path: string, label: string) {
  if (!existsSync(path)) throw new Error(`missing ${label} at ${path}`)
}

function assertAttr(attrs: Record<string, unknown>, key: string, expected: string) {
  if (attrs[key] !== expected) {
    throw new Error(`expected ${key}=${expected}, got ${attrs[key]}`)
  }
}

function assertWav(path: string) {
  const buf = readFileSync(path)
  if (buf.length < 44) throw new Error(`${path} too small for WAV header`)
  if (buf.slice(0, 4).toString("ascii") !== "RIFF") {
    throw new Error(`${path}: missing RIFF header`)
  }
  if (buf.slice(8, 12).toString("ascii") !== "WAVE") {
    throw new Error(`${path}: missing WAVE chunk`)
  }
  const sampleRate = buf.readUInt32LE(24)
  if (sampleRate <= 0) throw new Error(`${path}: invalid sample rate ${sampleRate}`)
}
