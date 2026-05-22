import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm, mkdir, writeFile, symlink, readFile, realpath } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runWrite } from "../../../src/tools/direct/write.js"
import { ensureWorkspace, getWorkspaceRoot } from "../../../src/workspace.js"

describe("write tool", () => {
  let tmpRoot: string
  let prevEnv: string | undefined

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), "voiceclaw-write-"))
    prevEnv = process.env.VOICECLAW_WORKSPACE
    process.env.VOICECLAW_WORKSPACE = join(tmpRoot, "workspace")
    await ensureWorkspace()
  })

  afterEach(async () => {
    if (prevEnv === undefined) delete process.env.VOICECLAW_WORKSPACE
    else process.env.VOICECLAW_WORKSPACE = prevEnv
    await rm(tmpRoot, { recursive: true, force: true })
  })

  it("writes a new file at a workspace-relative path", async () => {
    const result = await runWrite({ path: "notes.md", content: "hello\n" })
    if ("error" in result) throw new Error(result.error)
    expect(result.written).toBe(true)
    expect(result.bytes).toBe(6)
    const written = await readFile(join(getWorkspaceRoot(), "notes.md"), "utf-8")
    expect(written).toBe("hello\n")
  })

  it("creates parent directories for workspace-relative paths", async () => {
    const result = await runWrite({ path: "memory/2026-05-22.md", content: "today\n" })
    if ("error" in result) throw new Error(result.error)
    const written = await readFile(join(getWorkspaceRoot(), "memory", "2026-05-22.md"), "utf-8")
    expect(written).toBe("today\n")
  })

  it("overwrites an existing file", async () => {
    await runWrite({ path: "x.txt", content: "first" })
    const result = await runWrite({ path: "x.txt", content: "second" })
    if ("error" in result) throw new Error(result.error)
    const written = await readFile(join(getWorkspaceRoot(), "x.txt"), "utf-8")
    expect(written).toBe("second")
  })

  it("rejects writes outside the workspace via absolute path", async () => {
    const escape = join(tmpRoot, "escape.txt")
    await mkdir(tmpRoot, { recursive: true })
    const result = await runWrite({ path: escape, content: "nope" })
    expect("error" in result).toBe(true)
    await expect(readFile(escape, "utf-8")).rejects.toThrow()
  })

  it("rejects writes via ../ escape", async () => {
    const result = await runWrite({ path: "../outside.txt", content: "nope" })
    expect("error" in result).toBe(true)
  })

  it("rejects writes through a parent-dir symlink that escapes the workspace", async () => {
    const outsideDir = join(tmpRoot, "outside-dir")
    await mkdir(outsideDir, { recursive: true })
    const linkedDir = join(getWorkspaceRoot(), "linkdir")
    await symlink(outsideDir, linkedDir)

    const result = await runWrite({ path: "linkdir/inside.txt", content: "boom" })
    expect("error" in result).toBe(true)
    // Confirm nothing landed in the escaped target.
    await expect(readFile(join(outsideDir, "inside.txt"), "utf-8")).rejects.toThrow()
  })

  it("rejects empty path", async () => {
    const result = await runWrite({ path: "", content: "x" })
    expect("error" in result).toBe(true)
  })

  it("rejects non-string content", async () => {
    // @ts-expect-error testing runtime validation
    const result = await runWrite({ path: "x.txt", content: 123 })
    expect("error" in result).toBe(true)
  })

  it("returns the canonical (realpathed) workspace path", async () => {
    const result = await runWrite({ path: "canonical.txt", content: "x" })
    if ("error" in result) throw new Error(result.error)
    expect(result.path).toBe(join(await realpath(getWorkspaceRoot()), "canonical.txt"))
  })
})
