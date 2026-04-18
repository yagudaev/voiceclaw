# VoiceClaw Telegram Mini App

Static webview launched from the [`telegram-bot`](../telegram-bot) `/call`
command. Captures mic audio in the browser, streams PCM16 @ 24kHz to the
user's relay server over WebSocket, plays back agent audio with barge-in.

## Contract

The mini app expects a `?relay=https://...` query parameter (the bot supplies
this per user). On launch it:

1. Reads `Telegram.WebApp.initData`.
2. `POST {relay}/auth/telegram` with the initData → receives `{ ticket, sessionKey }`.
3. Opens `wss://{relay}/ws` and sends `session.config` with the ticket as `apiKey`.
4. Streams `audio.append` / plays `audio.delta`.

No secrets baked in — the mini app is safe to host publicly.

## Development

```bash
yarn install
yarn dev    # Vite dev server on :5173
yarn build  # outputs to dist/
```

To test without Telegram, open `http://localhost:5173/?relay=http://localhost:8080`.
The page shows the "opened outside Telegram" guard. To exercise the full auth
flow locally, use the integration test in
[`relay-server/test/test-telegram-integration.ts`](../relay-server/test/test-telegram-integration.ts).

## Deployment

Any static host with HTTPS works (Cloudflare Pages, Vercel, Netlify, or
`cloudflared` in front of `yarn preview`). The URL must be registered with
`@BotFather` via `/newapp` on the bot that will open it.

## Audio pipeline

Copied from `desktop/src/renderer/src/lib/audio-engine.ts`. Uses AudioWorklet
on a dedicated thread with a ScriptProcessorNode fallback. Vite emits the
worklet as a separate `.js` asset (inline data: URLs break iOS WKWebView).
