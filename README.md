# VoiceClaw

Voice interface for any AI. Monorepo containing the mobile app, marketing website, realtime server, agent configs, and desktop app.

## Structure

```
mobile/           - React Native (Expo) iOS/Android app
website/          - Next.js marketing site
relay-server/     - TypeScript relay server for STS providers
agent/            - Hermes & OpenClaw agent plugins/config
desktop/          - macOS Electron app
```

## Getting Started

```bash
yarn install          # install all workspace dependencies

yarn dev              # start mobile + web dev servers
yarn dev:mobile       # start Expo dev server
yarn dev:web          # start Next.js dev server

yarn ios              # run iOS simulator
yarn ios:device       # run on connected device

yarn build:web        # production build
```

### Relay Server Setup

```bash
./relay-server/setup.sh   # prompts for OPENAI_API_KEY, validates, writes .env
yarn dev:server           # start the relay server on ws://localhost:8080
```

## STS Provider Costs

VoiceClaw uses speech-to-speech (STS) models via a relay server. Here's what it costs:

### Per Hour of Active Conversation

| Provider | Audio In | Audio Out | Total/hr |
|---|---|---|---|
| [OpenAI Realtime](https://developers.openai.com/api/docs/pricing) (full) | $1.15 | $4.61 | **$5.76** |
| [OpenAI Realtime](https://developers.openai.com/api/docs/pricing) (mini) | $0.36 | $1.44 | **$1.80** |
| [Gemini Live](https://ai.google.dev/gemini-api/docs/pricing) | $0.35 | $1.38 | **$1.73** |

### Silence Billing

- **OpenAI:** Silence is free. [VAD filters out empty audio](https://developers.openai.com/api/docs/guides/realtime-costs) so you only pay for actual speech.
- **Gemini:** [Silence is billed at the same rate as speech](https://discuss.ai.google.dev/t/live-api-pricing-audio-tokens-second-silent-audio/92653) because it continuously processes audio for VAD server-side.

This means OpenAI is cheaper for long sessions with idle time, while Gemini is slightly cheaper per hour of active conversation. See [docs/sts-cost-analysis.md](docs/sts-cost-analysis.md) for detailed breakdowns.

## Security

### Architecture

The relay server holds STS provider API keys (e.g., `OPENAI_API_KEY`) and acts as a trusted intermediary between the mobile app and STS providers. **The mobile app never has direct access to provider API keys.**

### Authentication

The relay server has no auth system of its own — it delegates authentication to [OpenClaw](https://github.com/yagudaev/openclaw):

1. Mobile sends its existing OpenClaw credentials (`openclawGatewayUrl` + `openclawAuthToken`) when connecting to the relay
2. Relay validates the token by calling the OpenClaw gateway health endpoint
3. Valid token → session proceeds. Invalid → connection rejected.

This means **the `OPENAI_API_KEY` is only accessible to authenticated OpenClaw users**. No separate relay credentials or user database required.

### Credential Handling

| Credential | Lives on | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Relay server `.env` | STS provider access (never sent to mobile) |
| `openclawAuthToken` | Mobile app (SQLite) | User identity, passed through relay to brain agent |
| `openclawGatewayUrl` | Mobile app (SQLite) | Brain agent endpoint, passed through relay |

### Important

- **Never commit `.env` files.** The `.gitignore` excludes them.
- **Use WSS in production.** The relay protocol sends auth tokens over WebSocket — use `wss://` (TLS) for any non-localhost deployment.
- **API keys stay server-side.** The mobile app should never hold STS provider keys directly.
