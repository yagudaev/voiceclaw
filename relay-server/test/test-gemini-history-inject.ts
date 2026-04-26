// Verifies that the Gemini adapter, when given a conversationHistory on connect,
// (a) sets historyConfig.initialHistoryInClientContent on the setup message and
// (b) sends a clientContent { turns, turnComplete: true } message after
// setupComplete with alternating user/model roles and non-empty parts.
// turnComplete is true because this is the terminating message of the initial
// history seed; the next user audio drives the first model turn. Uses a
// local mock WS server. Run: npx tsx test/test-gemini-history-inject.ts

import { WebSocketServer, WebSocket as WsSocket } from "ws"
import { GeminiAdapter } from "../src/adapters/gemini.js"
import type { SessionConfigEvent } from "../src/types.js"

type RelayEvent = { type: string }

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

async function main() {
  console.log("Gemini History Injection Test (mock upstream)")
  console.log("=============================================")

  process.env.GEMINI_API_KEY = "test-key"
  process.env.OPENAI_API_KEY = "" // force fallback path on summarizer if it runs

  const MOCK_PORT = 19899
  const receivedSetups: Record<string, unknown>[] = []
  const receivedClientContent: Record<string, unknown>[] = []

  const wss = new WebSocketServer({ port: MOCK_PORT })
  wss.on("connection", (ws: WsSocket) => {
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (msg.setup) {
        receivedSetups.push(msg.setup)
        ws.send(JSON.stringify({ setupComplete: {} }))
      } else if (msg.clientContent) {
        receivedClientContent.push(msg.clientContent)
      }
    })
  })
  await new Promise<void>((r) => wss.on("listening", () => r()))
  console.log(`[1] Mock Gemini server listening on :${MOCK_PORT}`)

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
    conversationHistory: [
      { role: "user", text: "Hi" },
      { role: "assistant", text: "Hello! How can I help?" },
      { role: "user", text: "" }, // should be filtered
      { role: "user", text: "What's the weather?" },
      { role: "assistant", text: "Sunny." },
    ],
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  const events: RelayEvent[] = []
  await adapter.connect(config, (e) => events.push(e as RelayEvent))
  console.log("[2] Initial connect succeeded")

  await new Promise((r) => setTimeout(r, 200))

  console.log("[3] Analyzing setup + clientContent...")
  const setup = receivedSetups[0] as { historyConfig?: { initialHistoryInClientContent?: boolean } }
  assert(receivedSetups.length === 1, "exactly one setup message received")
  assert(
    setup?.historyConfig?.initialHistoryInClientContent === true,
    "setup includes historyConfig.initialHistoryInClientContent=true",
  )

  assert(receivedClientContent.length === 1, "exactly one clientContent message received")
  const cc = receivedClientContent[0] as {
    turns?: { role: string, parts: { text: string }[] }[]
    turnComplete?: boolean
  }
  assert(cc?.turnComplete === true, "clientContent.turnComplete is true (terminating message of initial history seed)")

  const turns = cc?.turns || []
  // Empty user turn was filtered. Two consecutive user turns ("Hi", "What's the weather?")
  // separated by an assistant in the original input remain alternating after filter:
  //   user "Hi" → model "Hello! How can I help?" → user "What's the weather?" → model "Sunny."
  assert(turns.length === 4, `expected 4 turns after empty filter (got ${turns.length})`)
  assert(turns.every((t) => t.role === "user" || t.role === "model"), "all roles are user|model")
  assert(turns.every((t) => Array.isArray(t.parts) && t.parts.length > 0 && t.parts.every((p) => typeof p.text === "string" && p.text.length > 0)), "all turns have non-empty parts[].text")

  // Verify alternation
  let alternates = true
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].role === turns[i - 1].role) alternates = false
  }
  assert(alternates, "roles strictly alternate user/model")

  // Verify the assistant→model role mapping
  assert(turns[0].role === "user" && turns[0].parts[0].text === "Hi", "turn[0] is user 'Hi'")
  assert(turns[1].role === "model" && turns[1].parts[0].text.startsWith("Hello!"), "turn[1] is model")
  assert(turns[2].role === "user" && turns[2].parts[0].text.includes("weather"), "turn[2] is user 'weather'")
  assert(turns[3].role === "model" && turns[3].parts[0].text === "Sunny.", "turn[3] is model 'Sunny.'")

  // Coalescing: if input has consecutive same-role messages, they merge into one turn.
  console.log("[4] Coalescing test (consecutive same-role)...")
  receivedSetups.length = 0
  receivedClientContent.length = 0
  const adapter2 = new GeminiAdapter()
  ;(adapter2 as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`
  const config2: SessionConfigEvent = {
    ...config,
    conversationHistory: [
      { role: "user", text: "first" },
      { role: "user", text: "second" },
      { role: "assistant", text: "ok" },
    ],
  }
  await adapter2.connect(config2, () => { /* ignore */ })
  await new Promise((r) => setTimeout(r, 200))
  const cc2 = receivedClientContent[0] as { turns: { role: string, parts: { text: string }[] }[] }
  assert(cc2.turns.length === 2, `coalesced consecutive user turns: expected 2 turns, got ${cc2.turns.length}`)
  assert(cc2.turns[0].role === "user" && cc2.turns[0].parts.length === 2, "coalesced user turn has 2 parts")
  assert(cc2.turns[1].role === "model", "trailing model turn preserved")

  // No history → no historyConfig, no clientContent.
  console.log("[5] No-history test...")
  receivedSetups.length = 0
  receivedClientContent.length = 0
  const adapter3 = new GeminiAdapter()
  ;(adapter3 as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`
  const config3: SessionConfigEvent = { ...config, conversationHistory: undefined }
  await adapter3.connect(config3, () => { /* ignore */ })
  await new Promise((r) => setTimeout(r, 150))
  const setup3 = receivedSetups[0] as { historyConfig?: unknown }
  assert(setup3?.historyConfig === undefined, "no historyConfig when no history")
  assert(receivedClientContent.length === 0, "no clientContent sent when no history")

  adapter.disconnect()
  adapter2.disconnect()
  adapter3.disconnect()
  wss.close()

  console.log("")
  console.log(`Result: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error("Test crashed:", err)
  process.exit(1)
})
