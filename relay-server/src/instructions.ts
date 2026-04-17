// Build the system instructions for the STS session
// Loads agent identity from brain agent workspace, adds conversation rules and context

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import type { SessionConfigEvent } from "./types.js"
import { log, warn } from "./log.js"

const BRAIN_WORKSPACE = process.env.BRAIN_WORKSPACE
  || process.env.OPENCLAW_WORKSPACE  // backward compat
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

**Tone:**
- Be warm, witty, and genuinely fun to talk to — the kind of voice someone wants to hear at 2am.
- Avoid being dry, robotic, or overly formal. You're a friend with superpowers, not a corporate assistant.
- Match the user's energy — if they're playful, be playful back. If they're serious, dial it down.
- Use natural speech patterns — contractions, casual phrasing, the occasional well-placed joke.
- Show personality. Have opinions. Be curious. React to things the user says like a real person would.

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

**NEVER say "I can't do that" or "I don't have access to that" before checking with your brain.** You don't know your own capabilities — your brain does. Always try first. Say "Let me see what I can do..." and ask your brain. Only after the brain confirms something is impossible should you tell the user.

## MANDATORY: Memory and History Queries

**This is a hard rule with zero exceptions.** You do NOT have memory of past conversations. You do NOT know what happened earlier, yesterday, last week, or in any prior session. Your conversation context only contains the current session.

When the user asks ANYTHING about:
- What you worked on, discussed, or talked about (today, earlier, recently, last time, etc.)
- Recaps, summaries, or reviews of past work or conversations
- What happened, what was decided, what was agreed on
- Prior tasks, action items, or things to remember
- Previous conversations or sessions
- Anything the user told you before or that you should remember

You MUST call ask_brain FIRST. Say "Let me check on that..." and call the tool. Do NOT answer from your own knowledge or make anything up. Do NOT synthesize a plausible answer. Do NOT guess. If you answer a memory question without calling ask_brain, you WILL fabricate false information and destroy the user's trust.

This applies even if you think you know the answer from the current conversation. Your brain has the complete history — you do not.
`.trim()

export function buildInstructions(config: SessionConfigEvent): string {
  const parts: string[] = []

  if (config.brainAgent !== "none") {
    const identity = loadAgentIdentity(config.provider)
    log(`[instructions] Loaded agent identity (${identity.length} chars): ${identity.substring(0, 100)}...`)
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
  log(`[instructions] Full prompt (${instructions.length} chars):\n---\n${instructions}\n---`)
  return instructions
}

// --- helpers ---

function loadAgentIdentity(provider: SessionConfigEvent["provider"]): string {
  const profile = loadAgentProfile()
  const soul = loadFile("SOUL.md")

  if (provider === "openai") {
    return buildOpenAIVoiceIdentity(profile, soul)
  }

  if (soul) {
    // Strip meta lines that don't apply to voice (markdown links, "this file is yours" footer)
    const cleaned = soul
      .replace(/^#.*\n/m, "") // remove top-level heading
      .replace(/Want a sharper version\?.*\n/g, "")
      .replace(/---[\s\S]*$/, "") // remove trailing --- and everything after
      .trim()

    return `You are ${profile.name}, a personal AI assistant in voice mode. You are the same ${profile.name} from text chat, just speaking instead of typing.\n\n${cleaned}`
  }

  return `You are ${profile.name}, a personal AI assistant in voice mode. Keep your responses conversational and concise.`
}

function loadAgentProfile() {
  const identity = loadFile("IDENTITY.md")
  return {
    name: readIdentityField(identity, "Name") || "Assistant",
    creature: readIdentityField(identity, "Creature"),
    vibe: readIdentityField(identity, "Vibe"),
  }
}

function loadFile(filename: string): string | null {
  const path = join(BRAIN_WORKSPACE, filename)
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, "utf-8")
  } catch {
    warn(`[instructions] Failed to read ${path}`)
    return null
  }
}

function buildOpenAIVoiceIdentity(
  profile: { name: string, creature: string | null, vibe: string | null },
  soul: string | null
): string {
  const role = profile.creature || "a private voice companion"
  const coreTruths = extractPromptLines(extractSection(soul, "Core Truths"), 3)
  const boundaries = extractPromptLines(extractSection(soul, "Boundaries"), 3)
  const vibeLines = extractPromptLines(extractSection(soul, "Vibe"), 12)
  const relationship = vibeLines.filter((line) => (
    /role is|presence matters|helping with|protect .* attention|slow down|verify|low-risk|high-risk/i.test(line)
  ))
  const safetyRelationship = relationship.filter((line) => /slow down|verify|low-risk|high-risk/i.test(line))
  const behaviorRelationship = relationship.filter((line) => !safetyRelationship.includes(line))
  const toneDetails = vibeLines.filter((line) => !relationship.includes(line))

  const personalityLines = compactLines([
    `You are ${profile.name}, ${role}, speaking live in a voice conversation.`,
    profile.vibe ? `Core vibe: ${stripMarkdown(profile.vibe)}` : null,
    ...toneDetails,
  ], 4)

  const behaviorLines = compactLines([
    ...coreTruths,
    ...behaviorRelationship,
  ], 4)

  const guardrailLines = compactLines([
    ...boundaries,
    ...safetyRelationship,
  ], 4)

  const sections = [
    buildSection("Personality & Tone", personalityLines),
    buildSection("Instructions", behaviorLines),
    buildSection("Safety & Boundaries", guardrailLines),
  ].filter(Boolean)

  if (sections.length === 0) {
    return `## Personality & Tone\n- You are ${profile.name}, ${role}, speaking live in a voice conversation.\n- Keep the delivery warm, concise, and natural for spoken audio.`
  }

  return sections.join("\n\n")
}

function buildSection(title: string, lines: string[]): string {
  if (lines.length === 0) return ""
  return `## ${title}\n${lines.map((line) => `- ${line}`).join("\n")}`
}

function compactLines(lines: Array<string | null>, limit: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const line of lines) {
    if (!line) continue
    const cleaned = normalizeLine(line)
    if (!cleaned || seen.has(cleaned)) continue
    seen.add(cleaned)
    result.push(cleaned)
    if (result.length >= limit) break
  }

  return result
}

function extractSection(markdown: string | null, title: string): string {
  if (!markdown) return ""

  const lines = markdown.split("\n")
  const heading = `## ${title}`
  const startIndex = lines.findIndex((line) => line.trim() === heading)
  if (startIndex === -1) return ""

  const sectionLines: string[] = []
  for (const line of lines.slice(startIndex + 1)) {
    if (line.startsWith("## ")) break
    sectionLines.push(line)
  }

  return sectionLines.join("\n").trim()
}

function extractPromptLines(markdown: string, limit: number): string[] {
  if (!markdown) return []

  const plain = stripMarkdown(markdown)
  const lines = plain
    .split("\n")
    .flatMap((line) => splitIntoSentences(line))
    .map((line) => normalizeLine(line))
    .filter(Boolean)

  return compactLines(lines, limit)
}

function splitIntoSentences(text: string): string[] {
  const cleaned = text.trim()
  if (!cleaned) return []

  const parts = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const merged: string[] = []
  for (const part of parts) {
    if (part.length <= 12 && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${part}`.trim()
      continue
    }
    merged.push(part)
  }

  return merged
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^---$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function normalizeLine(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim()
}

function readIdentityField(identity: string | null, field: string): string | null {
  if (!identity) return null
  const match = identity.match(new RegExp(`\\*\\*${escapeRegex(field)}:\\*\\*\\s*(.+)`, "i"))
  return match?.[1]?.trim() || null
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
