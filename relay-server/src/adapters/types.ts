// Shared provider adapter interface
// Each STS provider (OpenAI, Gemini, etc.) implements this interface

import type { SessionConfigEvent, RelayEvent } from "../types.js"
import type { HistoryMessage } from "../history.js"

export type SendToClient = (event: RelayEvent) => void

export interface AdapterCapabilities {
  /**
   * True when the adapter can hold a tool call open until the real result is
   * sent — the model truly waits on `sendToolResult` before generating its
   * next turn. False = control returns immediately and the result must be
   * threaded back through `injectContext` later.
   */
  blockingToolResponse: boolean
}

export interface ProviderAdapter {
  /** Capability flags consulted by the session dispatcher */
  readonly capabilities: AdapterCapabilities

  /** Connect to the upstream STS provider */
  connect(config: SessionConfigEvent, sendToClient: SendToClient): Promise<void>

  /** Forward audio from client to provider */
  sendAudio(data: string): void

  /** Commit the audio buffer (provider-specific) */
  commitAudio(): void

  /** Forward a video frame from client to provider */
  sendFrame(data: string, mimeType?: string): void

  /**
   * Forward a macOS Accessibility-API text snapshot from the client to the
   * provider as a sibling text input adjacent to the most recent video chunk.
   * Optional — only Gemini implements it; other adapters that don't accept
   * video should leave it undefined and the relay will simply not forward.
   */
  sendAxText?(text: string): void

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

  /**
   * Provider-specific text appended to the model's systemInstruction at setup
   * (e.g. summary of older turns + recent-turn preamble). Empty string when
   * no resume context was folded in. Used by the tracer to build a voice-turn
   * trace whose system content matches what the model actually saw.
   */
  getResumePreamble?(): string

  /**
   * Recent verbatim turns the adapter injected into the conversation as
   * separate items (not via systemInstruction). Empty array when the adapter
   * folds history entirely into the preamble (Gemini) or no history was
   * supplied.
   */
  getResumeHistory?(): HistoryMessage[]
}
