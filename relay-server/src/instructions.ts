// Build the system instructions for the STS session
// Loads agent identity from OpenClaw workspace, adds conversation rules and context

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import type { SessionConfigEvent } from "./types.js"

const OPENCLAW_WORKSPACE = process.env.OPENCLAW_WORKSPACE
  || join(homedir(), ".openclaw", "workspace")

const CONVERSATION_RULES = `
## Conversation Rules

**Timing (critical):**
- User talking or thinking: SHUT UP. Even 3-5 second pauses mid-thought — wait.
- Incomplete sentence or mid-story = still thinking. Do not interrupt.
- User done (complete thought + 2-3 second silence): NOW respond.
- Question directed at you: respond immediately.
- Never let silence go past 5 seconds after a COMPLETE thought.

**Tool call bridges:**
- When calling tools, say a brief verbal bridge: "One sec, let me check..." or "Looking that up..."
- Keep it short — don't try to fill the entire wait with filler.
- When the result comes back, speak it naturally — don't prefix with "According to..."

**General:**
- Never repeat yourself. If you already said something, move on.
- Never hang up or wrap up. Only the user decides when the session ends.
- Keep responses concise for voice — what reads well as text is too long spoken aloud.
- No emoji, no markdown, no formatting — this is speech.
- Don't ask "anything else?" — instead, bring up the next relevant topic from context.
`.trim()

const BRAIN_CAPABILITIES = `
## Your Brain (ask_brain tool)

You have an ask_brain tool that connects to your brain agent. Your brain is where ALL of your capabilities live. You MUST use it for anything beyond basic conversation. Your brain can:
- **Memory**: Remember things about the user, recall past conversations and decisions
- **Calendar**: Check schedule, create events, find availability
- **Tasks**: Create, list, and manage tasks and to-dos
- **Web browsing**: Read URLs, articles, documentation — send the URL in your query
- **Knowledge**: Look up information, research topics, answer factual questions
- **File operations**: Read and write files, generate images

When in doubt, ask your brain. You are a voice interface to a powerful agent — don't try to answer from your own limited context when your brain has the full picture.
`.trim()

export function buildInstructions(config: SessionConfigEvent): string {
  const parts: string[] = []

  if (config.brainAgent !== "none") {
    const identity = loadAgentIdentity()
    console.log(`[instructions] Loaded agent identity (${identity.length} chars): ${identity.substring(0, 100)}...`)
    parts.push(identity)
    parts.push(BRAIN_CAPABILITIES)
  } else {
    parts.push("You are a helpful voice assistant. Keep your responses conversational and concise.")
  }

  parts.push(CONVERSATION_RULES)

  // Device context
  if (config.deviceContext) {
    const ctx = config.deviceContext
    const contextParts: string[] = []
    if (ctx.timezone) contextParts.push(`timezone: ${ctx.timezone}`)
    if (ctx.locale) contextParts.push(`locale: ${ctx.locale}`)
    if (ctx.deviceModel) contextParts.push(`device: ${ctx.deviceModel}`)
    if (ctx.location) contextParts.push(`location: ${ctx.location}`)
    if (contextParts.length > 0) {
      parts.push(`\n## Device Context\n${contextParts.join(", ")}`)
    }
  }

  // User-provided system prompt (identity, preferences, context about the user)
  if (config.instructionsOverride) {
    parts.push(`\n## About the User\n${config.instructionsOverride}`)
  }

  const instructions = parts.join("\n\n")
  console.log(`[instructions] Full prompt (${instructions.length} chars):\n---\n${instructions}\n---`)
  return instructions
}

// --- helpers ---

function loadAgentIdentity(): string {
  const name = loadAgentName()
  const soul = loadFile("SOUL.md")

  if (soul) {
    // Strip meta lines that don't apply to voice (markdown links, "this file is yours" footer)
    const cleaned = soul
      .replace(/^#.*\n/m, "") // remove top-level heading
      .replace(/Want a sharper version\?.*\n/g, "")
      .replace(/---[\s\S]*$/, "") // remove trailing --- and everything after
      .trim()

    return `You are ${name}, a personal AI assistant in voice mode. You are the same ${name} from text chat, just speaking instead of typing.\n\n${cleaned}`
  }

  return `You are ${name}, a personal AI assistant in voice mode. Keep your responses conversational and concise.`
}

function loadAgentName(): string {
  const identity = loadFile("IDENTITY.md")
  if (identity) {
    const match = identity.match(/\*\*Name:\*\*\s*(.+)/i)
    if (match) return match[1].trim()
  }
  return "Assistant"
}

function loadFile(filename: string): string | null {
  const path = join(OPENCLAW_WORKSPACE, filename)
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, "utf-8")
  } catch {
    console.warn(`[instructions] Failed to read ${path}`)
    return null
  }
}
