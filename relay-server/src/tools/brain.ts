// Brain agent tool — sends queries to OpenClaw via /v1/chat/completions
// Uses SSE streaming to get responses, signals step completions for live progress injection

import type { SessionConfigEvent } from "../types.js"
import type { SendToClient } from "../adapters/types.js"
import { log, error as logError } from "../log.js"

interface BrainConfig {
  gatewayUrl: string
  authToken: string
  sessionId: string
  traceparent?: string | null
}

export async function askBrain(
  query: string,
  config: BrainConfig,
  sendToClient: SendToClient,
  callId: string,
): Promise<string> {
  const url = `${config.gatewayUrl.replace(/\/$/, "")}/v1/chat/completions`

  log(`[brain] Sending query to ${url}: ${query.substring(0, 80)}...`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000) // 2 min — gateway may need exec approval

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.authToken}`,
    "x-openclaw-session-key": config.sessionId,
  }
  if (config.traceparent) {
    headers["traceparent"] = config.traceparent
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "openclaw",
        messages: [
          { role: "user", content: query },
        ],
        stream: true,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof DOMException && err.name === "AbortError") {
      return JSON.stringify({ error: "Brain agent request timed out" })
    }
    throw err
  }

  if (!response.ok) {
    const text = await response.text()
    logError(`[brain] Error ${response.status}: ${text.substring(0, 200)}`)
    return JSON.stringify({ error: `Brain agent returned ${response.status}` })
  }

  // Parse SSE stream
  const reader = response.body?.getReader()
  if (!reader) {
    return JSON.stringify({ error: "No response body" })
  }

  const decoder = new TextDecoder()
  let fullResponse = ""
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6).trim()

      if (data === "[DONE]") continue

      try {
        const parsed = JSON.parse(data)

        // Check for step completion signals (live progress injection)
        if (parsed.type === "step_complete" && parsed.summary) {
          log(`[brain] Step complete: ${parsed.summary}`)
          sendToClient({
            type: "tool.progress",
            callId,
            summary: parsed.summary,
          })
          continue
        }

        // Standard OpenAI-compatible SSE chunk
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          fullResponse += delta
        }
      } catch {
        // Skip unparseable chunks
      }
    }
  }

  clearTimeout(timeout)
  log(`[brain] Response: ${fullResponse.substring(0, 100)}...`)
  return fullResponse || JSON.stringify({ error: "Empty response from brain agent" })
}
