// Conversation-history split + summarization for voice session resume.
//
// Voice sessions restart frequently (rotation, cold-start, network drops). To
// preserve continuity without blowing the context window, we keep the last N
// turns verbatim and summarize anything older into a short preamble. The
// preamble is cheap to inject (system text) and the verbatim turns let the
// model match phrasing/style from the immediate prior context.
//
// N=8 turns (16 messages: 8 user + 8 assistant) balances continuity against
// per-turn injection cost. Voice turns are short (~100-200 tokens each), so
// 16 messages ≈ 2-4k tokens — well under OpenAI Realtime's 128k window and
// negligible against Gemini Live's 1M window. Doubling N would not improve
// continuity meaningfully (older turns rarely surface) but would double the
// per-event count we replay on every resume, which adds setup latency.

import type { SessionConfigEvent } from "./types.js"
import { log, error as logError } from "./log.js"

export const RECENT_TURNS_VERBATIM = 8

export type HistoryMessage = { role: "user" | "assistant", text: string }

export interface HistorySplit {
  recent: HistoryMessage[]
  summary: string | null
}

export async function buildHistorySplit(
  history: HistoryMessage[] | undefined,
  provider: SessionConfigEvent["provider"],
): Promise<HistorySplit> {
  if (!history || history.length === 0) {
    return { recent: [], summary: null }
  }

  const recentMessageCount = RECENT_TURNS_VERBATIM * 2
  if (history.length <= recentMessageCount) {
    return { recent: [...history], summary: null }
  }

  const older = history.slice(0, history.length - recentMessageCount)
  const recent = history.slice(history.length - recentMessageCount)
  const summary = await summarize(older, provider)
  return { recent, summary }
}

export function formatSummaryPreamble(summary: string): string {
  return `## Earlier in this conversation\n${summary.trim()}`
}

export function formatRecentTurnsPreamble(recent: HistoryMessage[]): string {
  const lines = recent
    .map((m) => {
      const text = typeof m.text === "string" ? m.text.trim() : ""
      if (!text) return null
      const speaker = m.role === "assistant" ? "Assistant" : "User"
      return `${speaker}: ${text}`
    })
    .filter((l): l is string => l !== null)
  if (lines.length === 0) return ""
  return [
    "## Most recent turns (verbatim)",
    "Treat these as already-spoken context. Do not re-greet or restate them; pick up naturally where the conversation left off.",
    "",
    ...lines,
  ].join("\n")
}

// --- helpers ---

const SUMMARY_PROMPT = [
  "You are summarizing the older portion of an ongoing voice conversation so a new",
  "voice session can resume with continuity. Output a tight bullet list of the key",
  "facts, decisions, and action items the assistant should remember. Keep it under",
  "200 tokens. No preamble. No closing remarks. Use this format:",
  "- <fact or decision>",
  "- <fact or decision>",
].join(" ")

const OPENAI_SUMMARY_MODEL = "gpt-4o-mini"
const GEMINI_SUMMARY_MODEL = "gemini-2.5-flash"
const SUMMARY_TIMEOUT_MS = 8_000

async function summarize(
  older: HistoryMessage[],
  provider: SessionConfigEvent["provider"],
): Promise<string | null> {
  const transcript = older
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
    .join("\n")

  const order: Summarizer[] = provider === "gemini"
    ? [summarizeWithGemini, summarizeWithOpenAI]
    : [summarizeWithOpenAI]

  for (const fn of order) {
    try {
      const summary = await fn(transcript)
      if (summary) return summary
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logError(`[history] ${fn.name} failed (${msg}) — trying next fallback`)
    }
  }

  log("[history] No summarizer produced output — using truncated raw transcript")
  return fallbackTruncatedSummary(older)
}

type Summarizer = (transcript: string) => Promise<string | null>

async function summarizeWithGemini(transcript: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_SUMMARY_MODEL}:generateContent?key=${apiKey}`
  const body = {
    systemInstruction: { parts: [{ text: SUMMARY_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: transcript }] }],
    generationConfig: { maxOutputTokens: 400, temperature: 0.2 },
  }

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Gemini summary HTTP ${res.status}`)
  }

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim()
  return text || null
}

async function summarizeWithOpenAI(transcript: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const url = "https://api.openai.com/v1/chat/completions"
  const body = {
    model: OPENAI_SUMMARY_MODEL,
    messages: [
      { role: "system", content: SUMMARY_PROMPT },
      { role: "user", content: transcript },
    ],
    max_tokens: 400,
    temperature: 0.2,
  }

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`OpenAI summary HTTP ${res.status}`)
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  return text || null
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SUMMARY_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function fallbackTruncatedSummary(older: HistoryMessage[]): string {
  const lines = older.map((m) => `- ${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
  const joined = lines.join("\n")
  if (joined.length <= 1500) return joined
  return joined.slice(joined.length - 1500)
}
