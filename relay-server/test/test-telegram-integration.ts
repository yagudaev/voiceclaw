// Integration test: exercises the relay's /auth/telegram endpoint and
// confirms a ticket-authenticated WebSocket gets past auth into adapter
// creation. We don't need a real model — reaching the "creating adapter"
// log line proves the auth path works. An invalid GEMINI_API_KEY will fail
// the adapter connect, which is fine: we only assert the session made it
// that far without getting rejected on auth.
//
// Run: npx tsx test/test-telegram-integration.ts

import { spawn } from "node:child_process"
import { createHmac, randomBytes } from "node:crypto"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import WebSocket from "ws"

const TEST_BOT_TOKEN = "1234567890:TEST_BOT_TOKEN_NOT_REAL"
const TEST_RELAY_KEY = "itest-relay-key-" + randomBytes(12).toString("hex")
const PORT = 18765

let passed = 0
let failed = 0

function record(name: string, pass: boolean, detail?: string) {
  if (pass) {
    console.log(`  PASS: ${name}${detail ? ` — ${detail}` : ""}`)
    passed++
  } else {
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`)
    failed++
  }
}

function buildInitData(user: { id: number, username?: string, first_name?: string }): string {
  const params = new URLSearchParams()
  params.set("auth_date", String(Math.floor(Date.now() / 1000)))
  params.set("query_id", "AAH_integ_test")
  params.set("user", JSON.stringify(user))

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")

  const secretKey = createHmac("sha256", "WebAppData").update(TEST_BOT_TOKEN).digest()
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex")
  params.set("hash", hash)
  return params.toString()
}

const tmp = mkdtempSync(join(tmpdir(), "voiceclaw-integ-"))
const logPath = join(tmp, "relay.log")

const relayProc = spawn("npx", ["tsx", "src/index.ts"], {
  env: {
    ...process.env,
    PORT: String(PORT),
    RELAY_API_KEY: TEST_RELAY_KEY,
    TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
    // Avoid hitting real services during integration test
    OPENAI_API_KEY: "sk-fake-for-test",
    GEMINI_API_KEY: "fake-for-test",
    NODE_ENV: "test",
    LANGFUSE_PUBLIC_KEY: "",
    LANGFUSE_SECRET_KEY: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
})

let relayOutput = ""
relayProc.stdout.on("data", (buf) => {
  relayOutput += buf.toString()
})
relayProc.stderr.on("data", (buf) => {
  relayOutput += buf.toString()
})

async function waitForServer(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${PORT}/health`)
      if (res.ok) return
    } catch {
      // not yet
    }
    await sleep(100)
  }
  throw new Error("relay never became ready:\n" + relayOutput)
}

async function cleanup() {
  relayProc.kill("SIGTERM")
  await sleep(200)
  rmSync(tmp, { recursive: true, force: true })
}

try {
  await waitForServer(8000)
  console.log(`  relay booted on :${PORT}`)

  // 1. Missing initData → 400
  {
    const res = await fetch(`http://localhost:${PORT}/auth/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    record("POST /auth/telegram without initData → 400", res.status === 400)
  }

  // 2. Bad initData → 401
  {
    const res = await fetch(`http://localhost:${PORT}/auth/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: "hash=0000&auth_date=0" }),
    })
    record("POST /auth/telegram with bad initData → 401", res.status === 401)
  }

  // 3. Valid initData → 200 + ticket
  let ticket = ""
  let sessionKey = ""
  {
    const initData = buildInitData({ id: 99, username: "integ", first_name: "Test" })
    const res = await fetch(`http://localhost:${PORT}/auth/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
    record("POST /auth/telegram with valid initData → 200", res.status === 200, `status=${res.status}`)
    const body = await res.json() as { ticket: string, sessionKey: string }
    ticket = body.ticket
    sessionKey = body.sessionKey
    record("response contains tgt.-prefixed ticket", ticket.startsWith("tgt."))
    record("response contains telegram:99 sessionKey", sessionKey === "telegram:99")
  }

  // 4. CORS preflight
  {
    const res = await fetch(`http://localhost:${PORT}/auth/telegram`, { method: "OPTIONS" })
    record(
      "CORS preflight returns 204 with allow-origin *",
      res.status === 204 && res.headers.get("access-control-allow-origin") === "*",
    )
  }

  // 5. WS connection with ticket — we expect auth to pass and the relay to
  //    either send session.ready (if the adapter somehow connects) or send
  //    an error coming from the fake Gemini key. EITHER result proves auth
  //    passed; only a 401 "unauthorized" error proves it didn't.
  {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`)
    await new Promise<void>((resolve, reject) => {
      ws.once("open", resolve)
      ws.once("error", reject)
    })
    ws.send(JSON.stringify({
      type: "session.config",
      provider: "gemini",
      voice: "Aoede",
      model: "gemini-3.1-flash-live-preview",
      brainAgent: "none",
      apiKey: ticket,
      sessionKey,
    }))

    const result = await new Promise<{ authPassed: boolean, detail: string }>((resolve) => {
      const timer = setTimeout(() => resolve({ authPassed: false, detail: "timeout (no reply)" }), 5000)
      ws.on("message", (raw) => {
        const ev = JSON.parse(raw.toString()) as { type: string, code?: number, message?: string }
        if (ev.type === "error") {
          // 401 means auth failed. Any other error (e.g. adapter connection
          // failure with fake key) means auth passed but something else broke.
          clearTimeout(timer)
          resolve({ authPassed: ev.code !== 401, detail: `${ev.type}:${ev.code} ${ev.message ?? ""}` })
        } else if (ev.type === "session.ready") {
          clearTimeout(timer)
          resolve({ authPassed: true, detail: "session.ready" })
        }
      })
    })
    ws.close()
    record("WS session.config with ticket passes auth", result.authPassed, result.detail)
  }

  // 6. WS connection with tampered ticket → 401
  {
    const badTicket = ticket.slice(0, -4) + "zzzz"
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`)
    await new Promise<void>((resolve, reject) => {
      ws.once("open", resolve)
      ws.once("error", reject)
    })
    ws.send(JSON.stringify({
      type: "session.config",
      provider: "gemini",
      voice: "Aoede",
      brainAgent: "none",
      apiKey: badTicket,
    }))
    const result = await new Promise<{ rejected: boolean, detail: string }>((resolve) => {
      const timer = setTimeout(() => resolve({ rejected: false, detail: "timeout" }), 3000)
      ws.on("message", (raw) => {
        const ev = JSON.parse(raw.toString()) as { type: string, code?: number }
        if (ev.type === "error") {
          clearTimeout(timer)
          resolve({ rejected: ev.code === 401, detail: `code=${ev.code}` })
        }
      })
    })
    ws.close()
    record("WS session.config with tampered ticket → 401", result.rejected, result.detail)
  }

  // 7. WS connection with legacy RELAY_API_KEY still works (regression check)
  {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`)
    await new Promise<void>((resolve, reject) => {
      ws.once("open", resolve)
      ws.once("error", reject)
    })
    ws.send(JSON.stringify({
      type: "session.config",
      provider: "gemini",
      voice: "Aoede",
      brainAgent: "none",
      apiKey: TEST_RELAY_KEY,
    }))
    const result = await new Promise<{ authPassed: boolean }>((resolve) => {
      const timer = setTimeout(() => resolve({ authPassed: false }), 5000)
      ws.on("message", (raw) => {
        const ev = JSON.parse(raw.toString()) as { type: string, code?: number }
        if (ev.type === "error") {
          clearTimeout(timer)
          resolve({ authPassed: ev.code !== 401 })
        } else if (ev.type === "session.ready") {
          clearTimeout(timer)
          resolve({ authPassed: true })
        }
      })
    })
    ws.close()
    record("WS session.config with legacy RELAY_API_KEY still works", result.authPassed)
  }
} catch (err) {
  console.error("integration test crashed:", err)
  failed++
} finally {
  await cleanup()
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
