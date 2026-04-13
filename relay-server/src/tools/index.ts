// Tool definitions for STS sessions
// echo_tool for testing, ask_brain for brain agent integration

import type { SessionConfigEvent } from "../types.js"

// OpenAI Realtime API tool format
interface RealtimeTool {
  type: "function"
  name: string
  description: string
  parameters: Record<string, unknown>
}

const ECHO_TOOL: RealtimeTool = {
  type: "function",
  name: "echo_tool",
  description: "Test tool that echoes back whatever you send it. Use this when the user asks to test tools.",
  parameters: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to echo back",
      },
    },
    required: ["message"],
  },
}

const ASK_BRAIN: RealtimeTool = {
  type: "function",
  name: "ask_brain",
  description: "Ask your brain agent for information, to perform tasks, or to look things up. Use this for anything that requires memory, web access, calendar, tasks, or knowledge beyond what you know. Also use this for deep analysis of articles or content the user shares — send the URL and your question together. Examples: 'What's on my calendar?', 'Create a task to...', 'Look up my open tickets', 'Remember that I decided to...', 'Analyze the article at https://...'",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The question or task to send to the brain agent",
      },
    },
    required: ["query"],
  },
}

export function getTools(config: SessionConfigEvent): RealtimeTool[] {
  const tools: RealtimeTool[] = [ECHO_TOOL]

  if (config.brainAgent !== "none") {
    tools.push(ASK_BRAIN)
  }

  return tools
}

// Gemini function declaration format (no type:"function" wrapper)
interface GeminiFunctionDeclaration {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export function getGeminiTools(config: SessionConfigEvent): GeminiFunctionDeclaration[] {
  return getTools(config).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))
}

/** Handle synchronous server-side tools. Returns null for async tools like ask_brain. */
export function handleToolCall(
  name: string,
  args: string,
): string | null {
  switch (name) {
    case "echo_tool": {
      const parsed = JSON.parse(args)
      return JSON.stringify({ echoed: parsed.message })
    }
    case "ask_brain":
      // Handled asynchronously by session.ts
      return null
    default:
      return JSON.stringify({ error: `unknown tool: ${name}` })
  }
}
