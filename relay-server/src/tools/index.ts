// Tool definitions for STS sessions
// Phase 1c: echo_tool for testing
// Phase 3: replaced with ask_brain for real brain agent integration

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

export function getTools(config: SessionConfigEvent): RealtimeTool[] {
  if (config.brainAgent === "none") {
    // Even without a brain agent, include echo_tool for testing
    return [ECHO_TOOL]
  }

  // Phase 3 will add ask_brain here
  return [ECHO_TOOL]
}

export function handleToolCall(
  name: string,
  args: string,
): string {
  switch (name) {
    case "echo_tool": {
      const parsed = JSON.parse(args)
      return JSON.stringify({ echoed: parsed.message })
    }
    default:
      return JSON.stringify({ error: `unknown tool: ${name}` })
  }
}
