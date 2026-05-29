// Standalone tool executor for the "direct to provider" path.
//
// The mobile client talks straight to Gemini for audio and only delegates TOOL
// execution back to the desktop. This module is the desktop-side dispatcher
// for those one-shot tool calls. It reuses the SAME executors the in-session
// path uses (runRead / runWrite / runEdit / runBash) so the workspace,
// denylist, path-scoping, and timeout behavior stay identical — there is no
// fork of safety logic.
//
// `executeStandaloneTool` is shape-agnostic about transport; it just yields
// progress events via the supplied callback and returns a result string. The
// session layer wraps it in `tool.progress` / `tool.result` / `tool.error`
// envelopes for the WebSocket.

import { runRead, READ_TOOL_NAME } from "./direct/read.js"
import { runWrite, WRITE_TOOL_NAME } from "./direct/write.js"
import { runEdit, EDIT_TOOL_NAME } from "./direct/edit.js"
import { runBash, BASH_TOOL_NAME } from "./direct/bash.js"
import { webSearch } from "./web-search.js"
import { ensureWorkspace } from "../workspace.js"

export type StandaloneToolName =
  | typeof READ_TOOL_NAME
  | typeof WRITE_TOOL_NAME
  | typeof EDIT_TOOL_NAME
  | typeof BASH_TOOL_NAME
  | "web_search"

export const STANDALONE_TOOL_NAMES = new Set<string>([
  READ_TOOL_NAME,
  WRITE_TOOL_NAME,
  EDIT_TOOL_NAME,
  BASH_TOOL_NAME,
  // web_search is a server-side Tavily fetch — no desktop/workspace needed, so
  // the direct (mobile → relay) path can fulfill it just like the file tools.
  "web_search",
])

export interface StandaloneProgress {
  textDelta?: string
  step?: string
  summary?: string
}

export interface StandaloneToolOptions {
  signal?: AbortSignal
  onProgress?: (event: StandaloneProgress) => void
  // Tavily key for web_search. The session resolves it at session.prep time
  // (config first, env fallback) since the direct tool.exec path carries no
  // session.config to resolve it from.
  tavilyApiKey?: string
}

export interface StandaloneToolSuccess {
  ok: true
  result: string
  durationMs: number
}

export interface StandaloneToolFailure {
  ok: false
  error: string
  durationMs: number
}

export type StandaloneToolOutcome = StandaloneToolSuccess | StandaloneToolFailure

// One-shot dispatch: parse args, run the matching executor, return the JSON
// payload as a string. `ensureWorkspace()` runs once before exec so the first
// call lazy-creates the workspace, mirroring `handleSessionConfig`'s behavior.
export async function executeStandaloneTool(
  name: string,
  argsJson: string,
  opts: StandaloneToolOptions = {},
): Promise<StandaloneToolOutcome> {
  const startedAt = Date.now()

  let parsed: Record<string, unknown>
  try {
    const raw = typeof argsJson === "string" ? argsJson : ""
    parsed = raw.length === 0 ? {} : JSON.parse(raw) as Record<string, unknown>
    if (parsed === null || typeof parsed !== "object") {
      throw new Error("arguments must be a JSON object")
    }
  } catch (err) {
    return {
      ok: false,
      error: `invalid arguments: ${(err as Error).message}`,
      durationMs: Date.now() - startedAt,
    }
  }

  // web_search is a pure network call (Tavily) with no filesystem dependency,
  // so it runs before ensureWorkspace — a workspace init failure must not block
  // a web lookup.
  if (name === "web_search") {
    const apiKey = opts.tavilyApiKey?.trim()
    if (!apiKey) {
      return { ok: false, error: "Tavily API key not configured", durationMs: Date.now() - startedAt }
    }
    const query = typeof parsed.query === "string" ? parsed.query : ""
    if (query.trim().length === 0) {
      return { ok: false, error: "missing or empty query", durationMs: Date.now() - startedAt }
    }
    // webSearch encodes Tavily errors into the returned JSON (matching the
    // in-session path), so a {error} payload is still a completed tool result
    // the model reads — not a transport failure.
    const result = await webSearch(query, { apiKey }, opts.signal)
    return { ok: true, result, durationMs: Date.now() - startedAt }
  }

  try {
    await ensureWorkspace()
  } catch (err) {
    return {
      ok: false,
      error: `workspace init failed: ${(err as Error).message}`,
      durationMs: Date.now() - startedAt,
    }
  }

  switch (name) {
    case READ_TOOL_NAME: {
      const result = await runRead({
        path: typeof parsed.path === "string" ? parsed.path : "",
        offset: typeof parsed.offset === "number" ? parsed.offset : undefined,
        limit: typeof parsed.limit === "number" ? parsed.limit : undefined,
      })
      return finishFromResult(result, startedAt)
    }
    case WRITE_TOOL_NAME: {
      const result = await runWrite({
        path: typeof parsed.path === "string" ? parsed.path : "",
        content: typeof parsed.content === "string" ? parsed.content : "",
      })
      return finishFromResult(result, startedAt)
    }
    case EDIT_TOOL_NAME: {
      const result = await runEdit({
        path: typeof parsed.path === "string" ? parsed.path : "",
        old_string: typeof parsed.old_string === "string" ? parsed.old_string : "",
        new_string: typeof parsed.new_string === "string" ? parsed.new_string : "",
        replace_all: parsed.replace_all === true,
      })
      return finishFromResult(result, startedAt)
    }
    case BASH_TOOL_NAME: {
      const command = typeof parsed.command === "string" ? parsed.command : ""
      const timeoutMs = typeof parsed.timeout_ms === "number" ? parsed.timeout_ms : undefined
      const background = parsed.background === true

      const result = await runBash(
        { command, timeout_ms: timeoutMs, background },
        {
          signal: opts.signal,
          onProgress: (event) => {
            if (opts.signal?.aborted) return
            opts.onProgress?.({
              textDelta: event.textDelta,
              step: event.step,
            })
          },
        },
      )
      return finishFromResult(result, startedAt)
    }
    default:
      return {
        ok: false,
        error: `unknown tool: ${name}`,
        durationMs: Date.now() - startedAt,
      }
  }
}

function finishFromResult(
  result: object,
  startedAt: number,
): StandaloneToolOutcome {
  const durationMs = Date.now() - startedAt
  if (result && typeof result === "object" && "error" in result && typeof (result as { error: unknown }).error === "string") {
    return { ok: false, error: (result as { error: string }).error, durationMs }
  }
  return { ok: true, result: JSON.stringify(result), durationMs }
}
