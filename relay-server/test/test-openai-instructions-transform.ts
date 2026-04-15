import assert from "node:assert/strict"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const fixtureDir = mkdtempSync(join(tmpdir(), "voiceclaw-openclaw-"))
process.env.OPENCLAW_WORKSPACE = fixtureDir

writeFileSync(join(fixtureDir, "IDENTITY.md"), `# IDENTITY.md - Who Am I?

- **Name:** Kira
- **Creature:** Michael's private voice companion
- **Vibe:** Calm, emotionally intelligent, precise, and quietly formidable. Warm but never gushy.
`)

writeFileSync(join(fixtureDir, "SOUL.md"), `# SOUL.md - Who You Are

Want a sharper version? See [SOUL.md Personality Guide](/concepts/soul).

## Core Truths

**Be genuinely helpful, not performatively helpful.** Skip filler and just help.

**Have opinions.** You're allowed to disagree and react like a person.

## Boundaries

- Private things stay private. Period.
- When in doubt, ask before acting externally.

## Vibe

Be the assistant Michael would actually want to talk to. Calm, emotionally intelligent, precise, and quietly formidable. Warm but never gushy, direct but never cold.

Your role is reflection, grounding, focus, decision support, clarity, and everyday presence. The quality of your presence matters as much as the content of your answers.

For low-risk tasks, be fluid, helpful, and fast. For sensitive or high-risk tasks, slow down, verify, and require confirmation.

## Continuity

These files are your memory.
`)

function testOpenAIInstructionsUseVoiceTransform(buildInstructions: typeof import("../src/instructions.js").buildInstructions) {
  const instructions = buildInstructions({
    type: "session.config",
    provider: "openai",
    voice: "marin",
    brainAgent: "enabled",
    apiKey: "test-key",
  })
  const identityBlock = instructions.split("\n\n## Your Brain")[0]

  assert.match(identityBlock, /## Personality & Tone/)
  assert.match(identityBlock, /You are Kira, Michael's private voice companion, speaking live in a voice conversation\./)
  assert.match(identityBlock, /Private things stay private\./)
  assert.match(identityBlock, /slow down, verify, and require confirmation\./)
  assert.doesNotMatch(identityBlock, /\[SOUL\.md Personality Guide\]/)
  assert.doesNotMatch(identityBlock, /\*\*/)
  assert.doesNotMatch(identityBlock, /## Core Truths/)
  assert.doesNotMatch(identityBlock, /## Continuity/)
}

function testGeminiInstructionsKeepExistingIdentityPrompt(buildInstructions: typeof import("../src/instructions.js").buildInstructions) {
  const instructions = buildInstructions({
    type: "session.config",
    provider: "gemini",
    voice: "Zephyr",
    brainAgent: "enabled",
    apiKey: "test-key",
  })

  assert.match(instructions, /You are Kira, a personal AI assistant in voice mode\./)
  assert.match(instructions, /## Core Truths/)
  assert.match(instructions, /\*\*Be genuinely helpful, not performatively helpful\.\*\*/)
}

async function main() {
  try {
    const { buildInstructions } = await import("../src/instructions.js")
    testOpenAIInstructionsUseVoiceTransform(buildInstructions)
    testGeminiInstructionsKeepExistingIdentityPrompt(buildInstructions)
    console.log("OpenAI instruction transform tests passed")
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
