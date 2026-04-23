// Adapter-level latency emission check. Drives the OpenAI and Gemini adapters
// through a synthetic turn event sequence and verifies they emit a
// latency.metrics event with the expected shape.
//
// We don't open real provider sockets — instead we monkey-patch sendUpstream
// to no-op and feed handleUpstreamEvent / handleServerContent directly.
//
// Run: npx tsx test/test-latency-metrics.ts

import { OpenAIAdapter } from "../src/adapters/openai.js"
import { GeminiAdapter } from "../src/adapters/gemini.js"
import type { RelayEvent, SessionConfigEvent } from "../src/types.js"

let passed = 0
let failed = 0

// Test 1: OpenAI — speech_stopped → response.audio.delta → response.done
async function testOpenAiServerEos() {
  const title = "OpenAI: server_eos endpoint metric"
  const adapter = new OpenAIAdapter()
  // Neuter upstream writes so we don't need a real socket.
  ;(adapter as unknown as { sendUpstream: () => boolean }).sendUpstream = () => true
  const events: RelayEvent[] = []
  const sendToClient = (e: RelayEvent) => { events.push(e) }
  ;(adapter as unknown as { sendToClient: typeof sendToClient }).sendToClient = sendToClient
  ;(adapter as unknown as { config: SessionConfigEvent }).config = fakeConfig("openai")

  // speech_started → stamps turnStart
  fireUpstream(adapter, { type: "input_audio_buffer.speech_started" })
  adapter.sendAudio("AAAA")
  await sleep(20)
  adapter.sendAudio("BBBB")
  // speech_stopped → stamps endpoint-start at ~T+20
  fireUpstream(adapter, { type: "input_audio_buffer.speech_stopped" })
  await sleep(50)
  // First audio delta → first model byte at ~T+70
  fireUpstream(adapter, { type: "response.audio.delta", delta: "AAAA" })
  await sleep(5)
  fireUpstream(adapter, { type: "response.audio.delta", delta: "BBBB" })
  // response.done → emits latency.metrics + turn.ended + usage.metrics
  fireUpstream(adapter, { type: "response.done", response: { status: "completed" } })

  const latency = events.find((e): e is Extract<RelayEvent, { type: "latency.metrics" }> =>
    e.type === "latency.metrics",
  )
  if (!latency) {
    fail(title, "no latency.metrics event emitted")
    return
  }
  expect(title + " / source", latency.endpointSource, "server_eos")
  expectNumber(title + " / endpointMs > 0", latency.endpointMs)
  expectNumber(title + " / providerFirstByteMs > 0", latency.providerFirstByteMs)
  expectNumber(title + " / firstAudioFromTurnStartMs > 0", latency.firstAudioFromTurnStartMs)
  pass(title)
}

// Test 2: OpenAI — interrupted turn emits no latency.metrics
async function testOpenAiInterruptedSkipped() {
  const title = "OpenAI: interrupted turn skips latency.metrics"
  const adapter = new OpenAIAdapter()
  ;(adapter as unknown as { sendUpstream: () => boolean }).sendUpstream = () => true
  const events: RelayEvent[] = []
  ;(adapter as unknown as { sendToClient: (e: RelayEvent) => void }).sendToClient = (e: RelayEvent) => events.push(e)
  ;(adapter as unknown as { config: SessionConfigEvent }).config = fakeConfig("openai")
  ;(adapter as unknown as { isResponseActive: boolean }).isResponseActive = true

  fireUpstream(adapter, { type: "input_audio_buffer.speech_started" })
  adapter.sendAudio("AAAA")
  fireUpstream(adapter, { type: "input_audio_buffer.speech_stopped" })
  fireUpstream(adapter, { type: "response.audio.delta", delta: "AAAA" })
  adapter.cancelResponse() // user bargedin
  fireUpstream(adapter, { type: "response.done", response: { status: "cancelled" } })

  const latency = events.find((e) => e.type === "latency.metrics")
  if (latency) {
    fail(title, "latency.metrics should not be emitted for interrupted turns")
    return
  }
  pass(title)
}

// Test 3: Gemini — inputTranscription → modelTurn inlineData → turnComplete
async function testGeminiTranscriptionProxy() {
  const title = "Gemini: transcription_proxy endpoint metric"
  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { sendUpstream: () => void }).sendUpstream = () => {}
  const events: RelayEvent[] = []
  ;(adapter as unknown as { sendToClient: (e: RelayEvent) => void }).sendToClient = (e: RelayEvent) => events.push(e)
  ;(adapter as unknown as { config: SessionConfigEvent }).config = fakeConfig("gemini")

  adapter.sendAudio(silentAudioBase64())
  await sleep(10)
  // First inputTranscription → synthesizes turn.started + stamps turnStart
  fireGemini(adapter, { inputTranscription: { text: "hello" } })
  // Audio keeps flowing while the user talks — sendAudio is called continuously
  // by the session. Record the "last" one after turn-start was stamped.
  adapter.sendAudio(silentAudioBase64())
  await sleep(20)
  // Last inputTranscription → our endpoint-start proxy
  fireGemini(adapter, { inputTranscription: { text: " there" } })
  await sleep(60)
  // First modelTurn audio → first model byte
  fireGemini(adapter, { modelTurn: { parts: [{ inlineData: { data: "AAAA" } }] } })
  // turnComplete → emit latency.metrics
  fireGemini(adapter, { turnComplete: true })

  const latency = events.find((e): e is Extract<RelayEvent, { type: "latency.metrics" }> =>
    e.type === "latency.metrics",
  )
  if (!latency) {
    fail(title, "no latency.metrics event emitted")
    return
  }
  expect(title + " / source", latency.endpointSource, "transcription_proxy")
  expectNumber(title + " / endpointMs > 0", latency.endpointMs)
  expectNumber(title + " / providerFirstByteMs > 0", latency.providerFirstByteMs)
  expectNumber(title + " / firstAudioFromTurnStartMs > 0", latency.firstAudioFromTurnStartMs)
  pass(title)
}

// Test 4: Gemini — interrupted turn emits no latency.metrics
async function testGeminiInterruptedSkipped() {
  const title = "Gemini: interrupted turn skips latency.metrics"
  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { sendUpstream: () => void }).sendUpstream = () => {}
  const events: RelayEvent[] = []
  ;(adapter as unknown as { sendToClient: (e: RelayEvent) => void }).sendToClient = (e: RelayEvent) => events.push(e)
  ;(adapter as unknown as { config: SessionConfigEvent }).config = fakeConfig("gemini")

  adapter.sendAudio(silentAudioBase64())
  fireGemini(adapter, { inputTranscription: { text: "hello" } })
  fireGemini(adapter, { modelTurn: { parts: [{ inlineData: { data: "AAAA" } }] } })
  fireGemini(adapter, { interrupted: true })
  fireGemini(adapter, { turnComplete: true })

  const latency = events.find((e) => e.type === "latency.metrics")
  if (latency) {
    fail(title, "latency.metrics should not be emitted for interrupted turns")
    return
  }
  pass(title)
}

async function main() {
  console.log("Adapter latency emission tests")
  console.log("==============================")
  await testOpenAiServerEos()
  await testOpenAiInterruptedSkipped()
  await testGeminiTranscriptionProxy()
  await testGeminiInterruptedSkipped()
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("TEST FAILED:", err instanceof Error ? err.message : err)
  process.exit(1)
})

// --- helpers ---

function pass(title: string) {
  console.log(`  PASS  ${title}`)
  passed++
}

function fail(title: string, detail: string) {
  console.log(`  FAIL  ${title} — ${detail}`)
  failed++
}

function expect<T>(what: string, actual: unknown, expected: T) {
  if (actual !== expected) fail(what, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

function expectNumber(what: string, v: unknown) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    fail(what, `expected non-negative number, got ${JSON.stringify(v)}`)
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fireUpstream(adapter: OpenAIAdapter, event: any) {
  // @ts-expect-error — private method access for unit test
  adapter.handleUpstreamEvent(event)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fireGemini(adapter: GeminiAdapter, serverContent: any) {
  // @ts-expect-error — private method access for unit test
  adapter.handleServerContent(serverContent)
}

function fakeConfig(provider: "openai" | "gemini"): SessionConfigEvent {
  return {
    type: "session.config",
    provider,
    voice: "default",
    brainAgent: "none",
    apiKey: "test",
  }
}

// 10 samples of silence at 24kHz PCM16 — just needs to be non-empty for sendAudio.
function silentAudioBase64(): string {
  return Buffer.alloc(10 * 2).toString("base64")
}
