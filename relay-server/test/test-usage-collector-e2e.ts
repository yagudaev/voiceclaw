// End-to-end check for relay-emitted usage attrs:
// TurnTracer -> OTel exporter -> running tracing-collector -> SQLite.
//
// Run with a collector already listening:
// TRACING_UI_COLLECTOR_URL=http://127.0.0.1:4318/v1/traces npx tsx test/test-usage-collector-e2e.ts

const collectorUrl = process.env.TRACING_UI_COLLECTOR_URL
if (!collectorUrl) {
  throw new Error("TRACING_UI_COLLECTOR_URL must point at a running tracing-collector")
}

const sessionKey = `usage-e2e-${Date.now()}`

const { initLangfuse, shutdownLangfuse } = await import("../src/tracing/langfuse.js")
const { TurnTracer } = await import("../src/tracing/turn-tracer.js")

initLangfuse()

const tracer = new TurnTracer()
tracer.startSession(sessionKey, "usage-e2e-user", "gpt-realtime-mini", "test instructions")
tracer.startTurn()
tracer.appendUserText("hello")
tracer.appendAssistantText("hi")
tracer.attachUsage({
  promptTokens: 11,
  completionTokens: 7,
  inputAudioTokens: 13,
  outputAudioTokens: 17,
})
tracer.endSession()
await shutdownLangfuse()

console.log(`  PASS  exported usage voice-turn for session ${sessionKey}`)
