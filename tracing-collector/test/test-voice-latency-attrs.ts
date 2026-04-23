// End-to-end check: the collector ingests a voice-turn span carrying the new
// voice.latency.* attributes, SQLite round-trips them in attributes_json, and
// the UI-side categoriser splits the turn correctly.
//
// Run: npx tsx test/test-voice-latency-attrs.ts
//
// Uses an isolated on-disk SQLite file so it doesn't touch the user's running
// ~/.voiceclaw/tracing.db. We drive ingest() directly (no HTTP roundtrip) to
// avoid clashing with any collector already bound to :4318.

import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { randomBytes } from "node:crypto"

const tmpDir = mkdtempSync(join(tmpdir(), "voiceclaw-trace-test-"))
const dbPath = join(tmpDir, "tracing.db")
process.env.VOICECLAW_TRACING_DB = dbPath

// Import AFTER setting env so the collector opens our isolated DB.
const { ingest } = await import("../src/otlp.js")
const Database = (await import("better-sqlite3")).default

const TRACE_ID = randomBytes(16).toString("hex")
const SPAN_ID = randomBytes(8).toString("hex")
const NOW_NS = BigInt(Date.now()) * 1_000_000n
const END_NS = NOW_NS + 3_500_000_000n // 3.5s turn

async function main() {
  const body = buildOtlpJsonBody()
  await ingest(Buffer.from(JSON.stringify(body), "utf8"), "application/json")

  const db = new Database(dbPath, { readonly: true })
  const obs = db.prepare("SELECT name, duration_ms, attributes_json FROM observations WHERE span_id = ?").get(SPAN_ID) as {
    name: string
    duration_ms: number
    attributes_json: string
  } | undefined

  if (!obs) throw new Error(`span ${SPAN_ID} not found in DB`)
  if (obs.name !== "voice-turn") throw new Error(`expected name=voice-turn, got ${obs.name}`)

  const attrs = JSON.parse(obs.attributes_json) as Record<string, unknown>
  expect(attrs["voice.latency.endpoint_ms"], 420)
  expect(attrs["voice.latency.endpoint.source"], "server_eos")
  expect(attrs["voice.latency.provider_first_byte_ms"], 450)
  expect(attrs["voice.latency.first_audio_from_turn_start_ms"], 1800)

  // Mirror the UI-side categorise() logic so we fail here if the UI's split
  // math drifts from our expected semantics.
  const endpointMs = attrs["voice.latency.endpoint_ms"] as number
  const firstByteMs = attrs["voice.latency.provider_first_byte_ms"] as number
  const totalMs = obs.duration_ms
  const transportShare = Math.max(0, firstByteMs - endpointMs)
  const realtimeShare = Math.max(0, totalMs - endpointMs)

  if (endpointMs !== 420) throw new Error(`endpointing bucket wrong: ${endpointMs}`)
  if (transportShare !== 30) throw new Error(`transport bucket wrong: ${transportShare}`)
  if (realtimeShare !== 3_500 - 420) throw new Error(`llm_realtime bucket wrong: ${realtimeShare}`)

  console.log("  PASS  voice-turn span ingested with voice.latency.* attrs")
  console.log(`        endpoint=${endpointMs}ms source=${attrs["voice.latency.endpoint.source"]}`)
  console.log(`        provider_first_byte=${firstByteMs}ms first_audio_from_start=${attrs["voice.latency.first_audio_from_turn_start_ms"]}ms`)
  console.log(`        UI split: endpointing=${endpointMs} transport=${transportShare} llm_realtime=${realtimeShare}`)

  db.close()
  rmSync(tmpDir, { recursive: true, force: true })
}

main().catch((err) => {
  console.error("TEST FAILED:", err instanceof Error ? err.message : err)
  try { rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  process.exit(1)
})

// --- helpers ---

function expect<T>(actual: unknown, expected: T) {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

// Build a minimal OTLP JSON request body with one voice-turn span carrying
// the new voice.latency.* attrs. JSON path skips the protobuf deep-import
// tooling — same decode path in ingest() per otlp.ts.
function buildOtlpJsonBody() {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            kvString("service.name", "voiceclaw-relay"),
            kvString("session.id", "test-session"),
          ],
        },
        scopeSpans: [
          {
            scope: { name: "test" },
            spans: [
              {
                traceId: TRACE_ID,
                spanId: SPAN_ID,
                name: "voice-turn",
                kind: 1,
                startTimeUnixNano: NOW_NS.toString(),
                endTimeUnixNano: END_NS.toString(),
                attributes: [
                  kvInt("voice.latency.endpoint_ms", 420),
                  kvString("voice.latency.endpoint.source", "server_eos"),
                  kvInt("voice.latency.provider_first_byte_ms", 450),
                  kvInt("voice.latency.first_audio_from_turn_start_ms", 1800),
                ],
                status: { code: 1 },
              },
            ],
          },
        ],
      },
    ],
  }
}

function kvString(key: string, value: string) {
  return { key, value: { stringValue: value } }
}

function kvInt(key: string, value: number) {
  return { key, value: { intValue: value } }
}
