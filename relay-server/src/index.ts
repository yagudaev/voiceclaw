import "dotenv/config"
import { initLangfuse, shutdownLangfuse } from "./tracing/langfuse.js"
// initLangfuse must run BEFORE any module that may create OTEL spans on import,
// since the NodeSDK replaces the global TracerProvider.
initLangfuse()

import express from "express"
import { createServer } from "node:http"
import { networkInterfaces } from "node:os"
import { WebSocketServer } from "ws"
import { RelaySession } from "./session.js"
import { getTestPageHTML } from "./test-page.js"
import { log, warn } from "./log.js"
import { gracefulShutdown } from "./shutdown.js"

const SHUTDOWN_TIMEOUT_MS = 10_000

const PORT = parseInt(process.env.PORT ?? "8080", 10)

const app = express()

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.get("/test", (req, res) => {
  if (!isTestPageEnabled()) {
    res.status(404).json({ error: "Test page disabled in production" })
    return
  }

  const host = req.headers.host ?? `localhost:${PORT}`
  res.type("html").send(getTestPageHTML(host))
})

const server = createServer(app)

// 4 MB headroom for screen-share frames — composite + original + strokes-png in
// a single frame.append message can comfortably exceed the previous 1 MB cap.
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 4 * 1_048_576 })

wss.on("connection", (ws) => {
  new RelaySession(ws)
})

// Guards SIGTERM/SIGINT idempotency at the OS-signal layer; the drain-loop
// flag in shutdown.ts guards gracefulShutdown itself.
let shuttingDown = false

async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  log("Shutting down...")

  // If server.close() hangs on a stuck keep-alive socket, the awaits below
  // never complete and gracefulShutdown is never reached. Backstop with a
  // hard-kill timer so the process always exits.
  const hardKill = setTimeout(() => {
    warn("[shutdown] hard-kill timeout reached, forcing exit")
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS + 5_000)
  hardKill.unref()

  // Close client sockets first so each RelaySession runs its cleanup()
  // (endSession → adapter disconnect → transcript sync) before we tear
  // down the OTel exporter that ships the final spans.
  wss.clients.forEach((ws) => ws.close())
  wss.close()
  await new Promise<void>((resolve) => server.close(() => resolve()))

  // Order: gracefulShutdown drains background tasks (which finish their bg.end()
  // calls) BEFORE shutdownLangfuse flushes the SDK — otherwise span ends race
  // the export pipeline and the last few ops disappear.
  await gracefulShutdown(SHUTDOWN_TIMEOUT_MS)

  // Drain pending spans before exiting — otherwise the last turn of every
  // active session gets dropped on SIGTERM.
  await shutdownLangfuse()
  process.exit(0)
}

process.on("SIGTERM", () => { void shutdown() })
process.on("SIGINT", () => { void shutdown() })

if (!process.env.RELAY_API_KEY) {
  warn("⚠️  RELAY_API_KEY is not set — WebSocket connections will not require authentication")
}

server.listen(PORT, () => {
  const lanIP = getLanIP()
  log(`Relay server listening on http://localhost:${PORT}`)
  if (isTestPageEnabled()) {
    log(`Test page: http://localhost:${PORT}/test`)
  }
  if (lanIP) {
    log(`Connect from your phone:`)
    log(`  ws://${lanIP}:${PORT}/ws`)
    if (isTestPageEnabled()) {
      log(`  Test page: http://${lanIP}:${PORT}/test`)
    }
  }
})

function isTestPageEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_TEST_PAGE === "true"
  )
}

function getLanIP(): string | null {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address
      }
    }
  }
  return null
}
