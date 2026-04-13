// Brain agent tool — sends queries to OpenClaw via /v1/chat/completions
// Uses SSE streaming to get responses, signals step completions for live progress injection

import type { SessionConfigEvent } from "../types.js"
import type { SendToClient } from "../adapters/types.js"

interface BrainConfig {
  gatewayUrl: string
  authToken: string
  sessionId: string
}

export async function askBrain(
  query: string,
  config: BrainConfig,
  sendToClient: SendToClient,
  callId: string,
): Promise<string> {
  const url = `${config.gatewayUrl.replace(/\/$/, "")}/v1/chat/completions`

  console.log(`[brain] Sending query to ${url}: ${query.substring(0, 80)}...`)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.authToken}`,
      "x-openclaw-session-key": `realtime:${config.sessionId}`,
    },
    body: JSON.stringify({
      model: "kira",
      messages: [
        { role: "user", content: query },
      ],
      stream: true,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`[brain] Error ${response.status}: ${text.substring(0, 200)}`)
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
          console.log(`[brain] Step complete: ${parsed.summary}`)
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

  console.log(`[brain] Response: ${fullResponse.substring(0, 100)}...`)
  return fullResponse || JSON.stringify({ error: "Empty response from brain agent" })
}
