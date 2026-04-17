---
layout: default
title: Contributing
nav_order: 6
---

# Contributing

VoiceClaw is an open-source project and contributions are welcome. This page covers the development setup, conventions, and workflow.

## Development Setup

### Prerequisites

- **Node.js** 20+
- **Yarn** (package manager -- always use yarn, not npm)
- **Xcode** (for iOS builds)
- macOS (required for the desktop Electron app and iOS development)

### Install

```bash
git clone https://github.com/nano3labs/voiceclaw.git
cd voiceclaw
yarn install
```

This installs dependencies for all workspaces (mobile, desktop, relay-server, website).

### Running Everything

```bash
# Start relay server + mobile dev server together
yarn dev

# Or run components individually
yarn dev:server     # relay server with auto-reload
yarn dev:mobile     # Expo dev server
yarn dev:desktop    # Electron app in dev mode
```

### Relay Server

```bash
cd relay-server
cp .env.example .env   # add your GEMINI_API_KEY, OPENAI_API_KEY, RELAY_API_KEY
yarn dev
```

The relay server runs on `http://localhost:8080`. The test page at `/test` lets you verify WebSocket connectivity from a browser.

### Desktop App

```bash
cd desktop
yarn dev
```

### Mobile App

```bash
cd mobile
yarn dev              # start Expo dev server
yarn ios              # run on iOS simulator
yarn ios:device       # run on connected device
```

## Monorepo Structure

```
voiceclaw/
  mobile/             # React Native / Expo iOS app
  desktop/            # Electron macOS app
  relay-server/       # TypeScript relay server
  website/            # Next.js marketing site
  agent/              # OpenClaw agent plugins/config
  docs/               # This documentation (GitHub Pages)
  package.json        # Root workspace config
```

The root `package.json` defines yarn workspaces. Each sub-package has its own `package.json` with its own scripts and dependencies.

## Branch Strategy

- **Never push directly to `main`**. Always use feature branches and pull requests.
- Branch naming: `feature/<description>`, `fix/<description>`, etc.
- PRs should be reviewed before merging.

## Code Style

### No Semicolons

All TypeScript and JavaScript code must omit semicolons:

```typescript
// Good
const value = compute()
log(`Result: ${value}`)

// Bad
const value = compute();
log(`Result: ${value}`);
```

### File Organization

Public interface and exports go at the **top** of each file. Helper functions go at the **bottom**:

```typescript
// -- Public interface at the top --

export function buildInstructions(config: SessionConfigEvent): string {
  const parts: string[] = []
  // ...
  return parts.join("\n\n")
}

// -- Helpers at the bottom --

function loadAgentIdentity(provider: string): string {
  // ...
}

function stripMarkdown(text: string): string {
  // ...
}
```

### Script Naming

Use `verb:app` naming for scripts (not `app:verb`):

```json
{
  "dev:server": "...",
  "dev:mobile": "...",
  "build:web": "..."
}
```

### General Guidelines

- Use TypeScript for all new code
- Keep functions small and focused
- Use descriptive variable and function names
- Add comments for non-obvious logic, especially protocol translation
- No emoji in code or log messages

## Testing

- **Relay server**: use the test page at `http://localhost:8080/test` for quick WebSocket testing
- **Mobile**: test on a real iOS device or simulator with Expo Go -- do not test on web
- **Desktop**: run `yarn dev` and verify audio capture, playback, and screen sharing
- Always build, deploy, and test on a device before committing

## Making Changes

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature main
   ```

2. Make your changes, following the code style guidelines above.

3. Test your changes:
   - Run the relay server and verify the protocol works
   - Test on the relevant client (mobile device, desktop app)
   - Check that existing functionality still works

4. Commit with a clear message describing the change.

5. Push and open a pull request against `main`.
