# VoiceClaw

Voice interface for any AI. Monorepo containing the mobile app, marketing website, relay server, agent configs, and desktop app.

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
