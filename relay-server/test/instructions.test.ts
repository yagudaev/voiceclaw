import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { SessionConfigEvent } from "../src/types.js"

const workspaceDir = mkdtempSync(join(tmpdir(), "voiceclaw-instructions-"))
const originalWorkspace = process.env.BRAIN_WORKSPACE

beforeAll(() => {
  process.env.BRAIN_WORKSPACE = workspaceDir
})

afterAll(() => {
  if (originalWorkspace === undefined) {
    delete process.env.BRAIN_WORKSPACE
  } else {
    process.env.BRAIN_WORKSPACE = originalWorkspace
  }
  rmSync(workspaceDir, { recursive: true, force: true })
})

beforeEach(() => {
  // Each test seeds only the files it cares about. Wipe leftovers so a
  // SOUL.md from one case doesn't leak into another.
  for (const f of ["SOUL.md", "IDENTITY.md", "USER.md"]) {
    try {
      writeFileSync(join(workspaceDir, f), "", { mode: 0o600 })
      rmSync(join(workspaceDir, f))
    } catch {
      // ignore
    }
  }
})

const baseConfig: SessionConfigEvent = {
  type: "session.config",
  provider: "gemini",
  voice: "Zephyr",
  brainAgent: "enabled",
  apiKey: "test-key",
}

describe("buildInstructions — USER.md loading", () => {
  it("includes the user's name and bio in the system prompt when USER.md is present", async () => {
    writeFileSync(
      join(workspaceDir, "IDENTITY.md"),
      "# IDENTITY.md\n\n- **Name:** Pam\n- **Vibe:** friendly\n- **Voice:** Zephyr\n",
    )
    writeFileSync(
      join(workspaceDir, "USER.md"),
      "# USER.md\n\n## Name\nMichael\n\n## About\nI build voice agents.\n",
    )
    const { buildInstructions } = await import("../src/instructions.js")
    const prompt = buildInstructions(baseConfig)
    expect(prompt).toContain("About the user")
    expect(prompt).toContain("Michael")
    expect(prompt).toContain("I build voice agents.")
  })

  it("omits the user block when USER.md is missing", async () => {
    writeFileSync(
      join(workspaceDir, "IDENTITY.md"),
      "# IDENTITY.md\n\n- **Name:** Pam\n- **Vibe:** friendly\n- **Voice:** Zephyr\n",
    )
    const { buildInstructions } = await import("../src/instructions.js")
    const prompt = buildInstructions(baseConfig)
    expect(prompt).not.toContain("About the user")
  })

  it("omits the user block when USER.md only holds the placeholder defaults", async () => {
    writeFileSync(
      join(workspaceDir, "IDENTITY.md"),
      "# IDENTITY.md\n\n- **Name:** Pam\n- **Vibe:** friendly\n- **Voice:** Zephyr\n",
    )
    writeFileSync(
      join(workspaceDir, "USER.md"),
      "# USER.md\n\n## Name\nFriend\n\n## About\n_(not provided)_\n",
    )
    const { buildInstructions } = await import("../src/instructions.js")
    const prompt = buildInstructions(baseConfig)
    expect(prompt).not.toContain("About the user")
  })

  it("loads USER.md alongside the OpenAI voice identity", async () => {
    writeFileSync(
      join(workspaceDir, "IDENTITY.md"),
      "# IDENTITY.md\n\n- **Name:** Pam\n- **Creature:** Voice companion\n- **Vibe:** warm\n- **Voice:** marin\n",
    )
    writeFileSync(
      join(workspaceDir, "USER.md"),
      "# USER.md\n\n## Name\nMichael\n\n## About\nLoves coffee.\n",
    )
    const { buildInstructions } = await import("../src/instructions.js")
    const prompt = buildInstructions({ ...baseConfig, provider: "openai", voice: "marin" })
    expect(prompt).toContain("Michael")
    expect(prompt).toContain("Loves coffee.")
  })
})

describe("buildInstructions — systemPromptOverride", () => {
  it("replaces the agent identity section entirely when set", async () => {
    writeFileSync(
      join(workspaceDir, "IDENTITY.md"),
      "# IDENTITY.md\n\n- **Name:** Pam\n- **Vibe:** friendly\n- **Voice:** Zephyr\n",
    )
    writeFileSync(
      join(workspaceDir, "USER.md"),
      "# USER.md\n\n## Name\nMichael\n\n## About\nfoo\n",
    )
    const { buildInstructions } = await import("../src/instructions.js")
    const prompt = buildInstructions({
      ...baseConfig,
      brainAgent: "none",
      systemPromptOverride: "INTRO-SCRIPT-PROMPT",
    })
    expect(prompt).toContain("INTRO-SCRIPT-PROMPT")
    expect(prompt).not.toContain("ask_brain")
    expect(prompt).not.toContain("MANDATORY: Memory and History")
    // Conversation rules still apply so timing/tone behavior is intact.
    expect(prompt).toContain("Conversation Rules")
  })

  it("works without USER.md or IDENTITY.md present", async () => {
    const { buildInstructions } = await import("../src/instructions.js")
    const prompt = buildInstructions({
      ...baseConfig,
      brainAgent: "none",
      systemPromptOverride: "JUST-THIS",
    })
    expect(prompt).toContain("JUST-THIS")
    expect(prompt).toContain("Conversation Rules")
  })
})
