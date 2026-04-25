// Web search tool — calls Tavily's /search endpoint for fast, model-friendly
// web lookups. Designed as a low-latency alternative to ask_brain: returns in
// ~1-3s vs the brain agent's multi-second multi-step exec, so the realtime
// model can use it inline for "what is X" / "latest on Y" without a long wait.

import { log, error as logError } from "../log.js"

const TAVILY_ENDPOINT = "https://api.tavily.com/search"

// Cap the result count we hand back to the model. Tavily returns up to 10 by
// default; 5 is plenty for voice-context summarization and keeps the tool
// result token budget tight.
const MAX_RESULTS = 5

// Cap each result's content snippet so the model gets enough to reason from
// without bloating the response. Tavily's "advanced" search depth produces
// longer snippets we don't need for voice replies.
const MAX_SNIPPET_CHARS = 600

interface TavilyResult {
  title?: string
  url?: string
  content?: string
  score?: number
}

interface TavilyResponse {
  query?: string
  answer?: string
  results?: TavilyResult[]
}

export interface WebSearchConfig {
  apiKey: string
}

export async function webSearch(
  query: string,
  config: WebSearchConfig,
  externalSignal?: AbortSignal,
): Promise<string> {
  const controller = new AbortController()
  // 15s — Tavily basic search typically lands in ~1-3s. Anything past 15s
  // means the network is wedged; let the model move on rather than blocking
  // the user's reply.
  const timeout = setTimeout(() => controller.abort(new Error("tavily 15s timeout")), 15_000)

  const onExternalAbort = () => {
    const reason = externalSignal?.reason
    controller.abort(reason instanceof Error ? reason : new Error(String(reason ?? "external abort")))
  }
  if (externalSignal) {
    if (externalSignal.aborted) {
      onExternalAbort()
    } else {
      externalSignal.addEventListener("abort", onExternalAbort, { once: true })
    }
  }

  const cleanup = () => {
    clearTimeout(timeout)
    externalSignal?.removeEventListener("abort", onExternalAbort)
  }

  log(`[web_search] Query: ${query.substring(0, 80)}...`)

  // Single try/finally wrapping the entire fetch lifecycle. Cleanup must NOT
  // run after headers but before the body is read — Tavily can stall mid-body
  // and we'd lose the timeout/external-abort protection. Keep the timer and
  // the abort listener live until response.json() / response.text() resolves
  // or throws.
  try {
    let response: Response
    try {
      response = await fetch(TAVILY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: "basic",
          max_results: MAX_RESULTS,
          include_answer: true,
        }),
        signal: controller.signal,
      })
    } catch (err) {
      if (controller.signal.aborted) {
        return JSON.stringify({ error: "Web search aborted" })
      }
      const message = err instanceof Error ? err.message : "fetch failed"
      logError(`[web_search] fetch threw:`, message)
      return JSON.stringify({ error: `Web search failed: ${message}` })
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      logError(`[web_search] Tavily ${response.status}: ${text.substring(0, 200)}`)
      if (response.status === 401 || response.status === 403) {
        return JSON.stringify({ error: "Tavily API key rejected. Check the key in Settings." })
      }
      if (response.status === 429) {
        return JSON.stringify({ error: "Tavily rate limit hit. Try again in a moment." })
      }
      return JSON.stringify({ error: `Tavily returned ${response.status}` })
    }

    let body: TavilyResponse
    try {
      body = await response.json() as TavilyResponse
    } catch (err) {
      if (controller.signal.aborted) {
        return JSON.stringify({ error: "Web search aborted" })
      }
      logError(`[web_search] failed to parse Tavily response:`, err)
      return JSON.stringify({ error: "Tavily returned malformed JSON" })
    }

    const results = (body.results ?? []).slice(0, MAX_RESULTS).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: truncate(r.content ?? "", MAX_SNIPPET_CHARS),
    }))

    log(`[web_search] ${results.length} results, answer=${body.answer ? "yes" : "no"}`)

    return JSON.stringify({
      query: body.query ?? query,
      answer: body.answer ?? null,
      results,
    })
  } finally {
    cleanup()
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + "…"
}
