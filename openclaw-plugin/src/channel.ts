/**
 * Agent Channel Implementation
 *
 * Handles bidirectional communication between the VoiceClaw app
 * and the LLM provider through the OpenClaw gateway.
 *
 * Protocol:
 *   Incoming (from app):
 *     { type: "req:agent", data: { model, messages, stream, session_key } }
 *
 *   Outgoing (to app):
 *     { type: "event:agent", data: { delta: "...", done: false } }  // streaming token
 *     { type: "event:agent", data: { done: true } }                 // stream complete
 *     { type: "error", data: { message: "..." } }                   // error
 *
 * NOTE: This is a scaffold. The actual LLM provider integration
 * (e.g. calling OpenAI, Anthropic, or a local model) should be
 * implemented in the `handleAgentRequest` method below.
 */

type AgentRequest = {
  model: string
  messages: Array<{ role: string, content: string }>
  stream: boolean
  session_key: string
}

type SendFn = (message: string) => void

export class AgentChannel {
  private send: SendFn | null = null

  /**
   * Called by the gateway when a client connects to this channel.
   */
  onConnect(send: SendFn) {
    this.send = send
    console.log('[AgentChannel] Client connected')
  }

  /**
   * Called by the gateway when a message arrives on this channel.
   */
  onMessage(raw: string) {
    try {
      const msg = JSON.parse(raw)

      if (msg.type === 'req:agent') {
        this.handleAgentRequest(msg.data)
      }
    } catch (err) {
      this.sendError('Failed to parse message')
    }
  }

  /**
   * Called by the gateway when the client disconnects.
   */
  onDisconnect() {
    this.send = null
    console.log('[AgentChannel] Client disconnected')
  }

  // --- Internal helpers ---

  private async handleAgentRequest(data: AgentRequest) {
    if (!this.send) return

    try {
      // TODO: Replace this stub with actual LLM provider call.
      // For now, echo back a placeholder response to verify
      // the WebSocket round-trip works end-to-end.
      const placeholder = `[Plugin] Received ${data.messages.length} messages for model "${data.model}". LLM provider integration is not yet implemented in this scaffold.`

      if (data.stream) {
        // Simulate streaming by sending the response in chunks
        const words = placeholder.split(' ')
        for (let i = 0; i < words.length; i++) {
          const delta = (i > 0 ? ' ' : '') + words[i]
          this.sendEvent({ delta, done: false })
          // In production, tokens arrive as the LLM generates them
        }
        this.sendEvent({ done: true })
      } else {
        this.sendEvent({ delta: placeholder, done: true })
      }
    } catch (err: any) {
      this.sendError(err.message || 'Agent request failed')
    }
  }

  private sendEvent(data: Record<string, unknown>) {
    if (!this.send) return
    this.send(JSON.stringify({ type: 'event:agent', data }))
  }

  private sendError(message: string) {
    if (!this.send) return
    this.send(JSON.stringify({ type: 'error', data: { message } }))
  }
}
