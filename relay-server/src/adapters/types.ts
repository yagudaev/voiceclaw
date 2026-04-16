// Shared provider adapter interface
// Each STS provider (OpenAI, Gemini, etc.) implements this interface

import type { SessionConfigEvent, RelayEvent } from "../types.js"

export type SendToClient = (event: RelayEvent) => void

export interface ProviderAdapter {
  /** Connect to the upstream STS provider */
  connect(config: SessionConfigEvent, sendToClient: SendToClient): Promise<void>

  /** Forward audio from client to provider */
  sendAudio(data: string): void

  /** Commit the audio buffer (provider-specific) */
  commitAudio(): void

  /** Forward a video frame from client to provider */
  sendFrame(data: string, mimeType?: string): void

  /** Request a response from the provider */
  createResponse(): void

  /** Cancel an in-progress response */
  cancelResponse(): void

  /** Send a tool result back to the provider */
  sendToolResult(callId: string, output: string): void

  /** Inject context into the conversation (e.g. async tool results) */
  injectContext(text: string): void

  /** Get the conversation transcript so far */
  getTranscript(): { role: "user" | "assistant", text: string }[]

  /** Clean up the upstream connection */
  disconnect(): void
}
