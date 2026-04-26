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

async function runReconnectRetryTest() {
  console.log("\nGemini Reconnect Retry Test (first attempt fails, second succeeds)")
  console.log("===================================================================")

  const MOCK_PORT = 19890
  const clientEvents: RelayEvent[] = []
  const receivedSetups: Record<string, unknown>[] = []

  // Three WS connections expected: initial, failed-reconnect #1, successful-reconnect #2
  const wss = new WebSocketServer({ port: MOCK_PORT })
  let connectionIndex = 0
  const firstSocketRef: { ws: WsSocket | null } = { ws: null }

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    if (myIndex === 0) firstSocketRef.ws = ws

    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (!msg.setup) return
      receivedSetups.push(msg.setup)

      if (myIndex === 0) {
        // Initial: ack setup, send a resumption handle, then close with goAway to trigger reconnect.
        ws.send(JSON.stringify({ setupComplete: {} }))
        setTimeout(() => {
          ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "retry-handle", resumable: true },
          }))
        }, 30)
        setTimeout(() => {
          ws.send(JSON.stringify({ goAway: { timeLeft: "2s" } }))
        }, 60)
        setTimeout(() => ws.close(1011, "rotating"), 100)
      } else if (myIndex === 1) {
        // First reconnect attempt: close the socket before sending setupComplete (simulates setup-time failure)
        ws.close(1011, "transient")
      } else {
        // Second reconnect attempt: succeed normally
        ws.send(JSON.stringify({ setupComplete: {} }))
      }
    })
  })

  await new Promise((r) => wss.on("listening", () => r(null)))
  console.log(`[1] Mock Gemini server listening on :${MOCK_PORT}`)

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))

  // Wait for: handle (30ms) + goAway (60ms) + first-reconnect fail + backoff (500ms) + second-reconnect success
  await new Promise((r) => setTimeout(r, 2500))

  console.log(`    Mock received ${receivedSetups.length} setup messages`)
  console.log(`    Client events: ${clientEvents.map((e) => e.type).join(", ")}`)

  assert(receivedSetups.length === 3, "mock received 3 setups (initial + fail + success)")

  const rotating = clientEvents.filter((e) => e.type === "session.rotating")
  const rotated = clientEvents.filter((e) => e.type === "session.rotated")
  const errors = clientEvents.filter((e) => e.type === "error")

  assert(rotating.length === 1, `exactly one session.rotating (got ${rotating.length})`)
  assert(rotated.length === 1, `exactly one session.rotated after retry succeeds (got ${rotated.length})`)
  assert(errors.length === 0, `no error events fired during retry (got ${errors.length})`)

  adapter.disconnect()
  wss.close()
}

async function runWatchdogGatedTest() {
  console.log("\nGemini Watchdog Gated Test (pendingToolCalls > 0 suppresses timer)")
  console.log("===================================================================")

  const adapter = new GeminiAdapter()
  type AdapterInternals = {
    pendingToolCalls: number
    watchdogTimer: ReturnType<typeof setTimeout> | null
    watchdogEnabled: boolean
    resetWatchdog: () => void
  }
  const internals = adapter as unknown as AdapterInternals

  // Enable watchdog so the gating logic is testable
  internals.watchdogEnabled = true
  internals.pendingToolCalls = 0
  internals.resetWatchdog()
  assert(internals.watchdogTimer !== null, "watchdog armed when no pending tool calls")

  internals.pendingToolCalls = 1
  internals.resetWatchdog()
  assert(internals.watchdogTimer === null, "watchdog suppressed during pending tool call")

  internals.pendingToolCalls = 0
  internals.resetWatchdog()
  assert(internals.watchdogTimer !== null, "watchdog re-arms after tool calls drain")

  adapter.disconnect()
}

async function runForceFreshReconnectTest() {
  console.log("\nGemini Force-Fresh Reconnect Test (null handle path does not crash)")
  console.log("==================================================================")

  const MOCK_PORT = 19895
  const clientEvents: RelayEvent[] = []
  const receivedSetups: Record<string, unknown>[] = []

  const wss = await startMockGemini({
    receivedSetups,
    onConnect: (_ws, _index) => {
      // setupComplete is enough for this regression test
    },
  }, MOCK_PORT)

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  type AdapterInternals = {
    wsUrlOverride: string
    resumptionHandle: string | null
    reconnect: (reason: string, forceFresh?: boolean) => Promise<void>
  }
  const internals = adapter as unknown as AdapterInternals
  internals.wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))

  // Simulate the poisoned-handle watchdog path: handle has already been cleared,
  // but reconnect(forceFresh=true) should still start a fresh session instead of
  // crashing on a null-handle log path.
  internals.resumptionHandle = null
  await internals.reconnect("poisoned handle — fresh session", true)
  await new Promise((r) => setTimeout(r, 200))

  assert(receivedSetups.length === 2, `mock received 2 setups (initial + fresh reconnect), got ${receivedSetups.length}`)

  const secondSetup = receivedSetups[1] as { sessionResumption?: { handle?: string } } | undefined
  assert(secondSetup?.sessionResumption !== undefined, "fresh reconnect still opts into sessionResumption")
  assert(secondSetup?.sessionResumption?.handle === undefined, "fresh reconnect sends no handle after poisoned recovery")

  const rotated = clientEvents.filter((e) => e.type === "session.rotated")
  const errors = clientEvents.filter((e) => e.type === "error")
  assert(rotated.length === 1, `fresh reconnect completed (rotated count=${rotated.length})`)
  assert(errors.length === 0, `no error emitted during force-fresh reconnect (got ${errors.length})`)

  adapter.disconnect()
  wss.close()
}

async function runDeferredRotationMidToolCallTest() {
  console.log("\nGemini Deferred Rotation Test (goAway during tool call)")
  console.log("========================================================")

  const MOCK_PORT = 19891
  const clientEvents: RelayEvent[] = []
  const receivedSetups: Record<string, unknown>[] = []
  const socketOneMessages: Record<string, unknown>[] = []
  const socketTwoMessages: Record<string, unknown>[] = []

  const wss = new WebSocketServer({ port: MOCK_PORT })
  let connectionIndex = 0
  let socketOne: WsSocket | null = null

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    if (myIndex === 0) socketOne = ws

    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (msg.setup) {
        receivedSetups.push(msg.setup)
        ws.send(JSON.stringify({ setupComplete: {} }))

        if (myIndex === 0) {
          // 1. fresh resumable handle
          setTimeout(() => ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "pre-tool-handle", resumable: true },
          })), 20)
          // 2. issue a tool call (adapter → pendingToolCalls=1)
          setTimeout(() => ws.send(JSON.stringify({
            toolCall: { functionCalls: [{ id: "call-1", name: "ask_brain", args: { question: "hi" } }] },
          })), 40)
          // 3. non-resumable update (Gemini stops issuing resumable handles during a call)
          setTimeout(() => ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "mid-tool", resumable: false },
          })), 60)
          // 4. goAway while call is still pending — adapter should DEFER
          setTimeout(() => ws.send(JSON.stringify({
            goAway: { timeLeft: "5s" },
          })), 80)
        }
      } else {
        // record non-setup messages per socket (e.g. toolResponse)
        if (myIndex === 0) socketOneMessages.push(msg)
        else socketTwoMessages.push(msg)

        // When socket 1 receives the toolResponse, emit a fresh resumable
        // handle post-tool — this is the signal adapter waits for.
        if (myIndex === 0 && msg.toolResponse) {
          setTimeout(() => ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "post-tool-handle", resumable: true },
          })), 20)
        }
      }
    })
  })

  await new Promise((r) => wss.on("listening", () => r(null)))

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => {
    clientEvents.push(event as RelayEvent)
    // Simulate the relay delivering the tool result 150ms later
    if ((event as { type: string }).type === "tool.call") {
      setTimeout(() => {
        adapter.sendToolResult("call-1", JSON.stringify({ answer: "42" }))
      }, 150)
    }
  })

  // Wait for full flow: handle (20) + toolCall (40) + non-resumable (60) + goAway (80)
  // + sendToolResult (150ms after tool.call → ~190ms) + post-tool handle (+20) → reconnect
  await new Promise((r) => setTimeout(r, 2500))

  console.log(`    Mock received ${receivedSetups.length} setups`)
  console.log(`    Socket 1 messages: ${socketOneMessages.map((m) => Object.keys(m)[0]).join(", ")}`)
  console.log(`    Client events: ${clientEvents.map((e) => e.type).join(", ")}`)

  const toolResponsesOnSocket1 = socketOneMessages.filter((m) => "toolResponse" in m)
  const toolResponsesOnSocket2 = socketTwoMessages.filter((m) => "toolResponse" in m)

  assert(toolResponsesOnSocket1.length === 1, `toolResponse went to original socket (got ${toolResponsesOnSocket1.length})`)
  assert(toolResponsesOnSocket2.length === 0, `no toolResponse sent on resumed socket (got ${toolResponsesOnSocket2.length})`)

  const rotated = clientEvents.filter((e) => e.type === "session.rotated")
  assert(rotated.length === 1, `rotation happened after tool completed (rotated count=${rotated.length})`)

  const errors = clientEvents.filter((e) => e.type === "error")
  assert(errors.length === 0, `no error emitted (got ${errors.length})`)

  const secondSetup = receivedSetups[1] as { sessionResumption?: { handle?: string } } | undefined
  assert(
    secondSetup?.sessionResumption?.handle === "post-tool-handle",
    `reconnect used POST-tool handle, not stale pre-tool handle (got ${secondSetup?.sessionResumption?.handle})`,
  )

  adapter.disconnect()
  wss.close()
  void socketOne
}

async function runHardCloseMidToolCallTest() {
  console.log("\nGemini Hard Close Mid-Tool-Call Test (no safe rotation)")
  console.log("========================================================")

  const MOCK_PORT = 19892
  const clientEvents: RelayEvent[] = []
  const socketOneMessages: Record<string, unknown>[] = []
  const socketTwoMessages: Record<string, unknown>[] = []

  const wss = new WebSocketServer({ port: MOCK_PORT })
  let connectionIndex = 0

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++

    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (msg.setup) {
        ws.send(JSON.stringify({ setupComplete: {} }))
        if (myIndex === 0) {
          setTimeout(() => ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "pre-tool", resumable: true },
          })), 20)
          setTimeout(() => ws.send(JSON.stringify({
            toolCall: { functionCalls: [{ id: "call-2", name: "ask_brain", args: { question: "x" } }] },
          })), 40)
          setTimeout(() => ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "mid", resumable: false },
          })), 60)
          // Hard close BEFORE tool result arrives — adapter should surface error
          setTimeout(() => ws.close(1011, "timeLeft expired"), 100)
        }
      } else {
        if (myIndex === 0) socketOneMessages.push(msg)
        else socketTwoMessages.push(msg)
      }
    })
  })

  await new Promise((r) => wss.on("listening", () => r(null)))

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => {
    clientEvents.push(event as RelayEvent)
    if ((event as { type: string }).type === "tool.call") {
      // Tool result arrives AFTER the socket closed — should not be sent anywhere
      setTimeout(() => {
        adapter.sendToolResult("call-2", JSON.stringify({ answer: "late" }))
      }, 300)
    }
  })

  await new Promise((r) => setTimeout(r, 1500))

  console.log(`    Client events: ${clientEvents.map((e) => e.type).join(", ")}`)
  console.log(`    Socket 1 messages: ${socketOneMessages.map((m) => Object.keys(m)[0]).join(", ")}`)
  console.log(`    Socket 2 messages: ${socketTwoMessages.map((m) => Object.keys(m)[0]).join(", ")}`)

  const errors = clientEvents.filter((e) => e.type === "error")
  const rotated = clientEvents.filter((e) => e.type === "session.rotated")

  assert(errors.length === 1, `hard close mid-tool surfaces exactly one error (got ${errors.length})`)
  assert(rotated.length === 0, `no rotation attempted with stale pre-tool handle (got ${rotated.length})`)
  assert(socketTwoMessages.length === 0, `no toolResponse sent on any resumed socket (got ${socketTwoMessages.length})`)

  adapter.disconnect()
  wss.close()
}

async function runSendQueueDrainTest() {
  console.log("\nGemini Send Queue Drain Test (rapid sends during rotation)")
  console.log("===========================================================")

  const MOCK_PORT = 19893
  const socketTwoMessages: Record<string, unknown>[] = []

  const wss = new WebSocketServer({ port: MOCK_PORT })
  let connectionIndex = 0

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (msg.setup) {
        if (myIndex === 0) {
          ws.send(JSON.stringify({ setupComplete: {} }))
          setTimeout(() => ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "h1", resumable: true },
          })), 20)
          // goAway with no pending tool call → immediate reconnect
          setTimeout(() => ws.send(JSON.stringify({ goAway: { timeLeft: "3s" } })), 40)
          setTimeout(() => ws.close(1011, "rotating"), 80)
        } else {
          // Resumed socket: delay setupComplete a bit so the client has time
          // to buffer some messages in the reconnect window.
          setTimeout(() => ws.send(JSON.stringify({ setupComplete: {} })), 100)
        }
      } else if (myIndex === 1) {
        socketTwoMessages.push(msg)
      }
    })
  })

  await new Promise((r) => wss.on("listening", () => r(null)))

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  const clientEvents: RelayEvent[] = []
  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))

  // Wait for goAway + reconnect to START (isReconnecting=true, upstream=null)
  // Initial setup ~immediate, handle at 20ms, goAway at 40ms → reconnect begins ~40ms.
  await new Promise((r) => setTimeout(r, 60))

  // Flood with audio + a single toolResponse — all should queue
  const floodSize = MAX_PENDING_AUDIO_FROM_ADAPTER + 10 // exceeds cap → drops oldest
  for (let i = 0; i < floodSize; i++) {
    // Construct valid 24kHz PCM16 base64 of 20ms (960 samples × 2 bytes = 1920B)
    const buf = Buffer.alloc(1920)
    buf.writeInt16LE(i % 32767, 0) // stamp chunk index in the first sample
    adapter.sendAudio(buf.toString("base64"))
  }
  adapter.sendToolResult("call-x", JSON.stringify({ ok: true }))

  // Wait for second socket to complete setup and flush to drain
  await new Promise((r) => setTimeout(r, 1500))

  const audioOnSocket2 = socketTwoMessages.filter((m) => "realtimeInput" in m)
  const toolOnSocket2 = socketTwoMessages.filter((m) => "toolResponse" in m)

  console.log(`    Socket 2 received: ${audioOnSocket2.length} audio, ${toolOnSocket2.length} toolResponse`)

  assert(audioOnSocket2.length === MAX_PENDING_AUDIO_FROM_ADAPTER,
    `audio capped at ${MAX_PENDING_AUDIO_FROM_ADAPTER} (got ${audioOnSocket2.length})`)
  assert(toolOnSocket2.length === 1, `toolResponse preserved across rotation (got ${toolOnSocket2.length})`)

  // Control flushes before audio — toolResponse should appear before the first audio chunk
  const firstToolIdx = socketTwoMessages.findIndex((m) => "toolResponse" in m)
  const firstAudioIdx = socketTwoMessages.findIndex((m) => "realtimeInput" in m)
  assert(firstToolIdx >= 0 && firstToolIdx < firstAudioIdx,
    `control drains before audio (toolResponse idx=${firstToolIdx}, first audio idx=${firstAudioIdx})`)

  adapter.disconnect()
  wss.close()
}

// Must mirror the adapter's MAX_PENDING_AUDIO constant
const MAX_PENDING_AUDIO_FROM_ADAPTER = 50

async function runClose1011WithHandleTest() {
  console.log("\nGemini Close 1011 With Handle Test (server error — resume silently)")
  console.log("====================================================================")

  const MOCK_PORT = 19894
  const clientEvents: RelayEvent[] = []
  const receivedSetups: Record<string, unknown>[] = []

  const wss = await startMockGemini({
    receivedSetups,
    onConnect: (ws, index) => {
      if (index === 0) {
        // First session: emit a handle, then close with 1011 (internal error).
        // Transient Gemini-side faults shouldn't drop the user — adapter should
        // resume using the handle.
        setTimeout(() => ws.send(JSON.stringify({
          sessionResumptionUpdate: { newHandle: "h-stable", resumable: true },
        })), 20)
        setTimeout(() => ws.close(1011, "internal error"), 50)
      }
      // Second session: accept setup silently — adapter treats setupComplete as rotated.
    },
  }, MOCK_PORT)

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))
  await new Promise((r) => setTimeout(r, 500))

  console.log(`    Setups received: ${receivedSetups.length}, client events: ${clientEvents.map((e) => e.type).join(", ")}`)

  assert(receivedSetups.length === 2, `reconnect attempted for 1011 (setups=${receivedSetups.length})`)

  const resumedSetup = receivedSetups[1] as { sessionResumption?: { handle?: string } }
  assert(resumedSetup.sessionResumption?.handle === "h-stable", `resumed setup replays stored handle (got ${resumedSetup.sessionResumption?.handle})`)

  const errors = clientEvents.filter((e) => e.type === "error")
  const rotated = clientEvents.filter((e) => e.type === "session.rotated")
  assert(errors.length === 0, `1011 with handle does not surface error (got ${errors.length})`)
  assert(rotated.length === 1, `1011 with handle rotates silently (got ${rotated.length})`)

  adapter.disconnect()
  wss.close()
}

async function runReconnectExhaustedTest() {
  console.log("\nGemini Reconnect Exhausted Test (all attempts fail → error)")
  console.log("============================================================")

  const MOCK_PORT = 19895
  const clientEvents: RelayEvent[] = []
  const receivedSetups: Record<string, unknown>[] = []

  const wss = new WebSocketServer({ port: MOCK_PORT })
  let connectionIndex = 0

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (!msg.setup) return
      receivedSetups.push(msg.setup)
      if (myIndex === 0) {
        ws.send(JSON.stringify({ setupComplete: {} }))
        setTimeout(() => ws.send(JSON.stringify({
          sessionResumptionUpdate: { newHandle: "h", resumable: true },
        })), 20)
        setTimeout(() => ws.send(JSON.stringify({ goAway: { timeLeft: "2s" } })), 40)
      } else {
        // Every reconnect attempt fails: close before setupComplete
        ws.close(1011, "persistently broken")
      }
    })
  })

  await new Promise((r) => wss.on("listening", () => r(null)))

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))
  // Initial + 2 reconnect attempts + 500ms backoff + buffer
  await new Promise((r) => setTimeout(r, 3000))

  console.log(`    Setups received: ${receivedSetups.length}, events: ${clientEvents.map((e) => e.type).join(", ")}`)

  // 1 initial + MAX_RECONNECT_ATTEMPTS (2) failed attempts
  assert(receivedSetups.length === 3, `3 setup attempts total (got ${receivedSetups.length})`)

  const errors = clientEvents.filter((e) => e.type === "error")
  const rotated = clientEvents.filter((e) => e.type === "session.rotated")
  assert(errors.length === 1, `exactly one error after exhaustion (got ${errors.length})`)
  assert(rotated.length === 0, `no session.rotated when all attempts fail (got ${rotated.length})`)

  adapter.disconnect()
  wss.close()
}

async function runChainedGoAwayTest() {
  console.log("\nGemini Chained GoAway Test (two rotations back-to-back)")
  console.log("========================================================")

  const MOCK_PORT = 19896
  const clientEvents: RelayEvent[] = []
  const receivedSetups: Record<string, unknown>[] = []

  const wss = new WebSocketServer({ port: MOCK_PORT })
  let connectionIndex = 0

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (!msg.setup) return
      receivedSetups.push(msg.setup)

      if (myIndex === 0) {
        ws.send(JSON.stringify({ setupComplete: {} }))
        setTimeout(() => ws.send(JSON.stringify({
          sessionResumptionUpdate: { newHandle: "handle-gen-1", resumable: true },
        })), 20)
        setTimeout(() => ws.send(JSON.stringify({ goAway: { timeLeft: "2s" } })), 40)
        setTimeout(() => ws.close(1011, "done"), 80)
      } else if (myIndex === 1) {
        ws.send(JSON.stringify({ setupComplete: {} }))
        setTimeout(() => ws.send(JSON.stringify({
          sessionResumptionUpdate: { newHandle: "handle-gen-2", resumable: true },
        })), 20)
        setTimeout(() => ws.send(JSON.stringify({ goAway: { timeLeft: "2s" } })), 40)
        setTimeout(() => ws.close(1011, "done"), 80)
      } else {
        // Third connection — stay open, no more rotations
        ws.send(JSON.stringify({ setupComplete: {} }))
      }
    })
  })

  await new Promise((r) => wss.on("listening", () => r(null)))

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))
  await new Promise((r) => setTimeout(r, 2500))

  console.log(`    Setups: ${receivedSetups.length}, events: ${clientEvents.map((e) => e.type).join(", ")}`)

  assert(receivedSetups.length === 3, `3 setups across two rotations (got ${receivedSetups.length})`)

  const rotating = clientEvents.filter((e) => e.type === "session.rotating")
  const rotated = clientEvents.filter((e) => e.type === "session.rotated")
  const errors = clientEvents.filter((e) => e.type === "error")
  assert(rotating.length === 2, `two session.rotating events (got ${rotating.length})`)
  assert(rotated.length === 2, `two session.rotated events (got ${rotated.length})`)
  assert(errors.length === 0, `no errors during chained rotations (got ${errors.length})`)

  const thirdSetup = receivedSetups[2] as { sessionResumption?: { handle?: string } }
  assert(thirdSetup.sessionResumption?.handle === "handle-gen-2",
    `third setup uses latest handle (got ${thirdSetup.sessionResumption?.handle})`)

  adapter.disconnect()
  wss.close()
}

async function runResumedGoAwayBeforeFreshHandleTest() {
  console.log("\nGemini Resumed GoAway Before Fresh Handle Test (no rotation with stale handle)")
  console.log("===============================================================================")

  const MOCK_PORT = 19897
  const clientEvents: RelayEvent[] = []
  const receivedSetups: Record<string, unknown>[] = []

  const wss = new WebSocketServer({ port: MOCK_PORT })
  let connectionIndex = 0

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (!msg.setup) return
      receivedSetups.push(msg.setup)

      if (myIndex === 0) {
        // Original session: captures handle, then goAway → first rotation
        ws.send(JSON.stringify({ setupComplete: {} }))
        setTimeout(() => ws.send(JSON.stringify({
          sessionResumptionUpdate: { newHandle: "stale-handle", resumable: true },
        })), 20)
        setTimeout(() => ws.send(JSON.stringify({ goAway: { timeLeft: "2s" } })), 40)
        setTimeout(() => ws.close(1011, "rotating"), 80)
      } else if (myIndex === 1) {
        // Resumed session: emits goAway BEFORE its first sessionResumptionUpdate.
        // Adapter must defer (currentlyResumable=false) and not rotate with the
        // prior session's stale handle.
        ws.send(JSON.stringify({ setupComplete: {} }))
        setTimeout(() => ws.send(JSON.stringify({ goAway: { timeLeft: "2s" } })), 40)
        // Keep socket open — no close, no new handle. Adapter should stay put.
      }
    })
  })

  await new Promise((r) => wss.on("listening", () => r(null)))

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))
  // Wait through first rotation (~150ms) + resumed goAway (40ms after setup)
  await new Promise((r) => setTimeout(r, 1500))

  console.log(`    Setups: ${receivedSetups.length}, events: ${clientEvents.map((e) => e.type).join(", ")}`)

  // Expect exactly 2 setups: initial + first resume. A third setup would mean
  // the adapter rotated again using the stale handle.
  assert(receivedSetups.length === 2,
    `no third setup attempted after resumed-goAway (got ${receivedSetups.length})`)

  const rotated = clientEvents.filter((e) => e.type === "session.rotated")
  assert(rotated.length === 1,
    `exactly one rotation completed, not two (got ${rotated.length})`)

  adapter.disconnect()
  wss.close()
}

async function runQueueAcrossRetryTest() {
  console.log("\nGemini Queue Across Retry Test (queue survives attempt-1 failure)")
  console.log("==================================================================")

  const MOCK_PORT = 19898
  const clientEvents: RelayEvent[] = []
  const socketThreeMessages: Record<string, unknown>[] = []

  const wss = new WebSocketServer({ port: MOCK_PORT })
  let connectionIndex = 0

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (msg.setup) {
        if (myIndex === 0) {
          // Original: capture handle, then goAway, then close
          ws.send(JSON.stringify({ setupComplete: {} }))
          setTimeout(() => ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "h1", resumable: true },
          })), 20)
          setTimeout(() => ws.send(JSON.stringify({ goAway: { timeLeft: "3s" } })), 40)
          setTimeout(() => ws.close(1011, "rotating"), 80)
        } else if (myIndex === 1) {
          // Attempt 1 fails: close without setupComplete
          ws.close(1011, "first retry fails")
        } else {
          // Attempt 2 succeeds — delay setupComplete so messages queue
          setTimeout(() => ws.send(JSON.stringify({ setupComplete: {} })), 100)
        }
      } else if (myIndex === 2) {
        socketThreeMessages.push(msg)
      }
    })
  })

  await new Promise((r) => wss.on("listening", () => r(null)))

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))

  // Wait for first rotation to begin (isReconnecting=true)
  await new Promise((r) => setTimeout(r, 60))

  // Queue audio + toolResponse while attempt 1 is in flight (and will fail)
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.alloc(1920)
    adapter.sendAudio(buf.toString("base64"))
  }
  adapter.sendToolResult("call-retry", JSON.stringify({ ok: true }))

  // Wait long enough for attempt 1 to fail, backoff, attempt 2 to succeed, flush
  await new Promise((r) => setTimeout(r, 2500))

  const audio = socketThreeMessages.filter((m) => "realtimeInput" in m)
  const tools = socketThreeMessages.filter((m) => "toolResponse" in m)

  console.log(`    Socket 3 received: ${audio.length} audio, ${tools.length} toolResponse`)

  assert(audio.length === 10, `10 audio frames drained to socket 3 (got ${audio.length})`)
  assert(tools.length === 1, `toolResponse drained to socket 3 (got ${tools.length})`)

  const errors = clientEvents.filter((e) => e.type === "error")
  assert(errors.length === 0, `no error after attempt-2 success (got ${errors.length})`)

  adapter.disconnect()
  wss.close()
}

async function runControlOverflowTest() {
  console.log("\nGemini Control Overflow Test (newest-drop, originals preserved)")
  console.log("================================================================")

  const MOCK_PORT = 19899
  const socketTwoMessages: Record<string, unknown>[] = []

  const wss = new WebSocketServer({ port: MOCK_PORT })
  let connectionIndex = 0

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      if (msg.setup) {
        if (myIndex === 0) {
          ws.send(JSON.stringify({ setupComplete: {} }))
          setTimeout(() => ws.send(JSON.stringify({
            sessionResumptionUpdate: { newHandle: "h1", resumable: true },
          })), 20)
          setTimeout(() => ws.send(JSON.stringify({ goAway: { timeLeft: "3s" } })), 40)
          setTimeout(() => ws.close(1011, "rotating"), 80)
        } else {
          // Delay setupComplete so control messages queue before draining
          setTimeout(() => ws.send(JSON.stringify({ setupComplete: {} })), 200)
        }
      } else if (myIndex === 1) {
        socketTwoMessages.push(msg)
      }
    })
  })

  await new Promise((r) => wss.on("listening", () => r(null)))

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
  }

  const adapter = new GeminiAdapter()
  ;(adapter as unknown as { wsUrlOverride: string }).wsUrlOverride = `ws://localhost:${MOCK_PORT}`

  const clientEvents: RelayEvent[] = []
  await adapter.connect(config, (event) => clientEvents.push(event as RelayEvent))

  // Wait for reconnect to begin
  await new Promise((r) => setTimeout(r, 60))

  // Flood control queue past MAX_PENDING_CONTROL (20): first 20 preserved, rest dropped.
  const floodSize = MAX_PENDING_CONTROL_FROM_ADAPTER + 10
  for (let i = 0; i < floodSize; i++) {
    adapter.sendToolResult(`call-${i}`, JSON.stringify({ seq: i }))
  }

  // Wait for drain
  await new Promise((r) => setTimeout(r, 1500))

  const toolOnSocket2 = socketTwoMessages.filter((m) => "toolResponse" in m)
  console.log(`    Socket 2 received: ${toolOnSocket2.length} toolResponse (expected ${MAX_PENDING_CONTROL_FROM_ADAPTER})`)

  assert(toolOnSocket2.length === MAX_PENDING_CONTROL_FROM_ADAPTER,
    `control capped at ${MAX_PENDING_CONTROL_FROM_ADAPTER} (got ${toolOnSocket2.length})`)

  // Newest-drop: originals (seq 0..19) preserved, seq 20..29 dropped.
  const firstMsg = toolOnSocket2[0] as { toolResponse: { functionResponses: { id: string }[] } }
  const lastMsg = toolOnSocket2[toolOnSocket2.length - 1] as { toolResponse: { functionResponses: { id: string }[] } }
  assert(firstMsg.toolResponse.functionResponses[0].id === "call-0",
    `first preserved toolResponse is call-0 (got ${firstMsg.toolResponse.functionResponses[0].id})`)
  assert(lastMsg.toolResponse.functionResponses[0].id === `call-${MAX_PENDING_CONTROL_FROM_ADAPTER - 1}`,
    `last preserved toolResponse is call-${MAX_PENDING_CONTROL_FROM_ADAPTER - 1} (got ${lastMsg.toolResponse.functionResponses[0].id})`)

  adapter.disconnect()
  wss.close()
}

// Must mirror the adapter's MAX_PENDING_CONTROL constant
const MAX_PENDING_CONTROL_FROM_ADAPTER = 20

async function main() {
  await runReconnectTest()
  await runUnrecoverableCloseTest()
  await runReconnectRetryTest()
  await runWatchdogGatedTest()
  await runForceFreshReconnectTest()
  await runDeferredRotationMidToolCallTest()
  await runHardCloseMidToolCallTest()
  await runSendQueueDrainTest()
  await runClose1011WithHandleTest()
  await runReconnectExhaustedTest()
  await runChainedGoAwayTest()
  await runResumedGoAwayBeforeFreshHandleTest()
  await runQueueAcrossRetryTest()
  await runControlOverflowTest()
  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
