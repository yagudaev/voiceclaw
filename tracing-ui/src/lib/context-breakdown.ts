// Parses the `langfuse.observation.input` chat array on an openclaw.llm span
// and breaks it down into the sections we care about for the context-token
// breakdown tab: system prompt, workspace bootstrap, tool definitions, user
// message, conversation history.
//
// Section sizes are reported in characters plus an estimated token count
// (chars / 4 — rough but fine for a relative-sized bar). When the provider
// reports real token totals via usage_details we surface those alongside.

export type ContextSection = {
  kind: "system" | "workspace_bootstrap" | "tools" | "history" | "user" | "other"
  label: string
  chars: number
  tokens_est: number
  detail?: string
}

export type ContextBreakdown = {
  sections: ContextSection[]
  total_chars: number
  total_tokens_est: number
  provider_tokens?: {
    input: number
    output: number
    total: number
    cached: number
  }
  cache_hit_pct: number | null
}

// Approximate tokens-per-char for English LLM content. Good enough for visual
// ratio bars; real counts come from provider usage_details where available.
const CHARS_PER_TOKEN = 4

export function parseContextBreakdown(
  input: unknown,
  usageDetailsRaw: unknown,
  extraCacheAttrs?: { read?: number; creation?: number },
): ContextBreakdown {
  const messages = normaliseMessages(input)
  const sections: ContextSection[] = []

  // Walk through messages. The layout we expect from openclaw:
  //   [system, ...history, user]
  // The "system" message contains the full system prompt + tooling rules +
  // workspace bootstrap merged as plain text. We try to split that up.
  if (messages.length === 0) {
    return emptyBreakdown(usageDetailsRaw, extraCacheAttrs)
  }

  // First system message — split into system prompt vs workspace bootstrap.
  const firstSystem = messages.find((m) => m.role === "system")
  if (firstSystem) {
    const split = splitSystemMessage(firstSystem.content)
    sections.push({
      kind: "system",
      label: "System prompt",
      chars: split.systemChars,
      tokens_est: Math.round(split.systemChars / CHARS_PER_TOKEN),
      detail: split.systemPreview,
    })
    if (split.bootstrapChars > 0) {
      sections.push({
        kind: "workspace_bootstrap",
        label: "Workspace bootstrap",
        chars: split.bootstrapChars,
        tokens_est: Math.round(split.bootstrapChars / CHARS_PER_TOKEN),
        detail: split.bootstrapPreview,
      })
    }
    if (split.toolsChars > 0) {
      sections.push({
        kind: "tools",
        label: "Tool definitions",
        chars: split.toolsChars,
        tokens_est: Math.round(split.toolsChars / CHARS_PER_TOKEN),
      })
    }
  }

  // Conversation history = everything except system and the final user turn.
  const nonSystem = messages.filter((m) => m.role !== "system")
  const lastUserIdx = nonSystem.findLastIndex((m) => m.role === "user")
  const history = lastUserIdx >= 0 ? nonSystem.slice(0, lastUserIdx) : nonSystem
  const current = lastUserIdx >= 0 ? nonSystem[lastUserIdx] : null

  if (history.length > 0) {
    const historyChars = history.reduce((acc, m) => acc + m.content.length, 0)
    sections.push({
      kind: "history",
      label: `Conversation history (${history.length} msg)`,
      chars: historyChars,
      tokens_est: Math.round(historyChars / CHARS_PER_TOKEN),
    })
  }

  if (current) {
    sections.push({
      kind: "user",
      label: "Current user message",
      chars: current.content.length,
      tokens_est: Math.round(current.content.length / CHARS_PER_TOKEN),
      detail: current.content.slice(0, 240),
    })
  }

  const total_chars = sections.reduce((acc, s) => acc + s.chars, 0)
  const total_tokens_est = sections.reduce((acc, s) => acc + s.tokens_est, 0)

  const providerTokens = parseUsageDetails(usageDetailsRaw, extraCacheAttrs)
  const cache_hit_pct =
    providerTokens && providerTokens.input > 0
      ? (providerTokens.cached / providerTokens.input) * 100
      : null

  return {
    sections,
    total_chars,
    total_tokens_est,
    provider_tokens: providerTokens ?? undefined,
    cache_hit_pct,
  }
}

export type Role = "system" | "user" | "assistant" | "tool" | (string & {})
export type NormalisedMessage = { role: Role; content: string }

export function normaliseMessages(raw: unknown): NormalisedMessage[] {
  if (raw == null) return []
  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw)
    if (parsed == null) return [{ role: "user", content: raw }]
    return normaliseMessages(parsed)
  }
  if (Array.isArray(raw)) {
    return raw
      .map((m) => {
        if (m && typeof m === "object") {
          const obj = m as Record<string, unknown>
          const role = typeof obj.role === "string" ? obj.role : "user"
          const content = contentToText(obj.content)
          return { role, content }
        }
        return { role: "user", content: String(m) }
      })
      .filter((m) => m.content.length > 0)
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    if (typeof obj.role === "string") {
      return [{ role: obj.role, content: contentToText(obj.content) }]
    }
  }
  return []
}

// Rough sectional split of the system message. openclaw's system prompt has a
// stable shape: <system prompt text> then a "<workspace-bootstrap>...</>" or
// "# Dynamic Project Context" block for MEMORY.md injections, and sometimes
// an "# Tools" or "# Tool definitions" block. We use regex fingerprints
// instead of a hard AST parse so the heuristics degrade gracefully.
type SystemSplit = {
  systemChars: number
  systemPreview: string
  bootstrapChars: number
  bootstrapPreview: string
  toolsChars: number
}

function splitSystemMessage(content: string): SystemSplit {
  let remaining = content
  let bootstrapChars = 0
  let bootstrapPreview = ""

  // 1. Explicit <workspace-bootstrap>…</workspace-bootstrap> block.
  const wsMatch = remaining.match(/<workspace-bootstrap>[\s\S]*?<\/workspace-bootstrap>/i)
  if (wsMatch) {
    bootstrapChars = wsMatch[0].length
    bootstrapPreview = wsMatch[0].slice(0, 200)
    remaining = remaining.replace(wsMatch[0], "")
  } else {
    // 2. Look for `MEMORY.md:` or "Dynamic Project Context" section.
    const memIdx = remaining.search(/(^|\n)#{0,3}\s*Dynamic Project Context\b/i)
    const mdIdx = remaining.search(/\bMEMORY\.md(\s*:|\s*\n)/)
    const boundary = [memIdx, mdIdx].filter((i) => i >= 0).sort((a, b) => a - b)[0]
    if (boundary != null && boundary >= 0) {
      const bootstrap = remaining.slice(boundary)
      bootstrapChars = bootstrap.length
      bootstrapPreview = bootstrap.slice(0, 200)
      remaining = remaining.slice(0, boundary)
    }
  }

  // 3. Tool definitions block: a hand-full of common fingerprints from the
  //    openclaw/Anthropic tool-injection style. We look for the first
  //    contiguous tool-definitions region and strip it.
  let toolsChars = 0
  const toolMatch = remaining.match(/##\s*Tool(ing| definitions| Call Style)[\s\S]*?(?=\n##\s|\n#\s|$)/i)
  if (toolMatch) {
    toolsChars = toolMatch[0].length
    remaining = remaining.replace(toolMatch[0], "")
  }

  return {
    systemChars: remaining.length,
    systemPreview: remaining.slice(0, 200),
    bootstrapChars,
    bootstrapPreview,
    toolsChars,
  }
}

function contentToText(raw: unknown): string {
  if (raw == null) return ""
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) {
    return raw
      .map((b) => {
        if (b && typeof b === "object") {
          const bb = b as Record<string, unknown>
          if (typeof bb.text === "string") return bb.text
          if (typeof bb.content === "string") return bb.content
        }
        return typeof b === "string" ? b : ""
      })
      .filter(Boolean)
      .join("\n")
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    if (typeof obj.text === "string") return obj.text
    if (typeof obj.content === "string") return obj.content
    return JSON.stringify(raw)
  }
  return String(raw)
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

type ProviderTokens = { input: number; output: number; total: number; cached: number }

function parseUsageDetails(
  raw: unknown,
  extra?: { read?: number; creation?: number },
): ProviderTokens | null {
  let input = 0
  let output = 0
  let total = 0
  let cached = 0
  let matched = false

  const usage = coerceJsonObject(raw)
  if (usage) {
    const i = pickNumber(usage, ["input", "input_tokens", "prompt_tokens"])
    const o = pickNumber(usage, ["output", "output_tokens", "completion_tokens"])
    const t = pickNumber(usage, ["total", "total_tokens"])
    const c = pickNumber(usage, [
      "cache_read",
      "cache_read_input_tokens",
      "cached",
      "cached_tokens",
      "input_cached",
    ])
    if (i != null) {
      input = i
      matched = true
    }
    if (o != null) {
      output = o
      matched = true
    }
    if (t != null) total = t
    if (c != null) cached = c
  }

  if (extra?.read != null) {
    cached = Math.max(cached, extra.read)
    matched = true
  }
  if (extra?.creation != null && input === 0) {
    // If only creation-tokens are known, treat as fresh input.
    input = extra.creation
    matched = true
  }

  if (!matched) return null
  if (total === 0) total = input + output
  return { input, output, total, cached }
}

function coerceJsonObject(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null
  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>
  return null
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === "number" && !Number.isNaN(v)) return v
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v)
  }
  return null
}

function emptyBreakdown(
  usageDetailsRaw: unknown,
  extraCacheAttrs?: { read?: number; creation?: number },
): ContextBreakdown {
  const providerTokens = parseUsageDetails(usageDetailsRaw, extraCacheAttrs)
  return {
    sections: [],
    total_chars: 0,
    total_tokens_est: 0,
    provider_tokens: providerTokens ?? undefined,
    cache_hit_pct:
      providerTokens && providerTokens.input > 0
        ? (providerTokens.cached / providerTokens.input) * 100
        : null,
  }
}
