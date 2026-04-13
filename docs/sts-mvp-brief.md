# STS MVP Brief — Realtime Voice Mode

## Goal

Add a third voice mode — **Realtime** — alongside Vapi and Custom Pipeline. This uses speech-to-speech models (OpenAI Realtime, Gemini Live, future providers) for true STS with no separate STT/LLM/TTS chain. The mobile app connects via WebSocket to a relay server that holds API keys and routes tool calls to brain agents (Kira/Holly).

## Architecture

```
                         WebSocket
Mobile App ◄─────────────────────────► Relay Server
(Expo/RN)    PCM16 audio + events       (Express + ws)
                                              │
                                    ┌─────────┴──────────┐
                                    │   Provider Adapter  │
                                    │  ┌───────────────┐  │
                                    │  │ OpenAI Adapter │──┼──► wss://api.openai.com/v1/realtime
                                    │  │  (24kHz PCM)   │  │
                                    │  ├───────────────┤  │
                                    │  │ Gemini Adapter │──┼──► wss://generativelanguage.googleapis.com/ws/...
                                    │  │  (16kHz PCM)   │  │
                                    │  └───────────────┘  │
                                    │                     │
                                    │   Tool Router       │
                                    │  ┌───────────────┐  │
                                    │  │ OpenClaw/Kira  │──┼──► POST /voiceclaw/v1/chat/completions
                                    │  ├───────────────┤  │
                                    │  │ Hermes/Holly   │──┼──► POST http://127.0.0.1:8642/v1/chat/completions
                                    │  └───────────────┘  │
                                    └─────────────────────┘
```

## Voice Mode Selection (Mobile Settings)

```
Voice Mode:  Vapi  |  Custom Pipeline  |  Realtime
                                          ├─ Provider: OpenAI | Gemini Live
                                          ├─ Server URL: ws://localhost:8080/ws
                                          ├─ Voice: alloy / shimmer / Kore / Puck / ...
                                          └─ Brain Agent: Kira (OpenClaw) | Holly (Hermes) | None
```

## Provider Comparison

| Dimension | OpenAI Realtime | Gemini Live |
|---|---|---|
| Protocol | WebSocket + WebRTC | WebSocket only |
| Audio input | PCM16 24kHz mono | PCM16 16kHz mono |
| Audio output | PCM16 24kHz mono | PCM16 24kHz mono |
| GA Models | `gpt-realtime`, `gpt-realtime-mini` | `gemini-3.1-flash-live-preview` |
| Turn detection | Semantic VAD (default) or silence-based | Server VAD with sensitivity levels |
| Tool calling | Async (model keeps talking) | Sync (model blocks) |
| Session config | Mutable mid-session | Immutable (must reconnect) |
| Session duration | ~30 min | ~10 min (resumable) |
| Barge-in (WS) | Client must truncate | Automatic |
| Pricing (audio) | $32/$64 per M tokens (in/out) | $3/$12 per M tokens (in/out) |
| Voices | alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar | Puck, Charon, Kore, Fenrir, Aoede |

## Phases

### Phase 1: Relay Server

Scaffold `relay-server/` as an Express + ws app.

**Core:**
- WebSocket endpoint at `ws://localhost:8080/ws`
- On client connect: parse provider from initial config message
- Open upstream WebSocket to selected provider (OpenAI or Gemini)
- Bidirectional event proxying with provider-specific adapters
- API keys from env vars (`OPENAI_API_KEY`, `GEMINI_API_KEY`)

**Provider Adapter Layer:**
- `openai-adapter.ts` — translates between relay protocol and OpenAI's 28+ event types, handles explicit audio buffer model (append/commit/clear), 24kHz audio
- `gemini-adapter.ts` — translates between relay protocol and Gemini's union-field messages, handles continuous streaming model, 16kHz input / 24kHz output, session resumption on 10-min timeout

**Relay Protocol (mobile ↔ relay):**
Normalized event set that hides provider differences:

```
Client → Relay:
  session.config    { provider, voice, tools, instructions }
  audio.append      { data: base64 }
  audio.commit      {}
  response.create   {}
  response.cancel   {}
  tool.result       { callId, output }

Relay → Client:
  session.ready     { sessionId }
  audio.delta       { data: base64 }
  transcript.delta  { text, role: "user" | "assistant" }
  transcript.done   { text, role }
  tool.call         { callId, name, arguments }
  turn.started      {}
  turn.ended        {}
  error             { message, code }
```

**Tool Router:**
- Registers `ask_brain` tool with the STS provider session
- On tool call: routes to configured brain agent (OpenClaw or Hermes, both OpenAI-compatible HTTP)
- Returns result to provider to continue response

**Root scripts:** `yarn dev:server`

### Phase 2: Mobile Realtime Mode

New voice mode in the app (not a provider within custom pipeline — STS is fundamentally different from STT→LLM→TTS).

**Settings UI** (`settings.tsx`):
- Add "Realtime" to voice mode selector
- Provider picker (OpenAI / Gemini Live)
- Server URL field (default `ws://localhost:8080/ws`)
- Voice picker (provider-specific options)
- Brain agent selector (Kira / Holly / None)

**Native Audio Module:**
New `RealtimeAudioManager` (Swift) that:
- Opens mic capture at 48kHz, downsamples to 24kHz (OpenAI) or 16kHz (Gemini) per provider config
- Streams audio chunks via WebSocket as `audio.append` events
- Receives `audio.delta` events, decodes base64 → PCM16, plays through speaker
- Handles barge-in (stop playback on `turn.started` for user)
- Manages audio session (speaker/mic routing, background audio)

**JS Orchestration** (`index.tsx`):
- New `startRealtimeCall()` alongside `startVapiCall()` / `startCustomPipelineCall()`
- Connects WebSocket to relay server URL
- Sends `session.config` with provider, voice, instructions
- Listens to `transcript.delta` / `transcript.done` for chat bubble display
- Saves transcripts to SQLite for history consistency
- Handles `tool.call` events if client-side tools are needed

**Latency Tracking:**
- No separate STT/LLM/TTS latencies (it's one unified model)
- Track: time from speech end → first audio response (turn latency)
- Track: time from user stops speaking → VAD triggers response

### Phase 3: Brain Agent Tool Calling

**STS Agent Personality Bootstrap:**

The STS model needs a lightweight personality that matches the brain agent. On relay server startup or client connect:

1. Read brain agent's personality files:
   - Kira: `~/.openclaw/workspace/SOUL.md` + `IDENTITY.md` (key excerpts)
   - Holly: `~/.hermes/memories/USER.md` (key excerpts)
2. Trim to ~200 tokens of core identity: name, tone, user facts, available tools
3. Inject into session instructions for the STS model
4. Register tool: `ask_brain` — delegates complex questions to the full brain agent

**Tool Call Flow (e2e):**

```
User speaks: "What's on my calendar tomorrow?"

STS Agent (realtime model):
  → Recognizes it needs external info
  → Calls tool: ask_brain({ query: "What's on my calendar tomorrow?" })
  → [OpenAI: keeps talking "Let me check..." / Gemini: blocks silently]

Relay Server:
  → Routes to configured brain agent:
    Kira:  POST <gatewayUrl>/voiceclaw/v1/chat/completions
    Holly: POST http://127.0.0.1:8642/v1/chat/completions
    Both use: { messages: [...], stream: true }
  → Collects streamed response
  → Sends tool result back to STS provider

STS Agent:
  → Receives calendar data
  → Speaks: "You have a standup at 9 and a dentist at 2."
```

**OpenClaw/Kira Integration (HTTP — recommended for MVP):**
- Endpoint: `POST <gatewayUrl>/voiceclaw/v1/chat/completions`
- Auth: `Authorization: Bearer <authToken>`
- Session: `x-openclaw-session-key: realtime:<sessionId>`
- Format: OpenAI-compatible SSE streaming
- Config from: app settings (`openclaw_gateway_url`, `openclaw_auth_token`)

**Hermes/Holly Integration (HTTP — same pattern as Kira):**
- Hermes has a built-in OpenAI-compatible API server (gateway platform adapter)
- Endpoint: `POST http://127.0.0.1:8642/v1/chat/completions`
- Auth: `Authorization: Bearer <API_SERVER_KEY>` (optional for local)
- Session continuity: `X-Hermes-Session-Id: realtime:<sessionId>`
- Format: OpenAI-compatible SSE streaming (`"stream": true`)
- Also supports async runs: `POST /v1/runs` + `GET /v1/runs/{id}/events` (SSE)
- **Setup:** Add `API_SERVER_ENABLED=true` to `~/.hermes/.env`, then `hermes gateway restart`
- Personality source: `~/.hermes/memories/USER.md`
- Fallback CLI: `hermes chat -q "<message>" -Q` (if gateway not available)

## Future: WebRTC Upgrade (Post-MVP)

For production/cloud deployment, upgrade the OpenAI path:
- Relay generates ephemeral token (60s lifetime) via `POST /v1/realtime/sessions`
- Mobile connects directly to OpenAI via WebRTC (audio never touches relay)
- Relay becomes sidecar: tool call routing via side-channel WebSocket
- Gemini stays WebSocket-through-relay (no WebRTC support)

## Future: Additional Providers

The relay protocol is designed to be provider-agnostic. Adding a new STS provider requires:
1. New adapter file (e.g., `claude-adapter.ts`, `deepseek-adapter.ts`)
2. Implement the normalized event translation
3. Handle provider-specific quirks (sample rate, session lifecycle, etc.)
4. Add to provider picker in mobile settings

## Tech Stack

| Component | Stack |
|---|---|
| Relay server | TypeScript, Express, ws, dotenv |
| Provider adapters | TypeScript classes implementing shared interface |
| Mobile audio | Swift (RealtimeAudioManager), AVAudioEngine |
| Mobile UI/state | React Native (Expo), TypeScript |
| Brain agents | OpenClaw (HTTP), Hermes (HTTP, OpenAI-compatible) |

## Key Files to Create/Modify

**New files:**
- `relay-server/package.json`
- `relay-server/src/index.ts` — Express + ws server
- `relay-server/src/adapters/openai.ts`
- `relay-server/src/adapters/gemini.ts`
- `relay-server/src/adapters/types.ts` — shared provider interface
- `relay-server/src/tools/brain.ts` — brain agent tool router
- `mobile/modules/expo-custom-pipeline/ios/Realtime/RealtimeAudioManager.swift`
- `mobile/lib/use-realtime.ts` — JS orchestration hook

**Modified files:**
- `mobile/app/(tabs)/settings.tsx` — add Realtime voice mode + settings
- `mobile/app/(tabs)/index.tsx` — add `startRealtimeCall()` flow
- `mobile/modules/expo-custom-pipeline/ios/ExpoCustomPipelineModule.swift` — expose native realtime methods
- `package.json` — add `dev:server` script
