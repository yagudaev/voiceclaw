// End-to-end Gemini integration test through the relay server
// Verifies the full wire protocol: setup → session.ready → audio → responses
// Run: npx tsx test/test-gemini-e2e.ts

import WebSocket from "ws"
import { readFileSync, existsSync } from "node:fs"

const RELAY_URL = process.env.RELAY_URL || "ws://localhost:8080/ws"
const TEST_AUDIO_PATH = "/tmp/hello.pcm" // 24kHz PCM16 mono, generated via: say -o file.aiff "..." && ffmpeg -i file.aiff -acodec pcm_s16le -ac 1 -ar 24000 -f s16le file.pcm

type RelayEvent = {
  type: string
  sessionId?: string
  message?: string
  code?: number
  text?: string
  role?: string
  data?: string
  name?: string
  callId?: string
}

let passed = 0
let failed = 0

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  PASS: ${name}`)
    passed++
  } else {
    console.log(`  FAIL: ${name}`)
    failed++
  }
}

function generateSilenceBase64(durationMs: number, sampleRate: number): string {
  const numSamples = Math.floor(sampleRate * durationMs / 1000)
  const buf = Buffer.alloc(numSamples * 2)
  return buf.toString("base64")
}

// Generate a 440Hz tone at 24kHz PCM16 — something with audio energy so Gemini's
// VAD wakes up. We're not expecting it to transcribe a tone, just to verify the
// full wire protocol doesn't error.
function generateToneBase64(durationMs: number, sampleRate: number, freq: number): string {
  const numSamples = Math.floor(sampleRate * durationMs / 1000)
  const buf = Buffer.alloc(numSamples * 2)
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(Math.sin(2 * Math.PI * freq * i / sampleRate) * 8000)
    buf.writeInt16LE(sample, i * 2)
  }
  return buf.toString("base64")
}

async function runTest() {
  console.log("Gemini E2E Test (through relay server)")
  console.log("======================================")

  const events: RelayEvent[] = []
  let sessionReady = false
  let hadError = false
  let errorMessage = ""

  const ws = new WebSocket(RELAY_URL)

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket open timeout")), 5000)
    ws.on("open", () => { clearTimeout(timer); resolve() })
    ws.on("error", (err) => { clearTimeout(timer); reject(err) })
  })

  console.log("\n[1] WebSocket connected to relay")

  ws.on("message", (raw) => {
    const event = JSON.parse(String(raw)) as RelayEvent
    events.push(event)

    if (event.type === "session.ready") {
      sessionReady = true
      console.log(`  → session.ready (${event.sessionId})`)
    } else if (event.type === "error") {
      hadError = true
      errorMessage = event.message ?? ""
      console.log(`  → ERROR: ${event.message} (code=${event.code})`)
    } else if (event.type === "audio.delta") {
      // don't log each audio chunk — just count
    } else if (event.type === "transcript.delta") {
      process.stdout.write(`  ~ ${event.role}: ${event.text}\n`)
    } else if (event.type === "transcript.done") {
      console.log(`  ✓ transcript.done (${event.role}): "${event.text}"`)
    } else if (event.type === "turn.started" || event.type === "turn.ended") {
      console.log(`  ● ${event.type}`)
    } else if (event.type === "tool.call") {
      console.log(`  → tool.call: ${event.name} (${event.callId})`)
    } else {
      console.log(`  → ${event.type}`)
    }
  })

  // Send session.config for Gemini
  console.log("\n[2] Sending session.config (provider=gemini)")
  ws.send(JSON.stringify({
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test-e2e-key",
    brainAgent: "none",
    openclawGatewayUrl: "http://localhost:18789",
    openclawAuthToken: "test-token",
    deviceContext: {
      timezone: "America/Los_Angeles",
      locale: "en-US",
      deviceModel: "E2E Test",
    },
  }))

  // Wait for session.ready
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (sessionReady || hadError) {
        clearInterval(interval)
        resolve()
      }
    }, 100)
    setTimeout(() => { clearInterval(interval); resolve() }, 8000)
  })

  assert(sessionReady, "session.ready received within 8s")
  assert(!hadError, `no error events during setup (got: "${errorMessage}")`)

  if (!sessionReady) {
    ws.close()
    console.log(`\nResults: ${passed} passed, ${failed} failed`)
    process.exit(1)
  }

  // Stream real speech audio to trigger VAD + transcription + response
  if (!existsSync(TEST_AUDIO_PATH)) {
    console.error(`\n[3] Test audio missing at ${TEST_AUDIO_PATH} — generate with:`)
    console.error(`    say -o /tmp/hello.aiff "Hello, can you hear me? Please say hi back."`)
    console.error(`    ffmpeg -y -i /tmp/hello.aiff -acodec pcm_s16le -ac 1 -ar 24000 -f s16le /tmp/hello.pcm`)
    ws.close()
    process.exit(1)
  }

  const audioBuf = readFileSync(TEST_AUDIO_PATH)
  const chunkSize = 24000 * 2 * 0.1 // 100ms at 24kHz PCM16
  const numChunks = Math.ceil(audioBuf.length / chunkSize)
  console.log(`\n[3] Streaming ${(audioBuf.length / 48000).toFixed(2)}s of speech audio (${numChunks} chunks)`)
  for (let i = 0; i < numChunks; i++) {
    const chunk = audioBuf.subarray(i * chunkSize, (i + 1) * chunkSize)
    ws.send(JSON.stringify({ type: "audio.append", data: chunk.toString("base64") }))
    await new Promise((r) => setTimeout(r, 80))
  }

  // Silence to trigger VAD end-of-turn
  console.log("[4] Sending 1s of silence to trigger end-of-turn")
  for (let i = 0; i < 10; i++) {
    const chunk = generateSilenceBase64(100, 24000)
    ws.send(JSON.stringify({ type: "audio.append", data: chunk }))
    await new Promise((r) => setTimeout(r, 50))
  }

  // Collect response events for up to 10s
  console.log("\n[5] Collecting response events (10s)...")
  await new Promise((r) => setTimeout(r, 10_000))

  // Analyze events
  console.log("\n[6] Event analysis")
  const audioDeltas = events.filter((e) => e.type === "audio.delta")
  const transcriptDeltas = events.filter((e) => e.type === "transcript.delta")
  const transcriptDones = events.filter((e) => e.type === "transcript.done")
  const turnStarted = events.filter((e) => e.type === "turn.started")
  const turnEnded = events.filter((e) => e.type === "turn.ended")
  const errors = events.filter((e) => e.type === "error")

  console.log(`  Received: ${events.length} total events`)
  console.log(`    audio.delta: ${audioDeltas.length}`)
  console.log(`    transcript.delta: ${transcriptDeltas.length}`)
  console.log(`    transcript.done: ${transcriptDones.length}`)
  console.log(`    turn.started: ${turnStarted.length}`)
  console.log(`    turn.ended: ${turnEnded.length}`)
  console.log(`    errors: ${errors.length}`)

  assert(errors.length === 0, "no error events during audio flow")
  assert(audioDeltas.length > 0, "assistant audio.delta received")
  assert(transcriptDones.length > 0, "at least one transcript.done received")

  // Verify role attribution is correct on any transcript.done events
  for (const t of transcriptDones) {
    const validRole = t.role === "user" || t.role === "assistant"
    assert(validRole, `transcript.done has valid role (${t.role})`)
  }

  const userDones = transcriptDones.filter((t) => t.role === "user")
  const assistantDones = transcriptDones.filter((t) => t.role === "assistant")
  assert(userDones.length > 0, "at least one user transcript.done (speech recognized)")
  assert(assistantDones.length > 0, "at least one assistant transcript.done (model responded)")

  // Verify turn.started fired (echo prevention)
  assert(turnStarted.length > 0, "turn.started fired when user spoke (echo prevention)")
  assert(turnEnded.length > 0, "turn.ended fired after response")

  // Verify event ordering: first user-role transcript.done should come before
  // first assistant-role transcript.done
  const firstUserDoneIdx = events.findIndex((e) => e.type === "transcript.done" && e.role === "user")
  const firstAssistantDoneIdx = events.findIndex((e) => e.type === "transcript.done" && e.role === "assistant")
  if (firstUserDoneIdx >= 0 && firstAssistantDoneIdx >= 0) {
    assert(firstUserDoneIdx < firstAssistantDoneIdx, "user transcript.done precedes assistant transcript.done")
  }

  ws.close()
  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

runTest().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
