// Verifies Gemini session resumption: adapter captures resumption handles,
// reconnects on goAway with the handle, and emits session.rotating/rotated.
// Uses a local mock WS server that impersonates just enough of Gemini to
// exercise the reconnect path in ~1 second. Run: npx tsx test/test-gemini-reconnect.ts

import { WebSocketServer, WebSocket as WsSocket } from "ws"
import { GeminiAdapter } from "../src/adapters/gemini.js"
import type { SessionConfigEvent } from "../src/types.js"

type RelayEvent = {
  type: string
  sessionId?: string
  message?: string
  code?: number
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

interface MockServerBehavior {
  // Setup messages received from the adapter, in order (one per WS connection)
  receivedSetups: Record<string, unknown>[]
  // What to do on each incoming connection, indexed by connection count
  onConnect: (ws: WsSocket, connectionIndex: number) => void
}

function startMockGemini(behavior: MockServerBehavior, port: number): Promise<WebSocketServer> {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({ port })
    let connectionIndex = 0

    wss.on("connection", (ws) => {
      const myIndex = connectionIndex++
      ws.on("message", (raw) => {
        const msg = JSON.parse(String(raw))
        if (msg.setup) {
          behavior.receivedSetups.push(msg.setup)
          // Always ack the setup immediately so the adapter's openUpstream resolves
          ws.send(JSON.stringify({ setupComplete: {} }))
          // Then let the per-connection behavior drive the rest
          behavior.onConnect(ws, myIndex)
        }
      })
    })

    wss.on("listening", () => resolve(wss))
  })
}

async function runReconnectTest() {
  console.log("Gemini Reconnect Test (mock upstream)")
  console.log("=====================================")

  process.env.GEMINI_API_KEY = "test-key"

  const MOCK_PORT = 19888
  const clientEvents: RelayEvent[] = []
  const receivedSetups: Record<string, unknown>[] = []

  const wss = await startMockGemini({
    receivedSetups,
    onConnect: (ws, index) => {
      if (index === 0) {
        // First connection: send a resumption handle, then a goAway to trigger reconnect.
        setTimeout(() => {
          ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "handle-abc-123", resumable: true },
          }))
        }, 50)
        setTimeout(() => {
          ws.send(JSON.stringify({ goAway: { timeLeft: "2s" } }))
        }, 100)
        // Close the upstream shortly after — adapter's reconnect should already be in flight
        setTimeout(() => ws.close(1011, "service unavailable"), 150)
      } else {
        // Reconnect succeeded — send a second, fresher handle
        setTimeout(() => {
          ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "handle-def-456", resumable: true },
          }))
        }, 50)
      }
    },
  }, MOCK_PORT)

  console.log(`[1] Mock Gemini server listening on :${MOCK_PORT}`)

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    openclawGatewayUrl: "http://localhost:18789",
    openclawAuthToken: "test-token",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  // Point the adapter at our mock server (private field, ok for tests)
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))
  console.log("[2] Initial connect succeeded")

  // Wait long enough for: handle update (50ms) + goAway (100ms) + reconnect (+setup) + second handle (50ms)
  await new Promise((r) => setTimeout(r, 2000))

  console.log("[3] Analyzing events...")
  console.log(`    Mock received ${receivedSetups.length} setup messages`)
  console.log(`    Client received events: ${clientEvents.map((e) => e.type).join(", ")}`)

  assert(receivedSetups.length === 2, "mock received 2 setups (initial + reconnect)")

  const firstSetup = receivedSetups[0] as { sessionResumption?: { handle?: string } }
  const secondSetup = receivedSetups[1] as { sessionResumption?: { handle?: string } }

  assert(firstSetup.sessionResumption !== undefined, "first setup opts into sessionResumption")
  assert(firstSetup.sessionResumption?.handle === undefined, "first setup has no handle (fresh connect)")

  assert(secondSetup.sessionResumption?.handle === "handle-abc-123", "reconnect setup includes stored handle")

  const rotating = clientEvents.filter((e) => e.type === "session.rotating")
  const rotated = clientEvents.filter((e) => e.type === "session.rotated")
  const errors = clientEvents.filter((e) => e.type === "error")

  assert(rotating.length === 1, "client received exactly one session.rotating")
  assert(rotated.length === 1, "client received exactly one session.rotated")
  assert(errors.length === 0, `no error events (got ${errors.length})`)

  // Handle should have been refreshed by the second update
  const currentHandle = (adapter as unknown as { resumptionHandle: string | null }).resumptionHandle
  assert(currentHandle === "handle-def-456", "adapter stored the fresher handle after reconnect")

  adapter.disconnect()
  wss.close()
}

async function runUnrecoverableCloseTest() {
  console.log("\nGemini Unrecoverable Close Test (no handle)")
  console.log("============================================")

  const MOCK_PORT = 19889
  const clientEvents: RelayEvent[] = []
  const receivedSetups: Record<string, unknown>[] = []

  const wss = await startMockGemini({
    receivedSetups,
    onConnect: (ws, index) => {
      if (index === 0) {
        // Close immediately with 1011 but NO handle update — adapter should surface error
        setTimeout(() => ws.close(1011, "nope"), 50)
      }
    },
  }, MOCK_PORT)

  console.log(`[1] Mock Gemini server listening on :${MOCK_PORT}`)

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    openclawGatewayUrl: "http://localhost:18789",
    openclawAuthToken: "test-token",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))

  await new Promise((r) => setTimeout(r, 500))

  const errors = clientEvents.filter((e) => e.type === "error")
  const rotated = clientEvents.filter((e) => e.type === "session.rotated")

  assert(errors.length === 1, "client received one error event (no handle → surface failure)")
  assert(rotated.length === 0, "no session.rotated fired without a handle")

  adapter.disconnect()
  wss.close()
}

async function main() {
  await runReconnectTest()
  await runUnrecoverableCloseTest()
  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
