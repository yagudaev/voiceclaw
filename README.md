# VoiceClaw

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS-000000?logo=apple&logoColor=white)]()
[![Platform: iOS](https://img.shields.io/badge/Platform-iOS-000000?logo=apple&logoColor=white)]()
[![Gemini Live](https://img.shields.io/badge/Gemini-Live_API-4285F4?logo=google&logoColor=white)]()
[![OpenAI Realtime](https://img.shields.io/badge/OpenAI-Realtime_API-412991?logo=openai&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](relay-server/Dockerfile)

Open-source voice AI assistant. Talk to any AI model in real time from your phone or desktop.

VoiceClaw connects mobile and desktop clients to AI providers (Gemini Live, OpenAI Realtime) through a WebSocket relay server. The relay handles authentication, provider switching, tool execution, and session tracing -- so clients stay thin and provider-agnostic.

## Architecture

```
+------------------+        WebSocket         +----------------+        Streaming API       +------------------+
|                  | -----------------------> |                | -----------------------> |                  |
|   Mobile App     |    audio + events        |  Relay Server  |    audio + events        |   AI Provider    |
|   (Expo / iOS)   | <----------------------- |  (Node.js)     | <----------------------- |   (Gemini Live   |
|                  |                          |                |                          |    or OpenAI     |
+------------------+                          |   +----------+ |                          |    Realtime)     |
                                              |   |  Brain   | |                          +------------------+
+------------------+                          |   |  Agent   | |
|                  | -----------------------> |   +----------+ |
|   Desktop App    |    audio + events        |                |
|   (Electron)     | <----------------------- +----------------+
|                  |
+------------------+
```

**Mobile app** -- React Native / Expo iOS app with voice capture and playback.
**Desktop app** -- Electron + React + Tailwind macOS app with screen sharing support.
**Relay server** -- TypeScript / Node.js WebSocket server that brokers sessions between clients and AI providers. Includes a "brain agent" for async tool calls (web search, calculations, etc.).

## Quick Start

### Prerequisites

- Node.js 20+
- yarn

### 1. Clone the repo

```bash
git clone https://github.com/yagudaev/voiceclaw.git
cd voiceclaw
yarn install
```

### 2. Start the relay server

```bash
cd relay-server
cp .env.example .env
# Edit .env and add your API keys (see Configuration below)
yarn dev
```

The server starts on `http://localhost:8080` with a test page at `/test`.

### 3. Start the desktop app

```bash
cd desktop
yarn dev
```

### 4. Start the mobile app

```bash
cd mobile
yarn dev
```

Or use the root workspace scripts:

```bash
yarn dev:server     # relay server only
yarn dev:desktop    # desktop app only
yarn dev:mobile     # mobile app only
yarn dev            # mobile + web + server together
```

## Configuration

The relay server reads these environment variables from `relay-server/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (for OpenAI provider) | OpenAI API key for Realtime API |
| `GEMINI_API_KEY` | Yes (for Gemini provider) | Google Gemini API key for Live API |
| `RELAY_API_KEY` | Recommended | API key clients must send to connect. Generate with `openssl rand -hex 24` |
| `OPENCLAW_GATEWAY_AUTH_TOKEN` | Optional | Auth token for the brain agent (OpenClaw gateway) |
| `OPENCLAW_GATEWAY_URL` | Optional | Brain agent gateway URL (default: `http://localhost:18789`) |
| `PORT` | Optional | Server port (default: `8080`) |
| `LANGFUSE_PUBLIC_KEY` | Optional | Langfuse tracing public key |
| `LANGFUSE_SECRET_KEY` | Optional | Langfuse tracing secret key |
| `LANGFUSE_BASE_URL` | Optional | Langfuse endpoint (default: `https://cloud.langfuse.com`) |

You need at least one provider key (`OPENAI_API_KEY` or `GEMINI_API_KEY`) for the relay to be useful.

## Project Structure

```
voiceclaw/
  mobile/           React Native (Expo) iOS app
  desktop/          Electron + React + Tailwind macOS app
  relay-server/     TypeScript WebSocket relay server
  website/          Next.js marketing site
  agent/            Agent plugins and configuration
  package.json      Yarn workspaces root
```

## Contributing

1. Fork the repo and create a feature branch
2. Make your changes
3. Open a pull request against `main`

Please keep PRs focused -- one feature or fix per PR.

## License

[MIT](LICENSE)
