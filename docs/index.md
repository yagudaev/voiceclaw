---
layout: default
title: Home
nav_order: 1
---

# VoiceClaw

**Voice interface for any AI.** An open-source system that lets you talk to AI models using natural speech -- on your phone, on your Mac, or from any WebSocket client.

VoiceClaw connects to multiple AI providers (Gemini Live, OpenAI Realtime) through a unified relay server, giving you a consistent voice experience regardless of which model is on the other end.

## Key Features

- **Real-time voice conversations** -- speak naturally and hear AI responses with low latency
- **Multi-provider support** -- switch between Gemini and OpenAI models without changing client code
- **Brain agent** -- an async tool-calling agent that gives the voice AI access to web search, calendars, tasks, memory, and more
- **Screen sharing** -- share your screen on desktop so the AI can see what you see (JPEG frames at 1 FPS)
- **Session resumption** -- Gemini sessions survive network drops and transparently reconnect
- **Conversation history** -- local SQLite storage on both mobile and desktop with full transcript search
- **Observability** -- optional Langfuse tracing for latency and token usage tracking

## Components

| Component | Tech | Description |
|-----------|------|-------------|
| [Relay Server](relay-server) | TypeScript / Node.js | WebSocket relay that translates between clients and AI providers |
| [Desktop App](desktop-app) | Electron + React + Tailwind | macOS voice assistant with screen sharing |
| [Mobile App](mobile-app) | React Native / Expo | iOS voice assistant |

## Quick Start

```bash
# Clone and install
git clone https://github.com/nano3labs/voiceclaw.git
cd voiceclaw
yarn install

# Start the relay server
cd relay-server
cp .env.example .env    # add your API keys
yarn dev

# In another terminal, start the desktop app
cd desktop
yarn dev

# Or start the mobile app
cd mobile
yarn dev
```

## How It Works

At a high level:

```
+-----------+        WebSocket        +---------------+        WebSocket        +----------------+
|           |  ---session.config--->  |               |  ---provider setup--->  |                |
|  Client   |  ---audio.append----->  | Relay Server  |  ---audio stream----->  |  AI Provider   |
|  (mobile  |  <---audio.delta------  |               |  <---model audio------  |  (Gemini /     |
|   or      |  <---transcript.delta-  |  - protocol   |  <---transcription----  |   OpenAI)      |
|  desktop) |  ---frame.append----->  |    translate   |  ---video frames----->  |                |
|           |  <---tool.call--------  |  - brain agent |                        +----------------+
|           |  <---tool.progress----  |  - tracing     |
+-----------+                         +---------------+
```

The relay server sits between clients and AI providers. It normalizes the different provider protocols into a single, clean WebSocket API. Clients never talk directly to Gemini or OpenAI -- they speak the relay protocol, and the relay handles the translation.

## Learn More

- [Architecture](architecture) -- detailed system design, audio flow, and session lifecycle
- [Relay Server](relay-server) -- WebSocket protocol reference, configuration, and brain agent
- [Desktop App](desktop-app) -- building from source, screen sharing, and settings
- [Mobile App](mobile-app) -- Expo build setup and iOS-specific notes
- [Contributing](contributing) -- development setup, code style, and branch strategy
