// Verifies that the Gemini adapter, when given a conversationHistory on connect,
// (a) folds the recent turns and any summary into systemInstruction.parts[0].text
// (b) does NOT set historyConfig on the setup message
// (c) does NOT send a post-setup clientContent message
//
// Background: gemini-3.1-flash-live-preview closes the upstream socket with
// 1007 ("invalid argument") on the post-setup clientContent + historyConfig
// path even when we match the documented contract. Baking the recent turns
// into the system prompt is the durable workaround.
//
// Run: yarn workspace relay-server tsx test/test-gemini-history-inject.ts

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
  process.env.OPENAI_API_KEY = ""

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
      { role: "user", text: "" },
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

  console.log("[3] Analyzing setup payload...")
  const setup = receivedSetups[0] as {
    historyConfig?: unknown
    systemInstruction?: { parts?: { text?: string }[] }
  }
  assert(receivedSetups.length === 1, "exactly one setup message received")
  assert(setup?.historyConfig === undefined, "setup does NOT include historyConfig (avoids 1007 path)")
  assert(receivedClientContent.length === 0, "no post-setup clientContent sent (avoids 1007 path)")

  const sysText = setup?.systemInstruction?.parts?.[0]?.text || ""
  assert(sysText.includes("Most recent turns (verbatim)"), "systemInstruction has recent-turns section header")
  assert(sysText.includes("User: Hi"), "systemInstruction includes user 'Hi'")
  assert(sysText.includes("Assistant: Hello! How can I help?"), "systemInstruction includes assistant greeting")
  assert(sysText.includes("User: What's the weather?"), "systemInstruction includes weather question")
  assert(sysText.includes("Assistant: Sunny."), "systemInstruction includes assistant 'Sunny.'")
  assert(!/^User:\s*$/m.test(sysText) && !/^Assistant:\s*$/m.test(sysText), "empty-text turn is filtered out")

  // Same-role consecutive turns are preserved verbatim (no coalescing needed
  // for plain-text rendering — every line is its own speaker line).
  console.log("[4] Consecutive same-role rendering...")
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
  const sys2 = (receivedSetups[0] as { systemInstruction?: { parts?: { text?: string }[] } })
    ?.systemInstruction?.parts?.[0]?.text || ""
  assert(sys2.includes("User: first") && sys2.includes("User: second"), "both consecutive user lines present")
  assert(sys2.indexOf("User: first") < sys2.indexOf("User: second"), "lines preserve order")
  assert(sys2.indexOf("User: second") < sys2.indexOf("Assistant: ok"), "trailing assistant after both user lines")
  assert(receivedClientContent.length === 0, "no clientContent for consecutive-role case either")

  console.log("[5] No-history test...")
  receivedSetups.length = 0
  receivedClientContent.length = 0
  const adapter3 = new GeminiAdapter()
  ;(adapter3 as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`
  const config3: SessionConfigEvent = { ...config, conversationHistory: undefined }
  await adapter3.connect(config3, () => { /* ignore */ })
  await new Promise((r) => setTimeout(r, 150))
  const sys3 = (receivedSetups[0] as { systemInstruction?: { parts?: { text?: string }[] } })
    ?.systemInstruction?.parts?.[0]?.text || ""
  assert(!sys3.includes("Most recent turns"), "no recent-turns section when history absent")
  assert(!sys3.includes("Earlier in this conversation"), "no summary section when history absent")
  assert(receivedClientContent.length === 0, "no clientContent when history absent")

  console.log("[6] All-empty history is a no-op preamble...")
  receivedSetups.length = 0
  receivedClientContent.length = 0
  const adapter4 = new GeminiAdapter()
  ;(adapter4 as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`
  const config4: SessionConfigEvent = {
    ...config,
    conversationHistory: [
      { role: "user", text: "" },
      { role: "assistant", text: "   " },
    ],
  }
  await adapter4.connect(config4, () => { /* ignore */ })
  await new Promise((r) => setTimeout(r, 150))
  const sys4 = (receivedSetups[0] as { systemInstruction?: { parts?: { text?: string }[] } })
    ?.systemInstruction?.parts?.[0]?.text || ""
  assert(!sys4.includes("Most recent turns"), "no recent-turns section when every entry is whitespace/empty")
  assert(receivedClientContent.length === 0, "still no clientContent when every entry filters out")

  adapter.disconnect()
  adapter2.disconnect()
  adapter3.disconnect()
  adapter4.disconnect()
  wss.close()

  console.log("")
  console.log(`Result: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error("Test crashed:", err)
  process.exit(1)
})
