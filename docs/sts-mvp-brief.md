# STS MVP Brief — Realtime Voice Mode

## Goal

Add a third voice mode — **Realtime** — alongside Vapi and Custom Pipeline. This uses speech-to-speech models (OpenAI Realtime, Gemini Live, future providers) for true STS with no separate STT/LLM/TTS chain. The mobile app connects via WebSocket to a relay server that holds API keys and routes tool calls to brain agents (Kira/Holly).

Sessions can be **long-running** — a user might brainstorm for hours while walking or work through a series of tasks with their agent. There is no artificial time limit; sessions run until the user ends them. Transparent session rotation, background audio, and network resilience are first-class concerns.

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
| Session duration | ~60 min (no resume) | ~10 min (resumable) |
| Barge-in (WS) | Client must truncate | Automatic |
| Pricing: full (audio) | $32/$64 per M tokens (in/out) | $3/$12 per M tokens (in/out) |
| Pricing: mini (audio) | $10/$20 per M tokens (in/out) | — |
| Voices | alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar | Puck, Charon, Kore, Fenrir, Aoede |

## Conversation Design

These rules are injected into the STS model's system prompt. They govern how the voice agent behaves in conversation. Adapted from [gbrain](https://github.com/garrytan/gbrain/blob/master/recipes/twilio-voice-brain.md).

**Identity (top of prompt, before everything else):**
- The voice agent IS the brain agent (Kira), just in voice mode — not a separate character
- Mini-identity only: name, tone, key user facts (~200 tokens). The full personality lives in the brain.
- Do NOT say "I'm an AI assistant" or reference being a model

**Conversation timing (critical — prevents talking over the user):**
- User talking or thinking: SHUT UP. Even 3-5 second pauses mid-thought — wait.
- Incomplete sentence or mid-story = still thinking. Do not interrupt.
- User done (complete thought + 2-3 second silence): NOW respond.
- Question directed at you: respond immediately.
- Hard rule: never let silence go past 5 seconds after a COMPLETE thought.

**Tool call bridges:**
- When calling `ask_brain`, say a brief verbal bridge: "One sec, let me check..." or "Looking that up..."
- Keep it short — don't try to fill the entire wait with filler.
- When the result comes back, speak it naturally — don't prefix with "According to my brain agent..."

**Proactive engagement:**
- Don't ask "anything else?" — instead, bring up the next relevant topic from context.
- If the user shared something important, acknowledge it: "Got it, I'll remember that."

**General rules:**
- Never repeat yourself. If you already said something, move on.
- Never hang up or wrap up. Only the user decides when the session ends.
- Keep responses concise for voice — what reads well as text is too long spoken aloud.
- No emoji, no markdown, no formatting — this is speech.

## Phases

MVP scope: **OpenAI Realtime only** (using `gpt-realtime-mini`). Gemini Live adapter is scaffolded but not implemented — it will be a separate ticket in a future phase.

### Phase 1: Relay Server + Echo Test

Scaffold `relay-server/` as a TypeScript Express + ws app.

**1a. Bare server + WebSocket echo + auth**
- Express server with `ws` WebSocket endpoint at `ws://localhost:8080/ws`
- On `session.config`: validate `openclawAuthToken` against `openclawGatewayUrl/voiceclaw/health`
- If auth fails → send `error { message: "unauthorized", code: 401 }`, close connection
- If auth passes → reply with `session.ready`, proceed
- Echo back any `audio.append` as `audio.delta` (loopback)
- API keys from env vars (`OPENAI_API_KEY`)
- `yarn dev:server` script in root package.json

> **Test checkpoint (self):** Write a small Node script that connects to `ws://localhost:8080/ws`:
> - Send `session.config` with valid OpenClaw token → assert `session.ready` comes back and audio frames echo.
> - Send `session.config` with invalid token → assert `error` with code 401 and connection closes.
> - Send `session.config` with no token → assert immediate rejection.

**1b. OpenAI Realtime adapter**
- `openai-adapter.ts` — translates between relay protocol and OpenAI's event types
- Handles explicit audio buffer model (append/commit/clear), 24kHz PCM16 audio
- On `session.config`: open upstream WebSocket to `wss://api.openai.com/v1/realtime`, configure session (model, voice, VAD, instructions)
- Bidirectional event proxying: client audio → OpenAI `input_audio_buffer.append`, OpenAI `response.audio.delta` → client `audio.delta`
- Map OpenAI transcript events to relay `transcript.delta` / `transcript.done`
- Scaffold `gemini-adapter.ts` with the provider interface but no implementation (throws "not implemented")
- Shared adapter interface in `adapters/types.ts`

> **Test checkpoint (self):** Connect via script, send `session.config` with provider "openai", verify upstream WebSocket opens to OpenAI, `session.ready` returns, and `audio.delta` / `transcript.delta` events flow back. Can verify event flow and non-empty audio buffers programmatically.

**1c. Tool router (no brain agent yet)**
- Register a test tool `echo_tool` that returns a canned response
- Handle OpenAI `response.function_call_arguments.done` events
- Send tool results back via `conversation.item.create` with type `function_call_output`

> **Test checkpoint (self):** Send a text message via the relay protocol that triggers the tool call (e.g., inject a user message "test the tools"). Verify the relay receives the `function_call_arguments.done` event from OpenAI, calls `echo_tool`, and sends the result back. Assert the full round-trip completes in logs.

**Authentication:**

The relay has no auth system of its own — OpenClaw is the identity provider. On connect:

1. Client sends `session.config` with `openclawGatewayUrl` + `openclawAuthToken`
2. Relay validates by calling `GET <gatewayUrl>/voiceclaw/health` with the token
3. 200 → valid user, session proceeds. 401 → relay sends `error { message: "unauthorized", code: 401 }` and closes.
4. No token → reject immediately.

This means the `OPENAI_API_KEY` on the relay is only accessible to authenticated OpenClaw users. The relay env only needs `OPENAI_API_KEY` — no separate relay secret or user database.

The OpenClaw credentials from `session.config` are also reused for `ask_brain` tool calls, so the relay acts as a pass-through for brain agent auth.

**Relay Protocol (mobile ↔ relay):**
Normalized event set that hides provider differences. All messages are JSON with a `type` field.

```
Client → Relay:
  session.config    { provider, voice, brainAgent,
                      openclawGatewayUrl, openclawAuthToken,
                      deviceContext?, instructionsOverride? }
                    // provider: "openai" (MVP) | "gemini" (future)
                    // voice: "alloy" | "shimmer" | ...
                    // brainAgent: "kira" | "none"
                    // openclawGatewayUrl: "http://your-mac.local:8080"
                    // openclawAuthToken: bearer token for OpenClaw
                    // deviceContext: { timezone, locale, deviceModel, location? }
                    // instructionsOverride: optional extra context or personality tweaks
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
  tool.progress     { callId, summary }    // step completed in multi-step brain agent chain
  turn.started      {}
  turn.ended        {}
  session.ended     { summary, durationSec, turnCount }
  session.rotating  {}                     // Phase 4: upstream session rotation starting
  session.rotated   { sessionId }          // Phase 4: new upstream session established
  error             { message, code }
```

### Phase 2: Mobile Realtime Mode

New voice mode in the app (not a provider within custom pipeline — STS is fundamentally different from STT→LLM→TTS).

**2a. Settings UI + WebSocket connection**
- Add "Realtime" to voice mode selector in `settings.tsx`
- Server URL field (default `ws://localhost:8080/ws`)
- Voice picker (OpenAI voices: alloy, shimmer, echo, etc.)
- Brain agent selector (Kira / None — Holly added later)
- JS hook `useRealtime()` that opens WebSocket, sends `session.config`, handles `session.ready`

> **Test checkpoint (self — device):** Build and deploy to device. Open settings, select Realtime mode, tap start. Verify no crash, relay server logs show WebSocket connection and `session.config` received. Confirm `session.ready` comes back. No audio testing — just connection lifecycle.
>
> **Test checkpoint (self):** Use Playwright MCP to verify settings UI renders the new Realtime mode options correctly.

**2b. Native audio streaming**
- New Expo module `expo-realtime-audio` (separate from `expo-custom-pipeline` — STS audio shares nothing with the STT/TTS pipeline)
- `RealtimeAudioManager` (Swift) that:
  - Opens mic capture at 48kHz, downsamples to 24kHz for OpenAI
  - Streams audio chunks via WebSocket as `audio.append` events
  - Receives `audio.delta` events, decodes base64 → PCM16, plays through speaker
  - Handles barge-in (stop playback on `turn.started` for user)
  - Manages audio session (speaker/mic routing, background audio)
  - Maintains connection during background mode / screen lock (iOS background audio entitlement)
  - Handles cellular/wifi handoffs without dropping the session

> **Test checkpoint (self — device):** Build and deploy to device. Start a realtime session, verify relay logs show `audio.append` events arriving from mobile and `audio.delta` events being sent back. Confirm `transcript.delta` / `transcript.done` events flow. Can verify the full data pipeline without listening to audio.

**2c. Transcript display + history**
- Listen to `transcript.delta` / `transcript.done` for chat bubble display
- Save transcripts incrementally to SQLite as they arrive (for app UI and crash resilience)
- Latency tracking: time from speech end → first audio response

> **Test checkpoint (self — device):** After a session, query SQLite database on device to verify transcripts were persisted with correct roles and timestamps. Can also verify chat history UI renders transcript bubbles by navigating to the history screen.

### Phase 3: Brain Agent Tool Calling

**3a. Brain agent integration**
- Replace `echo_tool` with `ask_brain` tool
- Tool router sends query to configured brain agent via OpenAI-compatible HTTP
- Stream SSE response from brain agent, parse step completions, return final result to STS provider

**Live progress injection for multi-step tasks:**

Brain agents often execute multi-step chains (e.g., "Create a calendar event, look up Linear tickets, compose an agenda, send it to the team"). Rather than silence until completion, the relay injects progress into the conversation as it happens:

```
User speaks: "Set up a product planning meeting, pull relevant tickets and send an agenda"

STS Model → calls ask_brain({ query: "..." })
STS Model → keeps talking: "On it, let me get that set up..."

Relay → streams SSE from brain agent
  Brain completes step 1: calendar event created
  Relay → injects conversation.item.create (system: "Progress: calendar event created for Thu 2pm")
  Relay → triggers response.create
  STS Model → speaks: "Got the meeting on your calendar for Thursday at 2..."

  Brain completes step 2: Linear tickets fetched
  Relay → injects progress: "Found 4 relevant tickets in the INGEST project"
  STS Model → speaks: "Found some tickets, putting the agenda together now..."

  Brain completes step 3: agenda sent
  Relay → sends final tool result with full summary
  STS Model → speaks: "All done — agenda's been sent to the team."
```

This requires brain agents to signal step completions in their SSE stream. Convention: a streamed chunk containing a JSON object with `"type": "step_complete"` and a `summary` field.

**OpenClaw/Kira Integration (MVP):**
- Endpoint: `POST <gatewayUrl>/voiceclaw/v1/chat/completions`
- Auth: `Authorization: Bearer <authToken>`
- Session: `x-openclaw-session-key: realtime:<sessionId>`
- Format: OpenAI-compatible SSE streaming
- Config from: app settings (`openclaw_gateway_url`, `openclaw_auth_token`)

**Hermes/Holly Integration (future — separate ticket):**
- Same OpenAI-compatible HTTP pattern as Kira
- Endpoint: `POST http://127.0.0.1:8642/v1/chat/completions`
- Setup: `./agent/hermes/setup.sh`
- See `agent/hermes/` for details

> **Test checkpoint (self):** Send a test query directly to the relay via script (bypassing mobile) that should trigger `ask_brain`. Verify: relay logs show the tool call, HTTP request to OpenClaw gateway fires, SSE response streams back, tool result is sent to OpenAI. Assert the full chain completes and measure round-trip time.
>
> **Test checkpoint (self — device):** Start a session on device, trigger a brain agent query via the UI. Verify relay logs show the full tool call chain: `ask_brain` fired → HTTP to OpenClaw → SSE response → tool result back to OpenAI → `transcript.done` with the answer. Can verify the plumbing without hearing audio.

**3b. Personality bootstrap + conversation UX**
- Read brain agent's personality files (trimmed to ~200 tokens)
- Inject mini-identity into session instructions
- Add conversation timing rules from the Conversation Design section above
- Verbal bridges during tool calls ("one sec, let me check...")

> **Test checkpoint (self):** Verify the personality file is read and injected into the OpenAI session config. Log the full system prompt and check token count is within budget (~200 tokens for identity).

**3c. Post-session brain debrief**

The brain agent only sees what comes through `ask_brain` tool calls during the session. Everything else — brainstorming, decisions, ideas, personal updates — lives only in the transcript. At session end, send a debrief to the brain so it can absorb the full context.

Flow:
1. Session ends (user taps stop, or session drops)
2. Relay sends the full transcript to the brain agent with a debrief prompt:
   `"Here is the transcript from a voice session. Extract and remember: key decisions, action items, ideas, personal updates, and anything else worth retaining. Do not repeat things you already know."`
3. Brain agent processes it — saves to its memory, creates tasks, etc.
4. Relay sends `session.ended` event to mobile with a short summary for the chat history

This is fire-and-forget from the user's perspective — the session ends immediately, the debrief happens in the background. The brain gets smarter after every voice session even if the user never explicitly asked it anything.

> **Test checkpoint (self):** End a session via script. Verify relay sends the transcript to the brain agent HTTP endpoint. Check brain agent logs to confirm it received and processed the debrief. Verify `session.ended` event is sent to client with a summary.

### Phase 4: Session Continuity (long-running sessions)

- Track full transcript (user + assistant turns) as text throughout the session
- At ~50 min: summarize transcript, open new upstream OpenAI session, inject summary into instructions, swap connections seamlessly
- Client should never notice the rotation — no audio gap, no reconnect on their end
- OpenAI has no resume mechanism — relay must reconstruct context from transcript summary
- On network interruption (e.g. cellular handoff): relay holds state, client reconnects to same relay session, relay re-attaches or opens fresh upstream
- Stuck watchdog: 20-second timer, if no audio out inject "you still there?" and force `response.create`

> **Test checkpoint (self):** Override the rotation timer to 2 minutes for testing. Connect via script, have a scripted conversation, verify: rotation fires, new upstream session opens, transcript summary is injected, `session.rotated` event sent to client. Assert no errors in logs and the new session accepts audio.
>
> **Test checkpoint (self):** Simulate the stuck watchdog — connect and send no audio for 25 seconds. Verify the relay injects "you still there?" and forces a response.

### End-to-End Human Test Session

All audio/UX testing consolidated here. Run this once all phases are built and self-tested. Estimated time: ~90 minutes (including the session rotation wait).

**Setup:**
- Relay server running locally (`yarn dev:server`)
- App built and deployed to device
- OpenClaw gateway accessible
- AirPods nearby for audio routing test

**Test 1: Basic voice conversation (~5 min)**
- [ ] Start a Realtime session from the app
- [ ] Say hello — do you hear a response?
- [ ] Is the audio clear? Any crackling, latency, or artifacts?
- [ ] Have a 3-4 turn back-and-forth — does it feel like a conversation?
- [ ] Is the voice the one you selected in settings?

**Test 2: Conversation timing (~5 min)**
- [ ] Pause mid-thought for 3-5 seconds — does the model wait or interrupt?
- [ ] Finish a thought and stay silent for 2-3 seconds — does it respond?
- [ ] Ask a question and immediately keep talking — does it let you finish?
- [ ] Does it feel like talking to a person or a robot?

**Test 3: Barge-in (~2 min)**
- [ ] Let the model give a long answer
- [ ] Interrupt mid-sentence — does it stop talking immediately?
- [ ] Does it acknowledge your interruption and respond to what you said?

**Test 4: Tool calling / brain agent (~10 min)**
- [ ] Ask "What's on my calendar?" — does it call `ask_brain`?
- [ ] Do you hear a verbal bridge ("let me check...")?
- [ ] Does the answer come back and get spoken naturally?
- [ ] Ask a question that requires multiple steps (e.g., "look up my open tickets and summarize them")
- [ ] Are progress updates narrated as steps complete?
- [ ] Ask something the STS model should know without the brain — does it answer directly without a tool call?

**Test 5: Personality (~5 min)**
- [ ] Does the voice feel like Kira (same personality as text chat)?
- [ ] Is the tone appropriate — not too formal, not too casual?
- [ ] Does it know your name and basic context from the personality bootstrap?

**Test 6: Audio routing (~5 min)**
- [ ] Switch from speaker to AirPods mid-session — does audio route?
- [ ] Switch back to speaker — does it work?
- [ ] Lock the screen — does audio continue?
- [ ] Unlock — is the session still active?

**Test 7: Transcript + brain debrief (~5 min)**
- [ ] During the session, mention something new that Kira doesn't know (e.g., "I decided to push the launch to next month")
- [ ] End the session
- [ ] Open chat history — is the transcript there? Does it match what was said?
- [ ] Close and reopen the app — does history persist?
- [ ] Start a new **text** chat with Kira — does she know about the thing you mentioned in voice? (proves the debrief worked)

**Test 8: Session rotation (~60 min, or use 2-min override)**
- [ ] Start a session with rotation timer set to 2 minutes
- [ ] Talk for 3+ minutes so at least one rotation happens
- [ ] Was there an audio gap during rotation?
- [ ] After rotation, ask about something from before the rotation — does it remember?
- [ ] If time allows: run a full 50+ min session and test real rotation

**Test 9: Error resilience (~5 min)**
- [ ] Turn off wifi briefly — does the session recover?
- [ ] Kill the relay server — does the app show a clear error?
- [ ] Restart relay — can you reconnect?

## Future Work

**Gemini Live adapter** — the adapter interface is scaffolded but not implemented. Separate ticket. Key differences: 16kHz input, 10-min session limit with resumption tokens, sync tool calls (model blocks), continuous audio billing including silence.

**WebRTC upgrade** — for production/cloud deployment, upgrade the OpenAI path:
- Relay generates ephemeral token (60s lifetime) via `POST /v1/realtime/sessions`
- Mobile connects directly to OpenAI via WebRTC (audio never touches relay)
- Relay becomes sidecar: tool call routing via side-channel WebSocket

**Additional providers** — the relay protocol is provider-agnostic. Adding a new STS provider requires:
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
- `relay-server/src/adapters/openai.ts` — OpenAI Realtime adapter (MVP)
- `relay-server/src/adapters/gemini.ts` — scaffolded, throws "not implemented"
- `relay-server/src/adapters/types.ts` — shared provider interface
- `relay-server/src/tools/brain.ts` — brain agent tool router
- `mobile/modules/expo-realtime-audio/ios/RealtimeAudioManager.swift`
- `mobile/modules/expo-realtime-audio/ios/ExpoRealtimeAudioModule.swift`
- `mobile/lib/use-realtime.ts` — JS orchestration hook

**Modified files:**
- `mobile/app/(tabs)/settings.tsx` — add Realtime voice mode + settings
- `mobile/app/(tabs)/index.tsx` — add `startRealtimeCall()` flow
- `mobile/modules/expo-realtime-audio/` — new Expo module (does NOT modify expo-custom-pipeline)
- `package.json` — add `relay-server` to workspaces array, add `dev:server` script
