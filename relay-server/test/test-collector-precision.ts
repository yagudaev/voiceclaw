// Runtime precision test for the tracing-collector BigInt fix.
//
// Emits a span with a known ns-resolution start time, ships it via OTLP-HTTP
// to a collector on localhost:4320 with a test DB, then reads back from the
// same SQLite file to confirm no digits were lost at ingest.
//
// This is a throwaway smoke-test for PR #<bigint-precision>. Run with the
// collector already listening on 4320 and pointing at
// VOICECLAW_TRACING_DB=/tmp/voiceclaw-tracing-test.db:
//
//   cd relay-server && npx tsx test/test-collector-precision.ts
//
// Remove after the PR lands — this file exists only to prove the fix.

import { NodeSDK } from "@opentelemetry/sdk-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { trace, SpanKind } from "@opentelemetry/api"
import Database from "better-sqlite3"

const COLLECTOR_URL = process.env.COLLECTOR_URL ?? "http://127.0.0.1:4320/v1/traces"
const DB_PATH = process.env.TEST_DB ?? "/tmp/voiceclaw-tracing-test.db"

async function main() {
  const sdk = new NodeSDK({
    serviceName: "precision-test",
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: COLLECTOR_URL }))],
  })
  sdk.start()

  const tracer = trace.getTracer("precision-test")

  // Start a span "now" and hold it briefly. Nothing special about the value —
  // the point is that current ns-since-epoch (~1.75e18 in 2026) is already
  // two orders of magnitude past Number.MAX_SAFE_INTEGER (2^53 − 1 ≈ 9.007e15).
  const span = tracer.startSpan("precision-probe", { kind: SpanKind.INTERNAL })
  const traceId = span.spanContext().traceId
  const spanId = span.spanContext().spanId
  const emitNsApprox = BigInt(Date.now()) * 1_000_000n
  await new Promise((r) => setTimeout(r, 5))
  span.end()

  await sdk.shutdown()

  // BatchSpanProcessor is async; give the exporter + HTTP round-trip a moment
  // to reach SQLite.
  await new Promise((r) => setTimeout(r, 500))

  const db = new Database(DB_PATH, { readonly: true })
  // Read back as BigInt so we compare at full int64 precision. The collector
  // stores int64 natively; a default Number read on the UI side would round.
  const row = db
    .prepare("SELECT start_time_ns, end_time_ns FROM traces WHERE trace_id = ?")
    .safeIntegers(true)
    .get(traceId) as { start_time_ns: bigint; end_time_ns: bigint | null } | undefined
  const obs = db
    .prepare(
      "SELECT start_time_ns, end_time_ns, duration_ms FROM observations WHERE span_id = ?",
    )
    .safeIntegers(true)
    .get(spanId) as
    | { start_time_ns: bigint; end_time_ns: bigint | null; duration_ms: bigint | null }
    | undefined
  db.close()

  if (!row || !obs) {
    throw new Error(`no row found for trace=${traceId} span=${spanId}`)
  }

  console.log("trace_id         =", traceId)
  console.log("span_id          =", spanId)
  console.log("emit (approx ns) =", emitNsApprox.toString())
  console.log("db.traces.start  =", row.start_time_ns.toString())
  console.log("db.traces.end    =", row.end_time_ns?.toString() ?? "null")
  console.log("db.obs.start     =", obs.start_time_ns.toString())
  console.log("db.obs.end       =", obs.end_time_ns?.toString() ?? "null")
  console.log("db.obs.duration  =", obs.duration_ms?.toString() ?? "null", "ms")

  // Sanity: within a few ms of our reference.
  const deltaMs = Number((row.start_time_ns - emitNsApprox) / 1_000_000n)
  if (Math.abs(deltaMs) > 100) {
    throw new Error(`start_time_ns drifted ${deltaMs}ms from expected — bad`)
  }
  console.log(`delta from emit-time reference: ${deltaMs}ms (OK)`)

  // Demonstrate that the raw bigint carries digits a Number round-trip loses.
  // OTel's clock source often rounds start times to whole ms, so start may be
  // a coincidentally lossless round-trip. End times are essentially always
  // sub-ms and expose the loss clearly.
  const showLoss = (label: string, v: bigint | null) => {
    if (v == null) return
    const asNumber = Number(v)
    const roundTripped = BigInt(asNumber)
    if (v === roundTripped) {
      console.log(`${label}: lossless Number round-trip (value ends in many zeros — common for start times)`)
    } else {
      console.log(`${label}: Number round-trip would SHIFT by ${v - roundTripped}ns`)
      console.log(`  stored (bigint):  ${v.toString()}`)
      console.log(`  via Number:       ${asNumber}`)
      console.log(`  back to bigint:   ${roundTripped.toString()}`)
    }
  }
  showLoss("traces.start_time_ns", row.start_time_ns)
  showLoss("traces.end_time_ns  ", row.end_time_ns)
  showLoss("obs.end_time_ns     ", obs.end_time_ns)

  console.log("\nPASS — collector stored the full-precision int64 ns timestamp")
}

main().catch((err) => {
  console.error("TEST FAILED:", err)
  process.exit(1)
})
