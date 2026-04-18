import "dotenv/config"
import { Bot, InlineKeyboard } from "grammy"
import { RelayStore, isValidRelayUrl } from "./store.js"

const TOKEN = requireEnv("TELEGRAM_BOT_TOKEN")
const MINIAPP_URL = requireEnv("MINIAPP_URL")
const DB_PATH = process.env.BOT_DB_PATH || "./data/bot.db"

assertHttpsMiniAppUrl(MINIAPP_URL)

const store = new RelayStore(DB_PATH)
const bot = new Bot(TOKEN)

bot.command("start", async (ctx) => {
  await ctx.reply(
    [
      "Hi, I'm your VoiceClaw bot.",
      "",
      "I connect you to your personal AI agent via voice. Each user runs their own relay server on their laptop or a VPS.",
      "",
      "Set yours up:",
      "• /setrelay <url> — register your relay's public URL (HTTPS)",
      "• /call — start a voice call",
      "• /getrelay — see what's on file",
      "• /forget — remove your relay from my records",
    ].join("\n"),
  )
})

bot.command("setrelay", async (ctx) => {
  const arg = ctx.match?.trim()
  if (!arg) {
    await ctx.reply(
      "Usage: /setrelay <url>\n\nExample: /setrelay https://alice-relay.trycloudflare.com",
    )
    return
  }
  const normalized = isValidRelayUrl(arg)
  if (!normalized) {
    await ctx.reply("That doesn't look like a valid URL. Use the full URL including https://")
    return
  }
  const userId = ctx.from?.id
  if (!userId) {
    await ctx.reply("Couldn't identify you. Try again in a direct chat with the bot.")
    return
  }
  store.set(userId, normalized)
  await ctx.reply(
    `Got it. Your relay: ${normalized}\n\nRun /call to start talking.`,
  )
})

bot.command("getrelay", async (ctx) => {
  const userId = ctx.from?.id
  if (!userId) return
  const entry = store.get(userId)
  if (!entry) {
    await ctx.reply("No relay on file. Use /setrelay <url> first.")
    return
  }
  await ctx.reply(`Your relay: ${entry.relayUrl}`)
})

bot.command("forget", async (ctx) => {
  const userId = ctx.from?.id
  if (!userId) return
  store.clear(userId)
  await ctx.reply("Removed. Use /setrelay to add a new one.")
})

bot.command("call", async (ctx) => {
  const userId = ctx.from?.id
  if (!userId) return
  const entry = store.get(userId)
  if (!entry) {
    await ctx.reply(
      "You haven't registered a relay yet.\n\nSet one with /setrelay <url> first, then come back to /call.",
    )
    return
  }
  const miniAppUrl = `${MINIAPP_URL}?relay=${encodeURIComponent(entry.relayUrl)}`
  const keyboard = new InlineKeyboard().webApp("Tap to call", miniAppUrl)
  await ctx.reply("Ready when you are.", { reply_markup: keyboard })
})

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      "Commands:",
      "• /setrelay <url> — register your VoiceClaw relay",
      "• /call — start a voice call (opens the mini app)",
      "• /getrelay — show your registered relay",
      "• /forget — clear your relay",
    ].join("\n"),
  )
})

bot.catch((err) => {
  console.error("[bot] handler error:", err)
})

await bot.api.setMyCommands([
  { command: "call", description: "Start a voice call" },
  { command: "setrelay", description: "Register your relay URL" },
  { command: "getrelay", description: "Show your registered relay" },
  { command: "forget", description: "Forget your relay" },
  { command: "help", description: "Show help" },
])

console.log(`[bot] starting (miniapp=${MINIAPP_URL}, db=${DB_PATH})`)
await bot.start({
  onStart: (info) => console.log(`[bot] running as @${info.username}`),
})

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

function assertHttpsMiniAppUrl(url: string): void {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") {
      console.error(`MINIAPP_URL must be https:// — Telegram rejects web_app buttons over http.`)
      process.exit(1)
    }
  } catch {
    console.error(`MINIAPP_URL is not a valid URL: ${url}`)
    process.exit(1)
  }
}
