# VoiceClaw Relay Server

WebSocket relay that bridges mobile clients to the OpenAI Realtime API and OpenClaw brain agent.

## Setup

1. Copy `.env.example` to `.env` and fill in your keys
2. Enable the OpenClaw gateway completions endpoint (required for brain agent):
   - In `~/.openclaw/openclaw.json`, add under the `gateway` key:
     ```json
     "http": {
       "endpoints": {
         "chatCompletions": { "enabled": true }
       }
     }
     ```
   - Restart the gateway
3. `yarn install && yarn dev`

## Architecture

```
Mobile App ──WebSocket──▶ Relay Server ──WebSocket──▶ OpenAI Realtime API
                              │
                              └──HTTP──▶ OpenClaw Gateway (/v1/chat/completions)
                                         (brain agent queries)
```

The relay handles:
- OpenAI Realtime session management and rotation (50 min cycles)
- Server-side tool execution (brain agent)
- Watchdog for stale connections
- Audio passthrough (PCM16 24kHz)
