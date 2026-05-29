import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { executeStandaloneTool, STANDALONE_TOOL_NAMES } from "../../src/tools/exec-standalone.js"
import { ensureWorkspace, getWorkspaceRoot } from "../../src/workspace.js"

describe("executeStandaloneTool", () => {
  let tmpRoot: string
  let prevEnv: string | undefined

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), "voiceclaw-exec-standalone-"))
    prevEnv = process.env.VOICECLAW_WORKSPACE
    process.env.VOICECLAW_WORKSPACE = join(tmpRoot, "workspace")
    await ensureWorkspace()
  })

  afterEach(async () => {
    if (prevEnv === undefined) delete process.env.VOICECLAW_WORKSPACE
    else process.env.VOICECLAW_WORKSPACE = prevEnv
    await rm(tmpRoot, { recursive: true, force: true })
  })

  it("exposes read/write/edit/bash + web_search via STANDALONE_TOOL_NAMES", () => {
    expect([...STANDALONE_TOOL_NAMES].sort()).toEqual(["bash", "edit", "read", "web_search", "write"])
  })

  it("web_search returns ok=false when no Tavily key is supplied", async () => {
    const outcome = await executeStandaloneTool(
      "web_search",
      JSON.stringify({ query: "latest news" }),
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.error).toMatch(/Tavily API key not configured/)
  })

  it("web_search returns ok=false on an empty query", async () => {
    const outcome = await executeStandaloneTool(
      "web_search",
      JSON.stringify({ query: "   " }),
      { tavilyApiKey: "tvly-test" },
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.error).toMatch(/query/)
  })

  it("web_search runs against Tavily and returns a JSON result (mocked fetch)", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          query: "who won",
          answer: "Team A won.",
          results: [{ title: "Result", url: "https://example.com", content: "snippet" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    using _ = withFetch(fetchImpl as unknown as typeof fetch)

    const outcome = await executeStandaloneTool(
      "web_search",
      JSON.stringify({ query: "who won" }),
      { tavilyApiKey: "tvly-test" },
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error(outcome.error)
    const parsed = JSON.parse(outcome.result) as { answer: string, results: unknown[] }
    expect(parsed.answer).toBe("Team A won.")
    expect(parsed.results).toHaveLength(1)
  })

  it("rejects an unknown tool name with ok=false", async () => {
    const outcome = await executeStandaloneTool("nope", JSON.stringify({}))
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.error).toMatch(/unknown tool/)
  })

  it("rejects malformed JSON args with ok=false", async () => {
    const outcome = await executeStandaloneTool("read", "not-json")
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.error).toMatch(/invalid arguments/)
  })

  it("runs read and returns a JSON string with line-numbered content", async () => {
    const path = join(getWorkspaceRoot(), "hello.txt")
    await writeFile(path, "alpha\nbeta\n", "utf-8")

    const outcome = await executeStandaloneTool(
      "read",
      JSON.stringify({ path: "hello.txt" }),
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error(outcome.error)
    const parsed = JSON.parse(outcome.result) as { content: string }
    expect(parsed.content).toBe("1\talpha\n2\tbeta\n")
  })

  it("runs write inside the workspace", async () => {
    const outcome = await executeStandaloneTool(
      "write",
      JSON.stringify({ path: "notes/today.md", content: "hello\n" }),
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error(outcome.error)
    const parsed = JSON.parse(outcome.result) as { written: true, path: string, bytes: number }
    expect(parsed.written).toBe(true)
    const contents = await readFile(parsed.path, "utf-8")
    expect(contents).toBe("hello\n")
  })

  it("write rejects paths outside the workspace (path-scope enforcement)", async () => {
    const escape = join(tmpRoot, "escape.txt")
    const outcome = await executeStandaloneTool(
      "write",
      JSON.stringify({ path: escape, content: "nope" }),
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.error).toMatch(/escapes workspace|parent directory/i)
  })

  it("runs edit on a workspace-resident file", async () => {
    const path = join(getWorkspaceRoot(), "todo.md")
    await writeFile(path, "- [ ] buy milk\n", "utf-8")

    const outcome = await executeStandaloneTool(
      "edit",
      JSON.stringify({
        path: "todo.md",
        old_string: "- [ ] buy milk",
        new_string: "- [x] buy milk",
      }),
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error(outcome.error)
    const after = await readFile(path, "utf-8")
    expect(after).toBe("- [x] buy milk\n")
  })

  it("runs bash, returns stdout, and streams onProgress textDeltas", async () => {
    const progress: string[] = []
    const outcome = await executeStandaloneTool(
      "bash",
      JSON.stringify({ command: "echo first; echo second" }),
      {
        onProgress: (e) => {
          if (e.textDelta) progress.push(e.textDelta)
        },
      },
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error(outcome.error)
    const parsed = JSON.parse(outcome.result) as { stdout: string, exitCode: number }
    expect(parsed.exitCode).toBe(0)
    expect(parsed.stdout).toMatch(/first/)
    expect(parsed.stdout).toMatch(/second/)
    expect(progress.join("")).toMatch(/first/)
  })

  it("bash respects the denylist (sudo blocked)", async () => {
    const outcome = await executeStandaloneTool(
      "bash",
      JSON.stringify({ command: "sudo rm -rf /" }),
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected failure")
    expect(outcome.error).toMatch(/safety policy/)
  })

  it("bash aborts when the external signal fires", async () => {
    const controller = new AbortController()
    const promise = executeStandaloneTool(
      "bash",
      JSON.stringify({ command: "sleep 5" }),
      { signal: controller.signal },
    )
    setTimeout(() => controller.abort(), 50)
    const outcome = await promise
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error("expected ok with non-zero exit")
    const parsed = JSON.parse(outcome.result) as { exitCode: number | null }
    expect(parsed.exitCode === null || parsed.exitCode !== 0).toBe(true)
  })

  it("read supports reading files outside the workspace (read is unrestricted)", async () => {
    const outside = join(tmpRoot, "outside.txt")
    await writeFile(outside, "outside-content\n", "utf-8")
    const outcome = await executeStandaloneTool(
      "read",
      JSON.stringify({ path: outside }),
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error(outcome.error)
    expect(outcome.result).toMatch(/outside-content/)
  })

  it("durationMs is reported on success and on failure", async () => {
    const ok = await executeStandaloneTool("read", JSON.stringify({ path: "AGENTS.md" }))
    expect(typeof ok.durationMs).toBe("number")
    expect(ok.durationMs).toBeGreaterThanOrEqual(0)

    const fail = await executeStandaloneTool("read", JSON.stringify({ path: join(tmpRoot, "missing") }))
    expect(typeof fail.durationMs).toBe("number")
    expect(fail.durationMs).toBeGreaterThanOrEqual(0)
  })
})

// Tiny scoped fetch shim that restores the global on dispose. Uses the
// `using` declaration for guaranteed cleanup even on test failure.
function withFetch(fn: typeof fetch): Disposable {
  const original = globalThis.fetch
  globalThis.fetch = fn
  return {
    [Symbol.dispose]: () => {
      globalThis.fetch = original
    },
  }
}
