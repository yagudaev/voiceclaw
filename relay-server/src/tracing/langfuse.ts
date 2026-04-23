// Langfuse tracing initializer. Soft-disables if LANGFUSE_* envs are missing
// so local dev without keys is still runnable.
//
// Trace model:
//   Session = one relay WebSocket connection (sessionKey → Langfuse sessionId)
//   Trace   = one voice turn (user utterance → assistant finished speaking)
//   Observations (spans):
//     - generation: model turn (Gemini Live / OpenAI Realtime); usage on close
//     - agent/tool: brain tool calls
//     - span: mobile-side timing reports (stt/llm/tts latency from the device)

import { NodeSDK } from "@opentelemetry/sdk-node"
import { LangfuseSpanProcessor } from "@langfuse/otel"
import { log, error as logError } from "../log.js"

let sdk: NodeSDK | null = null
let enabled = false

export function initLangfuse() {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  const baseUrl = process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com"

  if (!publicKey || !secretKey) {
    log("[langfuse] LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY not set — tracing disabled")
    return
  }

  try {
    sdk = new NodeSDK({
      // Named so Langfuse / any OTEL consumer can distinguish relay-emitted
      // spans from openclaw-emitted spans in the same unified trace.
      serviceName: process.env.OTEL_SERVICE_NAME ?? "voiceclaw-relay",
      spanProcessors: [
        new LangfuseSpanProcessor({
          publicKey,
          secretKey,
          baseUrl,
          environment: process.env.NODE_ENV ?? "development",
        }),
      ],
    })
    sdk.start()
    enabled = true
    log(`[langfuse] tracing enabled (${baseUrl})`)
  } catch (err) {
    logError(`[langfuse] failed to initialize: ${(err as Error).message}`)
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
    log("[langfuse] tracing shut down")
  } catch (err) {
    logError(`[langfuse] shutdown error: ${(err as Error).message}`)
  }
}
