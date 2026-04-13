import "dotenv/config"
import express from "express"
import { createServer } from "node:http"
import { networkInterfaces } from "node:os"
import { WebSocketServer } from "ws"
import { RelaySession } from "./session.js"
import { getTestPageHTML } from "./test-page.js"

const PORT = parseInt(process.env.PORT ?? "8080", 10)

const app = express()

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.get("/test", (req, res) => {
  const host = req.headers.host ?? `localhost:${PORT}`
  res.type("html").send(getTestPageHTML(host))
})

const server = createServer(app)

const wss = new WebSocketServer({ server, path: "/ws" })

wss.on("connection", (ws) => {
  new RelaySession(ws)
})

function shutdown() {
  console.log("\nShutting down...")
  wss.clients.forEach((ws) => ws.close())
  wss.close()
  server.close(() => process.exit(0))
  // Force exit if graceful shutdown takes too long
  setTimeout(() => process.exit(1), 3000)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

server.listen(PORT, () => {
  const lanIP = getLanIP()
  console.log(`Relay server listening on http://localhost:${PORT}`)
  console.log(`Test page: http://localhost:${PORT}/test`)
  if (lanIP) {
    console.log(`\nConnect from your phone:`)
    console.log(`  ws://${lanIP}:${PORT}/ws`)
    console.log(`  Test page: http://${lanIP}:${PORT}/test`)
  }
})

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
