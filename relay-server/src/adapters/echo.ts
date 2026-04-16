// Echo adapter — loopback for testing
// Echoes audio.append back as audio.delta, no upstream connection

import type { SessionConfigEvent } from "../types.js"
import type { ProviderAdapter, SendToClient } from "./types.js"

export class EchoAdapter implements ProviderAdapter {
  private sendToClient: SendToClient | null = null

  async connect(_config: SessionConfigEvent, sendToClient: SendToClient) {
    this.sendToClient = sendToClient
  }

  sendAudio(data: string) {
    this.sendToClient?.({ type: "audio.delta", data })
  }

  sendFrame(_data: string, _mimeType?: string) {
    // no-op for echo
  }

  injectContext(_text: string) {
    // no-op for echo
  }

  commitAudio() {
    // no-op for echo
  }

  createResponse() {
    // no-op for echo
  }

  cancelResponse() {
    // no-op for echo
  }

  sendToolResult(_callId: string, _output: string) {
    // no-op for echo
  }

  getTranscript() {
    return []
  }

  disconnect() {
    this.sendToClient = null
  }
}
