// Phase 1a test script — verifies auth + echo loopback
// Run: npx tsx test/test-phase1a.ts
// Requires: relay server running on ws://localhost:8080/ws
// Spins up a mock OpenClaw gateway for auth testing

import { createServer, type Server } from "node:http"
import WebSocket from "ws"

const RELAY_URL = "ws://localhost:8080/ws"
const MOCK_GATEWAY_PORT = 19999
const MOCK_GATEWAY_URL = `http://127.0.0.1:${MOCK_GATEWAY_PORT}`
const VALID_TOKEN = "test-valid-token-abc123"

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

function connectWs(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY_URL)
    ws.on("open", () => resolve(ws))
    ws.on("error", reject)
  })
}

function waitForMessage(ws: WebSocket, timeoutMs = 5000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for message")), timeoutMs)
    ws.once("message", (raw) => {
      clearTimeout(timer)
      resolve(JSON.parse(String(raw)))
    })
  })
}

function waitForClose(ws: WebSocket, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.CLOSED) return resolve()
    const timer = setTimeout(() => reject(new Error("timeout waiting for close")), timeoutMs)
    ws.once("close", () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

// Mock OpenClaw gateway — returns JSON for valid token, 401 for invalid
function startMockGateway(): Promise<Server> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === "/v1/models") {
        const auth = req.headers.authorization ?? ""
        if (auth === `Bearer ${VALID_TOKEN}`) {
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ data: [{ id: "openclaw" }] }))
        } else {
          res.writeHead(401, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "unauthorized" }))
        }
      } else {
        res.writeHead(404)
        res.end("not found")
      }
    })
    server.listen(MOCK_GATEWAY_PORT, () => resolve(server))
  })
}

async function testValidAuth() {
  console.log("\nTest 1: Valid auth token → session.ready + echo")
  const ws = await connectWs()

  ws.send(JSON.stringify({
    type: "session.config",
    provider: "echo",
    voice: "alloy",
    brainAgent: "none",
  }))

  const ready = await waitForMessage(ws)
  assert(ready.type === "session.ready", "received session.ready")
  assert(typeof ready.sessionId === "string" && (ready.sessionId as string).length > 0, "sessionId is non-empty")

  // Test echo loopback
  const testAudio = Buffer.from("hello-audio-test").toString("base64")
  ws.send(JSON.stringify({ type: "audio.append", data: testAudio }))

  const echo = await waitForMessage(ws)
  assert(echo.type === "audio.delta", "received audio.delta echo")
  assert(echo.data === testAudio, "echo data matches sent data")

  ws.close()
  await waitForClose(ws)
}

async function testInvalidToken() {
  console.log("\nTest 2: Invalid auth token → error 401")
  const ws = await connectWs()

  ws.send(JSON.stringify({
    type: "session.config",
    provider: "echo",
    voice: "alloy",
    brainAgent: "none",
  }))

  const error = await waitForMessage(ws)
  assert(error.type === "error", "received error event")
  assert(error.code === 401, "error code is 401")
  assert(error.message === "unauthorized", "error message is 'unauthorized'")

  await waitForClose(ws)
}

async function testNoToken() {
  console.log("\nTest 3: No auth token → immediate rejection")
  const ws = await connectWs()

  ws.send(JSON.stringify({
    type: "session.config",
    provider: "echo",
    voice: "alloy",
    brainAgent: "none",
  }))

  const error = await waitForMessage(ws)
  assert(error.type === "error", "received error event")
  assert(error.code === 401, "error code is 401")

  await waitForClose(ws)
}

async function testNoGateway() {
  console.log("\nTest 4: No gateway URL → immediate rejection")
  const ws = await connectWs()

  ws.send(JSON.stringify({
    type: "session.config",
    provider: "echo",
    voice: "alloy",
    brainAgent: "none",
  }))

  const error = await waitForMessage(ws)
  assert(error.type === "error", "received error event")
  assert(error.code === 401, "error code is 401")

  await waitForClose(ws)
}

async function testUnreachableGateway() {
  console.log("\nTest 5: Unreachable gateway → error 401")
  const ws = await connectWs()

  ws.send(JSON.stringify({
    type: "session.config",
    provider: "echo",
    voice: "alloy",
    brainAgent: "none",
  }))

  const error = await waitForMessage(ws, 10000)
  assert(error.type === "error", "received error event")
  assert(error.code === 401, "error code is 401")

  await waitForClose(ws)
}

async function main() {
  console.log("Phase 1a Tests")
  console.log("==============")
  console.log(`Relay: ${RELAY_URL}`)
  console.log(`Mock Gateway: ${MOCK_GATEWAY_URL}`)

  const gateway = await startMockGateway()
  console.log("Mock OpenClaw gateway started")

  try {
    await testValidAuth()
    await testInvalidToken()
    await testNoToken()
    await testNoGateway()
    await testUnreachableGateway()
  } finally {
    gateway.close()
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("Test runner error:", err)
  process.exit(1)
})
