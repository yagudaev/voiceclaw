// Gemini Live adapter — scaffolded, not implemented
// Will be built in a separate ticket

import type { SessionConfigEvent } from "../types.js"
import type { ProviderAdapter, SendToClient } from "./types.js"

export class GeminiAdapter implements ProviderAdapter {
  async connect(_config: SessionConfigEvent, _sendToClient: SendToClient): Promise<void> {
    throw new Error("Gemini Live adapter is not implemented yet")
  }

  sendAudio(_data: string) {
    throw new Error("Gemini Live adapter is not implemented yet")
  }

  commitAudio() {
    throw new Error("Gemini Live adapter is not implemented yet")
  }

  createResponse() {
    throw new Error("Gemini Live adapter is not implemented yet")
  }

  cancelResponse() {
    throw new Error("Gemini Live adapter is not implemented yet")
  }

  sendToolResult(_callId: string, _output: string) {
    throw new Error("Gemini Live adapter is not implemented yet")
  }

  disconnect() {
    // no-op
  }
}
