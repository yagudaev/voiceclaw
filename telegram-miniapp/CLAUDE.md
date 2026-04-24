# Telegram Mini App notes

The mini app is a static Vite + TypeScript webview launched from an
OpenClaw bot's `/call` response. It authenticates via Telegram `initData`,
opens a WSS session to the user's per-user relay, and streams PCM16 @ 24kHz
audio with barge-in.

## Architecture at a glance

```
Telegram client  --/call-->  OpenClaw bot (Pam/Holly/Buffet)
                             │
                             ▼ reply: t.me/<bot>/voiceclaw?startapp=<Name>
Telegram renders "Launch" pill
  │ tap
  ▼
Mini app (this workspace) inside Telegram webview
  │ initData (HMAC-signed by bot token)
  ▼
POST {relay}/auth/telegram  →  { ticket, sessionKey, bot:{firstName} }
  │
  ▼
WSS {relay}/ws  session.config.apiKey = ticket
  │
  ▼
Relay ↔ Gemini Live   audio.append / audio.delta
```

Shared: bot + hosted mini app. Per-user: relay (each user runs their own
on their Hetzner/home box with their own brain agent).

## OpenClaw side

The bot process is **OpenClaw's** Telegram channel (extensions/telegram),
not anything in this repo. Two things live in OpenClaw's config/instructions:

1. **Menu entry** — `channels.telegram.customCommands` in OpenClaw's config:
   ```yaml
   customCommands:
     - command: call
       description: Start a voice call
   ```
   Restart the gateway so `setMyCommands` pushes it to Telegram.

2. **Behavior** — persistent agent instruction:
   > When the user sends `/call`, reply with exactly this URL and nothing
   > else: `https://t.me/<bot>/<shortname>?startapp=<AgentName>`

Do **not** try to add a sidecar grammY (or any) bot here — OpenClaw owns
the long-poll connection; a second process on the same token will conflict.

OpenClaw's inline-keyboard builder filters out `web_app` buttons today
(`extensions/telegram/src/inline-keyboard.ts` only keeps `callback_data`).
The plain-URL Launch pill is the workaround.

## BotFather setup

Per bot:
1. `@BotFather` → `/newapp` → pick the bot.
2. Title, description, photo (640x360), GIF (skip with `/empty`).
3. **Web App URL**: `https://<your-host>/?relay=https%3A%2F%2F<your-relay-host>%2F`
   (URL-encode the relay URL; it becomes `?relay=...` in the mini app).
4. Short name: `voiceclaw` (gives you `t.me/<bot>/voiceclaw`).

For multi-bot (Pam + Holly + Buffet), register the **same** Web App URL
under each bot. Each bot signs its own `initData`; the relay currently
trusts the one token in `TELEGRAM_BOT_TOKEN` (see follow-up below).

## Relay requirements

`relay-server/.env` needs both:
- `TELEGRAM_BOT_TOKEN=…` — the bot that will host this mini app.
- `RELAY_API_KEY=…` — 32+ random bytes (hex); signs session tickets.

If either is missing, `/auth/telegram` returns `{"error":"telegram auth disabled"}`.

## Public hosting (dev)

Both the relay **and** the mini app need public HTTPS. With Tailscale Funnel:

```bash
# Relay on :8080 → Funnel :443
tailscale funnel --bg --https=443 http://127.0.0.1:8080

# Mini app preview on :4173 → Funnel :8443
yarn workspace telegram-miniapp build
yarn workspace telegram-miniapp preview
tailscale funnel --bg --https=8443 http://127.0.0.1:4173
```

Funnel only accepts ports 443, 8443, 10000.

## Gotchas

- **Vite preview `allowedHosts`**: `.ts.net` must be allowed or Funnel
  requests get a 403. Configured in `vite.config.ts` under `preview`.
- **AudioWorklet must be a separate asset**, not inlined. Use
  `const { default: workletUrl } = await import("./audio-worklet-processor.js?url")`
  — iOS WKWebView rejects inline `data:` URL worklets.
- **initData freshness window is 1 h** (relay-server). If you open the
  mini app and leave it idle longer, re-auth 401s; reload the mini app.
- **Ticket cache**: mini app reuses the ticket for 4 min on restart to
  skip re-auth. Invalidated on bundle reload, not on end-call.
- **Agent name source priority**:
  1. `?startapp=<Name>` from Telegram (agent self-identifies — cleanest)
  2. Bot `first_name` from `getMe` via relay (stripped of trailing "Bot")
  3. Literal `"Agent"` fallback

## Running locally

```bash
yarn workspace telegram-miniapp dev       # :5173 (for quick UI tweaks)
yarn workspace telegram-miniapp build     # -> dist/
yarn workspace telegram-miniapp preview   # :4173 (what Funnel serves)
```

Outside Telegram the UI shows "Mini app must be opened inside Telegram" —
`initData` is only injected by the Telegram client. To exercise the full
auth path locally, use `relay-server/test/test-telegram-integration.ts`
(signs fake initData with the bot token, exercises the WS handshake).

## Follow-ups

- Multi-bot relay: accept `TELEGRAM_BOT_TOKENS=t1,t2,…` so one relay can
  serve Pam + Holly + Buffet. Today one token per relay.
- Upstream PR to OpenClaw adding `web_app` button support to
  `extensions/telegram/src/inline-keyboard.ts` — would remove the
  plain-URL Launch-pill workaround.
- Persist `cachedAuth` to `sessionStorage` so a full page reload keeps it
  (currently in-memory only).
