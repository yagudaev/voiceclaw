// Unit-ish tests for pure MediaTimeline helpers.
//
// Run: npx tsx test/test-media-timeline-helpers.ts

import { nearestFrameIndex } from "../src/components/ThumbnailStrip.js"
import { mapPeakToTrackY } from "../src/components/WaveformView.js"
import { mediaUrlFromFilePath } from "../src/components/media-paths.js"

function run() {
  assertEqual(mapPeakToTrackY(0, 50, 20), 50, "zero peak stays on baseline")
  assertEqual(mapPeakToTrackY(0.5, 50, 20), 40, "normalized peak maps to half height")
  assertEqual(mapPeakToTrackY(32767, 50, 20), 30, "int16 peak maps to full height")

  const frames = [
    { frameFile: "video-a/0000.jpeg", timeMs: 0 },
    { frameFile: "video-b/0000.jpeg", timeMs: 900 },
    { frameFile: "video-c/0000.jpeg", timeMs: 2000 },
  ]
  assertEqual(nearestFrameIndex(frames, 100), 0, "nearest first frame")
  assertEqual(nearestFrameIndex(frames, 1200), 1, "nearest middle frame")
  assertEqual(nearestFrameIndex(frames, 1900), 2, "nearest last frame")
  assertEqual(nearestFrameIndex([], 500), -1, "empty frame list")
  assertEqual(
    mediaUrlFromFilePath("/tmp/media/session-a/session/user.wav"),
    "/api/media/session-a/session/user.wav",
    "session-level media keeps session subdir in URL",
  )
  assertEqual(
    mediaUrlFromFilePath("/tmp/media/session-a/user-turn-1.pcm"),
    "/api/media/session-a/user-turn-1.pcm",
    "per-turn media maps to session root",
  )

  console.log("  PASS  media timeline helpers map peaks and nearest thumbnails")
}

run()

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}
