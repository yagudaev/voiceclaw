---
layout: default
title: Architecture
nav_order: 2
---

# Architecture

VoiceClaw is a three-tier system: clients (mobile/desktop) talk to a relay server over WebSocket, and the relay server talks to AI providers (Gemini Live, OpenAI Realtime) over their native WebSocket APIs.

## System Overview

```
+------------------+
|   Mobile App     |   React Native / Expo
|   (iOS)          |   Native audio I/O via system audio route
+--------+---------+
         |
         | WebSocket (relay protocol)
         | ws://<relay>:8080/ws
         |
+--------+---------+
|   Relay Server   |   TypeScript / Node.js
|                  |
|   - Session mgmt |   One RelaySession per WebSocket connection
|   - Adapter      |   Provider-specific protocol translation
|   - Brain agent  |   Async tool calls via OpenClaw gateway
|   - Tracing      |   Langfuse OTEL integration
+--------+---------+
         |
         | Provider WebSocket
         | (Gemini BidiGenerateContent / OpenAI Realtime)
         |
+--------+---------+
|   AI Provider    |   Gemini Live or OpenAI Realtime API
|                  |   Voice activity detection (VAD)
|                  |   Speech-to-text + text-to-speech
+------------------+

+------------------+
|   Desktop App    |   Electron + React + Tailwind
|   (macOS)        |   Web Audio API for capture/playback
|   + screen share |   desktopCapturer for screen frames
+--------+---------+
         |
         | WebSocket (same relay protocol)
         |
         +-------> Relay Server (same as above)
```

## Audio Flow

All audio travels as **PCM16 at 24kHz**, base64-encoded over WebSocket JSON messages.

### Client to Provider

1. Client captures microphone audio (24kHz PCM16, mono)
2. Client sends `audio.append` messages with base64 data
3. Relay forwards to provider:
   - **Gemini**: downsampled to 16kHz (Gemini requires 16kHz), sent as `realtimeInput.audio`
   - **OpenAI**: forwarded at 24kHz as `input_audio_buffer.append`
4. Provider runs voice activity detection (VAD) to determine speech boundaries

### Provider to Client

1. Provider generates speech audio
2. Relay receives audio and sends `audio.delta` messages to client
3. Client decodes base64 PCM16 and plays through speakers
4. On barge-in (user starts talking), client receives `turn.started` and stops playback

```
Mic -> PCM16 24kHz -> base64 -> audio.append -> [Relay] -> provider format -> [AI]
                                                                                |
[Speakers] <- PCM16 decode <- base64 <- audio.delta <- [Relay] <- model audio <-+
```

## Video / Screen Sharing Flow

The desktop app can share screen content with the AI (Gemini only -- OpenAI Realtime does not support video input).

1. User picks a screen source via Electron's `desktopCapturer`
2. `ScreenCapture` grabs frames at **1 FPS**
3. Frames are resized to fit within 768px (preserving aspect ratio)
4. Exported as JPEG at 70% quality, base64 encoded
5. Sent as `frame.append` messages over the relay protocol
6. Relay forwards to Gemini as `realtimeInput.video`

Screen frames do not reset the watchdog timer -- only audio activity counts as user presence.

## Session Lifecycle

### Connection

1. Client opens WebSocket to `ws://<relay>:8080/ws`
2. Client sends `session.config` with provider, model, voice, API key, and options
3. Relay validates the API key against `RELAY_API_KEY`
4. Relay creates a provider adapter (Gemini or OpenAI) and connects upstream
5. Relay sends `session.ready` back to client

### Conversation

1. Client streams audio via `audio.append`
2. Provider detects speech and generates responses
3. Relay forwards audio (`audio.delta`), transcripts (`transcript.delta`/`transcript.done`), and turn signals (`turn.started`/`turn.ended`)
4. If the AI calls a tool, relay sends `tool.call` to client (or handles it server-side for `echo_tool` and `ask_brain`)

### Session Rotation

Long-running sessions need periodic rotation to avoid provider timeouts:

- **Gemini**: uses session resumption handles. On `goAway`, the relay reconnects with the stored handle. The conversation continues transparently. Audio and control messages are queued during reconnect.
- **OpenAI**: uses timer-based rotation (default 50 minutes). The relay summarizes the transcript, closes the old connection, opens a new one with the summary injected into instructions.

Both emit `session.rotating` / `session.rotated` so clients can handle the transition (clear audio buffers, show status).

### Disconnection

1. Client closes WebSocket (or connection drops)
2. Relay session cleanup runs:
   - Aborts all in-flight tool calls
   - Ends the Langfuse tracing session
   - Syncs conversation transcript to the brain agent for long-term memory
   - Disconnects the provider adapter

## Brain Agent

The brain agent gives the voice AI capabilities beyond conversation -- web search, calendar, tasks, memory, and more. It runs as an async background process.

```
[AI Model] -- tool call: ask_brain --> [Relay Session]
                                           |
                                           | 1. Immediately return "searching" to unblock AI
                                           | 2. POST /v1/chat/completions to OpenClaw gateway
                                           |
                                           v
                                    [OpenClaw Gateway]
                                           |
                                           | SSE streaming response
                                           | (step_complete events for progress)
                                           |
                                           v
                                    [Relay Session]
                                           |
                                           | injectContext() -- feeds result back to AI
                                           v
                                    [AI speaks the answer]
```

Key design decisions:
- The initial `ask_brain` tool result is returned immediately with `{"status": "searching"}` so the AI can say something like "Let me check on that..." while the brain works
- Progress events (`tool.progress`) stream to the client for live UI updates
- The final result is injected back via `injectContext()` rather than as a tool result, because the AI has already moved past the tool call
- Brain calls are cancellable -- if the AI model cancels the tool call (e.g., user changed topic), the in-flight HTTP request is aborted
- On session disconnect, the full transcript is synced to the brain with retry logic so the agent remembers the conversation

## Tracing

The relay server integrates with [Langfuse](https://langfuse.com) via OpenTelemetry for observability:

- Each session is a Langfuse trace
- Each conversation turn is a generation span with token/audio usage
- Tool calls are nested spans within turns
- Client timing events (`client.timing`) attach latency metrics (e.g., time to first audio)
- Usage metrics from providers are forwarded to Langfuse for cost tracking
