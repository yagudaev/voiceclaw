// Verifies ask_brain injects a W3C `traceparent` header into the outbound
// fetch when called inside an active OTel span context. Downstream openclaw
// needs this header to extract the relay's trace context and nest its own
// spans under it — so this test guards the contract.
//
// Run: npx tsx test/test-brain-traceparent.ts

import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { context, propagation, trace } from "@opentelemetry/api"
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base"
import { W3CTraceContextPropagator } from "@opentelemetry/core"
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks"
import { askBrain } from "../src/tools/brain.js"

async function runTraceparentInjectionTest() {
  console.log("\nBrain traceparent injection test")
  console.log("================================")

  // Minimal OTel setup — just enough to get a real SpanContext into
  // propagation.inject. We don't need any exporter for this test, but we do
  // need an AsyncHooks context manager so context.with() survives awaits.
  const provider = new BasicTracerProvider()
  trace.setGlobalTracerProvider(provider)
  propagation.setGlobalPropagator(new W3CTraceContextPropagator())
  const ctxManager = new AsyncHooksContextManager().enable()
  context.setGlobalContextManager(ctxManager)

  let capturedTraceparent: string | undefined
  const server = createServer((req, res) => {
    capturedTraceparent = req.headers["traceparent"] as string | undefined
    res.writeHead(200, { "content-type": "text/event-stream" })
    res.write('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n')
    res.write("data: [DONE]\n\n")
    res.end()
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const port = (server.address() as AddressInfo).port

  try {
    const tracer = trace.getTracer("test")
    const span = tracer.startSpan("parent-tool-span")
    const ctx = trace.setSpan(context.active(), span)
    const spanCtx = span.spanContext()

    await context.with(ctx, () =>
      askBrain(
        "hello",
        { gatewayUrl: `http://127.0.0.1:${port}`, authToken: "x", sessionId: "t" },
        () => {},
        "call-1",
      ),
    )
    span.end()

    if (!capturedTraceparent) {
      throw new Error("no traceparent header received — propagation.inject did not run")
    }
    // W3C format: version "-" trace-id (32 hex) "-" span-id (16 hex) "-" flags (2 hex)
    const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(capturedTraceparent)
    if (!match) {
      throw new Error(`traceparent is not a valid W3C value: ${capturedTraceparent}`)
    }
    const [, traceId, parentSpanId] = match
    if (traceId !== spanCtx.traceId) {
      throw new Error(`traceparent trace-id ${traceId} does not match parent span trace-id ${spanCtx.traceId}`)
    }
    if (parentSpanId !== spanCtx.spanId) {
      throw new Error(`traceparent parent span-id ${parentSpanId} does not match starting span-id ${spanCtx.spanId}`)
    }
    console.log(`  PASS  traceparent=${capturedTraceparent}`)
    console.log(`        trace-id matches parent (${traceId})`)
    console.log(`        span-id matches parent (${parentSpanId})`)
  } finally {
    server.close()
  }
}

async function runNoContextFallbackTest() {
  console.log("\nBrain traceparent no-context fallback test")
  console.log("==========================================")

  let capturedTraceparent: string | undefined
  const server = createServer((req, res) => {
    capturedTraceparent = req.headers["traceparent"] as string | undefined
    res.writeHead(200, { "content-type": "text/event-stream" })
    res.write('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n')
    res.write("data: [DONE]\n\n")
    res.end()
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const port = (server.address() as AddressInfo).port

  try {
    // No active span — propagation.inject on an empty context should not
    // fabricate a traceparent, so downstream openclaw will start a new root
    // trace rather than attaching to a nonexistent parent.
    await askBrain(
      "hello",
      { gatewayUrl: `http://127.0.0.1:${port}`, authToken: "x", sessionId: "t" },
      () => {},
      "call-nocontext",
    )
    if (capturedTraceparent) {
      throw new Error(`expected no traceparent without active span, got ${capturedTraceparent}`)
    }
    console.log("  PASS  no traceparent injected when no active span")
  } finally {
    server.close()
  }
}

async function main() {
  await runTraceparentInjectionTest()
  await runNoContextFallbackTest()
  console.log("\nAll traceparent tests passed")
}

main().catch((err) => {
  console.error("\nTEST FAILED:", err instanceof Error ? err.message : err)
  process.exit(1)
})
