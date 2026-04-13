import "dotenv/config"
import express from "express"
import { createServer } from "node:http"
import { WebSocketServer } from "ws"
import { RelaySession } from "./session.js"

const PORT = parseInt(process.env.PORT ?? "8080", 10)

const app = express()

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

const server = createServer(app)

const wss = new WebSocketServer({ server, path: "/ws" })

wss.on("connection", (ws) => {
  new RelaySession(ws)
})

server.listen(PORT, () => {
  console.log(`Relay server listening on http://localhost:${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`)
})
