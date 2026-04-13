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

  /** Request a response from the provider */
  createResponse(): void

  /** Cancel an in-progress response */
  cancelResponse(): void

  /** Send a tool result back to the provider */
  sendToolResult(callId: string, output: string): void

  /** Clean up the upstream connection */
  disconnect(): void
}
