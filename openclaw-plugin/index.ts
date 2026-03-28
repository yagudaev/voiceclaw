/**
 * OpenClaw Plugin Entry Point
 *
 * This is the main entry point for the VoiceClaw OpenClaw plugin.
 * It registers the agent channel and starts listening for incoming
 * WebSocket connections from the VoiceClaw mobile app.
 *
 * Usage:
 *   The plugin is loaded by the OpenClaw gateway and handles
 *   `req:agent` messages by forwarding them to the configured
 *   LLM provider and streaming back `event:agent` responses.
 */

import { AgentChannel } from './src/channel'

export { AgentChannel }

// Plugin registration hook — called by the OpenClaw gateway
export function register() {
  return {
    channels: {
      agent: new AgentChannel(),
    },
  }
}
