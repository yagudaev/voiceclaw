// tracing-collector entrypoint.
//
// Serves OTLP-HTTP on port 4318 (OTel convention). `POST /v1/traces` accepts
// protobuf or JSON per the OTLP HTTP spec. Spans are decoded and written to
// a local SQLite database via ./otlp.ts. See docs/tracing-ui/SPEC.md for the
// full architecture.
//
// No auth in v1 — listens on loopback by default. Override with HOST env.

import { createServer, type IncomingMessage } from "node:http"
import { ingest } from "./otlp.js"

const PORT = Number(process.env.PORT ?? 4318)
const HOST = process.env.HOST ?? "127.0.0.1"
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 10 * 1024 * 1024)

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      res.writeHead(200, { "content-type": "application/json" })
      res.end(JSON.stringify({ status: "ok", service: "voiceclaw-tracing-collector" }))
      return
    }
    if (req.method === "POST" && req.url === "/v1/traces") {
      const body = await readBody(req)
      if (body == null) {
        res.writeHead(413).end()
        return
      }
      try {
        await ingest(body, req.headers["content-type"])
        // OTLP spec: 200 with empty ExportTraceServiceResponse body is fine.
        res.writeHead(200, { "content-type": "application/x-protobuf" })
        res.end()
      } catch (err) {
        console.error("[tracing-collector] ingest error:", err)
        res.writeHead(500, { "content-type": "application/json" })
        res.end(JSON.stringify({ error: (err as Error).message }))
      }
      return
    }
    res.writeHead(404).end()
  } catch (err) {
    console.error("[tracing-collector] server error:", err)
    if (!res.headersSent) {
      res.writeHead(500).end()
    }
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[tracing-collector] listening on http://${HOST}:${PORT} (POST /v1/traces)`)
})

function readBody(req: IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on("data", (chunk: Buffer) => {
      total += chunk.length
      if (total > MAX_BODY_BYTES) {
        req.destroy()
        resolve(null)
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => resolve(Buffer.concat(chunks)))
    req.on("error", reject)
  })
}

process.on("SIGTERM", () => server.close(() => process.exit(0)))
process.on("SIGINT", () => server.close(() => process.exit(0)))
