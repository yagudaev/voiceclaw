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

## Tracing (optional)

The relay can emit per-turn traces to [Langfuse](https://langfuse.com) so you
can measure latency, inspect prompts/responses, and attribute token/audio
cost per voice turn.

Tracing is **off by default**. Set the keys in `.env` to enable:

```
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com   # or EU / self-hosted
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

When configured, each WebSocket connection maps to a Langfuse **session**
and each voice turn is a **generation** span. Server-side tool calls
(e.g. `ask_brain`) nest as tool spans; they may span multiple turns
since async tools typically resolve on the next turn.

Mobile devices can also post latency measurements via `client.timing`
events (e.g. `ttft_audio`, turn.started → first TTS byte). Mobile
emission is gated behind `EXPO_PUBLIC_ENABLE_TRACING=1` so release
builds ship with no telemetry unless explicitly enabled.
