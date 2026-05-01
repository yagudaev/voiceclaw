import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { MediaCapture } from "../../src/media/capture.js"

describe("MediaCapture — ax_text tracer field", () => {
  let root: string
  let capture: MediaCapture

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "voiceclaw-axtext-test-"))
    capture = new MediaCapture({ enabled: true, rootDir: root })
    capture.startSession("ax-session")
  })

  afterEach(async () => {
    await capture.endSession().catch(() => {})
  })

  it("persists ax_text on each video frame in timings.json", async () => {
    capture.startTurn("turn-ax")
    capture.onVideoFrame(jpegB64(), 0, "[Screen text — Code]\nButton: Run")
    capture.onVideoFrame(jpegB64(), 1000, "[Screen text — Code]\nButton: Stop")
    await capture.finalizeTurn()

    const timings = JSON.parse(
      readFileSync(join(root, "ax-session", "video-turn-ax", "timings.json"), "utf8"),
    )
    expect(timings.frames).toHaveLength(2)
    expect(timings.frames[0].ax_text).toBe("[Screen text — Code]\nButton: Run")
    expect(timings.frames[1].ax_text).toBe("[Screen text — Code]\nButton: Stop")
  })

  it("omits ax_text when not provided", async () => {
    capture.startTurn("turn-noax")
    capture.onVideoFrame(jpegB64(), 0)
    await capture.finalizeTurn()

    const timings = JSON.parse(
      readFileSync(join(root, "ax-session", "video-turn-noax", "timings.json"), "utf8"),
    )
    expect(timings.frames[0].ax_text).toBeUndefined()
  })

  it("truncates ax_text payloads exceeding 8KB", async () => {
    const huge = "x".repeat(20 * 1024)
    capture.startTurn("turn-huge")
    capture.onVideoFrame(jpegB64(), 0, huge)
    await capture.finalizeTurn()

    const timings = JSON.parse(
      readFileSync(join(root, "ax-session", "video-turn-huge", "timings.json"), "utf8"),
    )
    const stored: string = timings.frames[0].ax_text
    expect(Buffer.byteLength(stored, "utf8")).toBeLessThanOrEqual(8 * 1024 + 8)
    expect(stored.endsWith("…")).toBe(true)
  })
})

function jpegB64(): string {
  return Buffer.from([0xff, 0xd8]).toString("base64")
}
