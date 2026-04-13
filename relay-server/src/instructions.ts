// Build the system instructions for the STS session
// Combines mini-identity, conversation timing rules, and optional overrides

import type { SessionConfigEvent } from "./types.js"

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

export function buildInstructions(config: SessionConfigEvent): string {
  const parts: string[] = []

  // Mini-identity
  if (config.brainAgent === "kira") {
    parts.push("You are Kira, a personal AI assistant in voice mode. You have access to the ask_brain tool for memory, tasks, calendar, and knowledge. Keep your responses conversational and concise. You are the same Kira from text chat, just speaking instead of typing.")
  } else {
    parts.push("You are a helpful voice assistant. Keep your responses conversational and concise.")
  }

  // Conversation timing and behavior rules
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

  // User-provided overrides
  if (config.instructionsOverride) {
    parts.push(`\n## Additional Context\n${config.instructionsOverride}`)
  }

  return parts.join("\n\n")
}
