// Adapter factory — returns the right provider adapter based on config

import type { ProviderAdapter } from "./types.js"
import { EchoAdapter } from "./echo.js"
import { OpenAIAdapter } from "./openai.js"
import { GeminiAdapter } from "./gemini.js"

export function createAdapter(provider: string): ProviderAdapter {
  switch (provider) {
    case "echo":
      return new EchoAdapter()
    case "openai":
      return new OpenAIAdapter()
    case "gemini":
      return new GeminiAdapter()
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
