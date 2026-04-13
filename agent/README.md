# Agent

Brain agent integration for the VoiceClaw relay server.

## Structure

```
agent/
  hermes/     - Hermes/Holly setup and config
    setup.sh  - Enables Hermes HTTP API for relay server
  openclaw/   - OpenClaw/Kira connection docs
```

## Quick Start

Both agents expose OpenAI-compatible `/v1/chat/completions` endpoints:

| Agent | Endpoint | Auth |
|-------|----------|------|
| Kira (OpenClaw) | `<gatewayUrl>/voiceclaw/v1/chat/completions` | Bearer token |
| Holly (Hermes) | `http://127.0.0.1:8642/v1/chat/completions` | Bearer token (optional) |

### Enable Holly's HTTP API

```bash
./agent/hermes/setup.sh
```
