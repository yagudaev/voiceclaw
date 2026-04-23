// Tracing initializer for the voiceclaw relay. Soft-disables when no backend
// envs are set so local dev without keys is still runnable.
//
// Trace model:
//   Session = one relay WebSocket connection (sessionKey → Langfuse sessionId)
//   Trace   = one voice turn (user utterance → assistant finished speaking)
//   Observations (spans):
//     - generation: model turn (Gemini Live / OpenAI Realtime); usage on close
//     - agent/tool: brain tool calls
//     - span: mobile-side timing reports (stt/llm/tts latency from the device)
//
// Backends:
//   Langfuse         — LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY (+ optional
//                      LANGFUSE_BASE_URL). Uses @langfuse/otel's span
//                      processor, which handles media attachment and
//                      Langfuse-specific attribute mapping.
//
//   Tracing-UI       — TRACING_UI_COLLECTOR_URL, e.g.
//   collector          `http://localhost:4318/v1/traces`. Writes to our own
//                      OTLP-HTTP collector that backs the tracing UI. Fans
//                      out alongside Langfuse so one backend outage doesn't
//                      starve the other.
//
// Both exporters sit behind BatchSpanProcessors so request latency is
// unaffected by export latency. Shutdown flushes via NodeSDK.

import { NodeSDK } from "@opentelemetry/sdk-node"
import { LangfuseSpanProcessor } from "@langfuse/otel"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { BatchSpanProcessor, type SpanProcessor } from "@opentelemetry/sdk-trace-base"
import { log, error as logError } from "../log.js"

let sdk: NodeSDK | null = null
let enabled = false

export function initLangfuse() {
  const processors = buildSpanProcessors()
  if (processors.length === 0) {
    log("[tracing] no tracing backend configured (LANGFUSE_* + TRACING_UI_COLLECTOR_URL both unset) — tracing disabled")
    return
  }

  try {
    sdk = new NodeSDK({
      // Named so Langfuse / any OTel consumer can distinguish relay-emitted
      // spans from openclaw-emitted spans in the same unified trace.
      serviceName: process.env.OTEL_SERVICE_NAME ?? "voiceclaw-relay",
      spanProcessors: processors,
    })
    sdk.start()
    enabled = true
    const enabledBackends = processors.map((p) => (p instanceof LangfuseSpanProcessor ? "langfuse" : "collector"))
    log(`[tracing] enabled (${enabledBackends.join("+")})`)
  } catch (err) {
    logError(`[tracing] failed to initialize: ${(err as Error).message}`)
    sdk = null
    enabled = false
  }
}

export function isLangfuseEnabled(): boolean {
  return enabled
}

export async function shutdownLangfuse() {
  if (!sdk) return
  try {
    await sdk.shutdown()
    log("[tracing] shut down")
  } catch (err) {
    logError(`[tracing] shutdown error: ${(err as Error).message}`)
  }
}

function buildSpanProcessors(): SpanProcessor[] {
  const processors: SpanProcessor[] = []
  const lf = tryBuildLangfuseProcessor()
  if (lf) processors.push(lf)
  const collector = tryBuildCollectorProcessor()
  if (collector) processors.push(collector)
  return processors
}

function tryBuildLangfuseProcessor(): SpanProcessor | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  const baseUrl = process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com"
  if (!publicKey || !secretKey) return null
  return new LangfuseSpanProcessor({
    publicKey,
    secretKey,
    baseUrl,
    environment: process.env.NODE_ENV ?? "development",
  })
}

function tryBuildCollectorProcessor(): SpanProcessor | null {
  const url = process.env.TRACING_UI_COLLECTOR_URL?.trim()
  if (!url) return null
  try {
    return new BatchSpanProcessor(new OTLPTraceExporter({ url }))
  } catch (err) {
    logError(`[tracing] failed to init collector exporter at ${url}: ${(err as Error).message}`)
    return null
  }
}
