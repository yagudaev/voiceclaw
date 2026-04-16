// Desktop app end-to-end test suite
// Tests: health check, settings persistence, echo loopback, Gemini voice pipeline
// Run: cd desktop && npx tsx test/e2e.ts
// Requires: relay server running on ws://localhost:8080/ws

import WebSocket from "ws"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))

const RELAY_URL = process.env.RELAY_URL || "ws://localhost:8080/ws"
const RELAY_HTTP = RELAY_URL.replace(/^ws/, "http").replace(/\/ws\/?$/, "")
const TEST_AUDIO_PATH = "/tmp/hello-test.pcm"
const DB_PATH = "/tmp/voiceclaw-e2e-test.db"

// Import better-sqlite3 using createRequire (same pattern as the app)
const require = createRequire(import.meta.url)
const Database = require("better-sqlite3")

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
let skipped = 0

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  \x1b[32mPASS\x1b[0m ${name}`)
    passed++
  } else {
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}`)
    failed++
  }
}

function skip(name: string, reason: string) {
  console.log(`  \x1b[33mSKIP\x1b[0m ${name} — ${reason}`)
  skipped++
}

function connectWs(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket open timeout")), 5000)
    const ws = new WebSocket(RELAY_URL)
    ws.on("open", () => { clearTimeout(timer); resolve(ws) })
    ws.on("error", (err) => { clearTimeout(timer); reject(err) })
  })
}

function collectEvents(ws: WebSocket): RelayEvent[] {
  const events: RelayEvent[] = []
  ws.on("message", (raw) => {
    events.push(JSON.parse(String(raw)))
  })
  return events
}

function waitForEvent(ws: WebSocket, type: string, timeoutMs = 10000): Promise<RelayEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeoutMs)
    const handler = (raw: WebSocket.RawData) => {
      const event = JSON.parse(String(raw)) as RelayEvent
      if (event.type === type) {
        clearTimeout(timer)
        ws.removeListener("message", handler)
        resolve(event)
      }
    }
    ws.on("message", handler)
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ─────────────────────────────────────────────────────────
// Test 1: Health Check
// ─────────────────────────────────────────────────────────
async function testHealthCheck() {
  console.log("\n━━━ Test 1: Health Check ━━━")
  try {
    const res = await fetch(`${RELAY_HTTP}/health`)
    assert(res.ok, "health endpoint returns 200")
    const body = await res.json()
    assert(body.status === "ok", "health body is { status: 'ok' }")
  } catch (err) {
    assert(false, `health endpoint reachable (${err})`)
  }
}

// ─────────────────────────────────────────────────────────
// Test 2: SQLite Settings Persistence
// ─────────────────────────────────────────────────────────
async function testSettingsPersistence() {
  console.log("\n━━━ Test 2: SQLite Settings Persistence ━━━")

  // Use the same schema as the app
  const db = new Database(DB_PATH)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      stt_latency_ms REAL,
      llm_latency_ms REAL,
      tts_latency_ms REAL,
      stt_provider TEXT,
      llm_provider TEXT,
      tts_provider TEXT
    );
  `)

  // Test settings CRUD
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?"
  )
  const get = db.prepare("SELECT value FROM settings WHERE key = ?")

  upsert.run("realtime_server_url", "ws://localhost:8080/ws", "ws://localhost:8080/ws")
  upsert.run("realtime_api_key", "test-key-123", "test-key-123")
  upsert.run("realtime_voice", "Zephyr", "Zephyr")
  upsert.run("realtime_model", "gemini-3.1-flash-live-preview", "gemini-3.1-flash-live-preview")
  upsert.run("realtime_volume", "1.5", "1.5")
  upsert.run("debug_mode", "true", "true")

  assert((get.get("realtime_server_url") as any)?.value === "ws://localhost:8080/ws", "server URL persists")
  assert((get.get("realtime_api_key") as any)?.value === "test-key-123", "API key persists")
  assert((get.get("realtime_voice") as any)?.value === "Zephyr", "voice persists")
  assert((get.get("realtime_model") as any)?.value === "gemini-3.1-flash-live-preview", "model persists")
  assert((get.get("realtime_volume") as any)?.value === "1.5", "volume persists")
  assert((get.get("debug_mode") as any)?.value === "true", "debug mode persists")

  // Test update
  upsert.run("realtime_voice", "Puck", "Puck")
  assert((get.get("realtime_voice") as any)?.value === "Puck", "voice updates correctly")

  // Test conversations
  const now = Date.now()
  const insertConv = db.prepare("INSERT INTO conversations (title, created_at, updated_at) VALUES (?, ?, ?)")
  const result = insertConv.run("Test Conversation", now, now)
  const convId = result.lastInsertRowid as number
  assert(convId > 0, "conversation created with valid ID")

  // Test messages
  const insertMsg = db.prepare(
    "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)"
  )
  insertMsg.run(convId, "user", "Hello there", now)
  insertMsg.run(convId, "assistant", "Hi! How can I help?", now + 1)

  const msgs = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(convId)
  assert(msgs.length === 2, "two messages saved")
  assert((msgs[0] as any).role === "user", "first message is user")
  assert((msgs[1] as any).role === "assistant", "second message is assistant")
  assert((msgs[0] as any).content === "Hello there", "user content correct")
  assert((msgs[1] as any).content === "Hi! How can I help?", "assistant content correct")

  // Cleanup
  db.close()
  try { execSync(`rm -f ${DB_PATH} ${DB_PATH}-wal ${DB_PATH}-shm`) } catch {}
}

// ─────────────────────────────────────────────────────────
// Test 3: Echo Adapter Loopback
// ─────────────────────────────────────────────────────────
async function testEchoLoopback() {
  console.log("\n━━━ Test 3: Echo Adapter Loopback ━━━")

  const ws = await connectWs()
  const events = collectEvents(ws)

  // Send session config for echo provider
  ws.send(JSON.stringify({
    type: "session.config",
    provider: "echo",
    voice: "test",
    brainAgent: "none",
    apiKey: "e2e-test",
  }))

  // Wait for session.ready
  try {
    const ready = await waitForEvent(ws, "session.ready", 5000)
    assert(!!ready.sessionId, "echo session.ready received with sessionId")
  } catch {
    assert(false, "echo session.ready within 5s")
    ws.close()
    return
  }

  // Send audio chunk
  const silenceChunk = Buffer.alloc(4800).toString("base64") // 100ms silence
  ws.send(JSON.stringify({ type: "audio.append", data: silenceChunk }))
  await sleep(500)

  // Echo adapter should send back audio.delta
  const audioDeltas = events.filter((e) => e.type === "audio.delta")
  assert(audioDeltas.length > 0, "echo returns audio.delta for sent audio")
  if (audioDeltas.length > 0) {
    assert(typeof audioDeltas[0].data === "string" && audioDeltas[0].data.length > 0, "audio.delta has base64 data")
  }

  const errors = events.filter((e) => e.type === "error")
  assert(errors.length === 0, "no errors during echo session")

  ws.close()
}

// ─────────────────────────────────────────────────────────
// Test 4: Gemini Live Full Voice Pipeline
// ─────────────────────────────────────────────────────────
async function testGeminiVoicePipeline() {
  console.log("\n━━━ Test 4: Gemini Live Full Voice Pipeline ━━━")

  // Generate test audio if missing
  if (!existsSync(TEST_AUDIO_PATH)) {
    console.log("  Generating TTS test audio...")
    try {
      execSync(`say -o /tmp/hello-test.aiff "Hello, can you hear me? What is two plus two?"`)
      execSync(`ffmpeg -y -i /tmp/hello-test.aiff -acodec pcm_s16le -ac 1 -ar 24000 -f s16le ${TEST_AUDIO_PATH} 2>/dev/null`)
    } catch {
      skip("Gemini voice pipeline", "could not generate TTS audio (need macOS say + ffmpeg)")
      return
    }
  }

  const ws = await connectWs()
  const events = collectEvents(ws)

  // Send session config for Gemini
  ws.send(JSON.stringify({
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "e2e-test",
    brainAgent: "none",
    deviceContext: {
      timezone: "America/Los_Angeles",
      locale: "en-US",
      deviceModel: "E2E Test (Desktop)",
    },
  }))

  // Wait for session.ready
  try {
    const ready = await waitForEvent(ws, "session.ready", 10000)
    assert(!!ready.sessionId, `Gemini session.ready (${ready.sessionId})`)
  } catch (err) {
    const errors = events.filter((e) => e.type === "error")
    if (errors.length > 0) {
      assert(false, `Gemini session.ready — got error: ${errors[0].message}`)
    } else {
      assert(false, `Gemini session.ready within 10s (${err})`)
    }
    ws.close()
    return
  }

  // Stream real speech audio
  const audioBuf = readFileSync(TEST_AUDIO_PATH)
  const chunkSize = 24000 * 2 * 0.1 // 100ms at 24kHz PCM16 = 4800 bytes
  const numChunks = Math.ceil(audioBuf.length / chunkSize)
  console.log(`  Streaming ${(audioBuf.length / 48000).toFixed(2)}s of TTS speech (${numChunks} chunks)...`)

  for (let i = 0; i < numChunks; i++) {
    const chunk = audioBuf.subarray(i * chunkSize, (i + 1) * chunkSize)
    ws.send(JSON.stringify({ type: "audio.append", data: chunk.toString("base64") }))
    await sleep(80) // ~real-time pacing
  }

  // Send silence to trigger VAD end-of-turn
  console.log("  Sending 1.5s silence (VAD end-of-turn)...")
  for (let i = 0; i < 15; i++) {
    ws.send(JSON.stringify({ type: "audio.append", data: Buffer.alloc(4800).toString("base64") }))
    await sleep(50)
  }

  // Collect response events (up to 15s)
  console.log("  Waiting for Gemini response (15s max)...")

  let gotAssistantTranscript = false
  let gotAudioDelta = false
  const deadline = Date.now() + 15000

  while (Date.now() < deadline && (!gotAssistantTranscript || !gotAudioDelta)) {
    await sleep(200)
    gotAssistantTranscript = events.some((e) => e.type === "transcript.done" && e.role === "assistant")
    gotAudioDelta = events.some((e) => e.type === "audio.delta")
  }

  // Analyze results
  const audioDeltas = events.filter((e) => e.type === "audio.delta")
  const transcriptDones = events.filter((e) => e.type === "transcript.done")
  const userTranscripts = transcriptDones.filter((e) => e.role === "user")
  const assistantTranscripts = transcriptDones.filter((e) => e.role === "assistant")
  const turnStarted = events.filter((e) => e.type === "turn.started")
  const turnEnded = events.filter((e) => e.type === "turn.ended")
  const errors = events.filter((e) => e.type === "error")

  console.log(`  Events: ${events.length} total | audio.delta: ${audioDeltas.length} | transcript.done: ${transcriptDones.length} | errors: ${errors.length}`)

  if (userTranscripts.length > 0) {
    console.log(`  User said: "${userTranscripts.map((t) => t.text).join(" ")}"`)
  }
  if (assistantTranscripts.length > 0) {
    console.log(`  Assistant said: "${assistantTranscripts.map((t) => t.text).join(" ")}"`)
  }

  assert(errors.length === 0, "no error events during Gemini session")
  assert(audioDeltas.length > 0, "received assistant audio.delta (Gemini responded with voice)")
  assert(transcriptDones.length > 0, "received transcript.done events")
  assert(userTranscripts.length > 0, "user speech recognized (transcript.done role=user)")
  assert(assistantTranscripts.length > 0, "assistant responded (transcript.done role=assistant)")
  assert(turnStarted.length > 0, "turn.started fired (barge-in signaling)")
  assert(turnEnded.length > 0, "turn.ended fired (response complete)")

  // Verify event ordering
  const firstUserIdx = events.findIndex((e) => e.type === "transcript.done" && e.role === "user")
  const firstAssistantIdx = events.findIndex((e) => e.type === "transcript.done" && e.role === "assistant")
  if (firstUserIdx >= 0 && firstAssistantIdx >= 0) {
    assert(firstUserIdx < firstAssistantIdx, "user transcript precedes assistant transcript")
  }

  ws.close()
}

// ─────────────────────────────────────────────────────────
// Test 5: Electron App Build Verification
// ─────────────────────────────────────────────────────────
async function testElectronBuild() {
  console.log("\n━━━ Test 5: Electron App Build Verification ━━━")

  try {
    const output = execSync("npx electron-vite build 2>&1", {
      cwd: join(__dirname, ".."),
      timeout: 30000,
    }).toString()

    assert(output.includes("built in"), "electron-vite build succeeds")
    assert(!output.includes("error"), "no errors in build output")

    // Verify output files exist
    const mainBundle = join(__dirname, "../out/main/index.js")
    const preloadBundle = join(__dirname, "../out/preload/index.js")
    const rendererHtml = join(__dirname, "../out/renderer/index.html")

    assert(existsSync(mainBundle), "main process bundle exists")
    assert(existsSync(preloadBundle), "preload bundle exists")
    assert(existsSync(rendererHtml), "renderer HTML exists")

    // Verify better-sqlite3 is NOT bundled (runtime require)
    const mainContent = readFileSync(mainBundle, "utf-8")
    assert(mainContent.includes('require("better-sqlite3")') || mainContent.includes("require$1(\"better-sqlite3\")"),
      "better-sqlite3 loaded via runtime require (not bundled)")
    assert(!mainContent.includes("requireBindings"), "no inlined bindings module")

    // Verify bundle is small (should be ~8KB without sqlite bundled)
    const mainSize = readFileSync(mainBundle).length
    assert(mainSize < 20000, `main bundle is small (${(mainSize / 1024).toFixed(1)}KB < 20KB)`)
  } catch (err) {
    assert(false, `electron-vite build (${err})`)
  }
}

// ─────────────────────────────────────────────────────────
// Test 6: Audio Encoding Round-Trip
// ─────────────────────────────────────────────────────────
async function testAudioEncoding() {
  console.log("\n━━━ Test 6: Audio Encoding Round-Trip ━━━")

  // Test PCM16 base64 encoding (same as audio-engine.ts)
  const sampleRate = 24000
  const durationMs = 100
  const numSamples = sampleRate * durationMs / 1000 // 2400

  // Generate a 440Hz tone
  const float32 = new Float32Array(numSamples)
  for (let i = 0; i < numSamples; i++) {
    float32[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
  }

  // Float32 -> PCM16 -> base64 (encode)
  const pcm16 = Buffer.alloc(numSamples * 2)
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]))
    pcm16.writeInt16LE(Math.round(clamped * 32767), i * 2)
  }
  const base64 = pcm16.toString("base64")

  assert(base64.length > 0, "PCM16 base64 encoding produces output")
  assert(pcm16.length === numSamples * 2, `PCM16 buffer size correct (${pcm16.length} = ${numSamples} * 2)`)

  // base64 -> PCM16 -> Float32 (decode)
  const decoded = Buffer.from(base64, "base64")
  assert(decoded.length === pcm16.length, "base64 round-trip preserves length")

  const decodedFloat32 = new Float32Array(numSamples)
  for (let i = 0; i < numSamples; i++) {
    decodedFloat32[i] = decoded.readInt16LE(i * 2) / 32768
  }

  // Verify samples are close (within quantization error)
  let maxError = 0
  for (let i = 0; i < numSamples; i++) {
    maxError = Math.max(maxError, Math.abs(float32[i] - decodedFloat32[i]))
  }
  assert(maxError < 0.001, `PCM16 round-trip max quantization error < 0.001 (got ${maxError.toFixed(6)})`)
}

// ─────────────────────────────────────────────────────────
// Run all tests
// ─────────────────────────────────────────────────────────
async function main() {
  console.log("VoiceClaw Desktop E2E Test Suite")
  console.log("================================")
  console.log(`Relay: ${RELAY_URL}`)
  console.log(`Time: ${new Date().toISOString()}\n`)

  await testHealthCheck()
  await testSettingsPersistence()
  await testAudioEncoding()
  await testEchoLoopback()
  await testElectronBuild()
  await testGeminiVoicePipeline()

  console.log("\n================================")
  console.log(`Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m, \x1b[33m${skipped} skipped\x1b[0m`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("Test suite failed:", err)
  process.exit(1)
})
