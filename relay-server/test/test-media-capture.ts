// Unit-ish test for the media capture pipeline. Writes a few chunks of fake
// PCM + JPEG through MediaCapture, asserts the flat files land on disk, and
// verifies finalizeTurn returns the expected `media.*` attrs.
//
// Run: npx tsx test/test-media-capture.ts

import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { MediaCapture } from "../src/media/capture.js"

async function run() {
  const root = mkdtempSync(join(tmpdir(), "voiceclaw-media-test-"))
  const capture = new MediaCapture({ enabled: true, rootDir: root })

  capture.startSession("unit-session")
  capture.startTurn("turn-001")

  // 50 chunks of 160 PCM samples (2 bytes each) = 16000 bytes ≈ 333ms @ 24kHz
  const chunk = Buffer.alloc(320)
  for (let i = 0; i < 50; i++) {
    capture.onUserAudioChunk(chunk.toString("base64"))
    capture.onAssistantAudioChunk(chunk.toString("base64"))
  }

  // Two video frames (1-byte payload is fine for this test — JPEG validation
  // isn't part of the capture contract; the relay writes raw JPEG bytes as-is).
  capture.onVideoFrame(Buffer.from([0xff, 0xd8]).toString("base64"), 0)
  capture.onVideoFrame(Buffer.from([0xff, 0xd8]).toString("base64"), 250)

  const attrs = await capture.finalizeTurn()

  const expectedUserPath = join(root, "unit-session", "user-turn-001.pcm")
  const expectedAssistantPath = join(root, "unit-session", "assistant-turn-001.pcm")
  const expectedVideoDir = join(root, "unit-session", "video-turn-001")

  if (attrs["media.user_audio.path"] !== expectedUserPath) {
    throw new Error(`user path mismatch: ${attrs["media.user_audio.path"]}`)
  }
  if (attrs["media.assistant_audio.path"] !== expectedAssistantPath) {
    throw new Error(`assistant path mismatch: ${attrs["media.assistant_audio.path"]}`)
  }
  if (attrs["media.user_audio.codec"] !== "pcm_s16le") {
    throw new Error(`expected pcm_s16le codec, got ${attrs["media.user_audio.codec"]}`)
  }
  if (attrs["media.user_audio.provider"] !== "local") {
    throw new Error(`expected provider=local, got ${attrs["media.user_audio.provider"]}`)
  }
  if (!existsSync(expectedUserPath)) throw new Error("user pcm file missing")
  if (!existsSync(expectedUserPath + ".json")) throw new Error("user sidecar missing")
  if (!existsSync(expectedAssistantPath)) throw new Error("assistant pcm file missing")

  // Verify the user PCM got 50 * 320 bytes.
  const userBytes = readFileSync(expectedUserPath).byteLength
  if (userBytes !== 50 * 320) {
    throw new Error(`expected 16000 bytes in user.pcm, got ${userBytes}`)
  }

  // Timing JSON for video frames.
  const timings = JSON.parse(readFileSync(join(expectedVideoDir, "timings.json"), "utf8"))
  if (timings.frames.length !== 2) {
    throw new Error(`expected 2 frames, got ${timings.frames.length}`)
  }
  if (timings.frames[0].offset_ms !== 0 || timings.frames[1].offset_ms !== 250) {
    throw new Error(`frame timings wrong: ${JSON.stringify(timings.frames)}`)
  }

  console.log("  PASS  media capture writes expected files + attrs")
  console.log(`        root=${root}`)

  // Second turn through the same session — must not clobber turn-001 files.
  capture.startTurn("turn-002")
  capture.onUserAudioChunk(chunk.toString("base64"))
  const attrs2 = await capture.finalizeTurn()
  if (attrs2["media.user_audio.path"] === expectedUserPath) {
    throw new Error("turn-002 reused turn-001's path")
  }
  if (!existsSync(expectedUserPath)) {
    throw new Error("turn-001 user.pcm deleted by turn-002")
  }

  console.log("  PASS  second turn writes to distinct files")

  capture.endSession()

  // Disabled mode should be a no-op.
  const noop = new MediaCapture({ enabled: false, rootDir: root })
  noop.startSession("unit-session")
  noop.startTurn("turn-x")
  noop.onUserAudioChunk(chunk.toString("base64"))
  const noopAttrs = await noop.finalizeTurn()
  if (Object.keys(noopAttrs).length > 0) {
    throw new Error(`disabled capture returned attrs: ${JSON.stringify(noopAttrs)}`)
  }
  console.log("  PASS  disabled capture is a no-op")
}

run().catch((err) => {
  console.error("\nTEST FAILED:", err instanceof Error ? err.message : err)
  process.exit(1)
})
