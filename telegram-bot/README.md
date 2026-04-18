# VoiceClaw Telegram Bot

A tiny grammY bot that lets Telegram users voice-call their VoiceClaw relay via
a mini app. Each user registers their own relay URL with `/setrelay`; `/call`
opens the mini app pointed at that relay.

## Architecture

The bot and mini app are a single shared deployment; the **relay server** is
per-user (runs on their laptop/VPS with their own brain agent). The bot stores
`telegram_user_id → relay_url` and composes the mini app URL per call.

```
Telegram user
    │ /call
    ▼
Bot ─── "Tap to call" web_app button (miniapp_url?relay=<user's url>)
    │
    ▼
Mini app webview
    │ POST /auth/telegram { initData }
    ▼
User's relay ── validates initData HMAC with bot token → returns ticket
    │ WS /ws { session.config, apiKey: ticket }
    ▼
Gemini Live
```

## Setup

1. Create a bot with [@BotFather](https://t.me/botfather), save the token.
2. Register the mini app: `/newapp` → pick your bot → paste the public HTTPS
   URL of the deployed `telegram-miniapp` (see its README).
3. Copy `.env.example` to `.env` and fill in `TELEGRAM_BOT_TOKEN` + `MINIAPP_URL`.
4. `yarn install && yarn dev`.

Each end user must also set `TELEGRAM_BOT_TOKEN` on **their own relay** (same
bot token — used to verify initData HMACs server-side).

## Commands

| Command | Purpose |
|---|---|
| `/start` | Intro + setup guide |
| `/setrelay <url>` | Register relay URL |
| `/getrelay` | Show registered URL |
| `/forget` | Remove registered URL |
| `/call` | Open the mini app |
| `/help` | Show commands |
