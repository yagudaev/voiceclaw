// Telegram Mini App initData validation + short-lived session tickets.
//
// Flow: mini app reads Telegram.WebApp.initData, POSTs it to /auth/telegram.
// We verify the HMAC with the bot token. If valid, we issue a ticket the
// webview presents as session.config.apiKey. The raw RELAY_API_KEY never
// leaves the server.

import { createHmac, timingSafeEqual } from "node:crypto"

const TICKET_TTL_MS = 5 * 60 * 1000
const INIT_DATA_MAX_AGE_SEC = 5 * 60
const TICKET_PREFIX = "tgt."

export interface TelegramUser {
  id: number
  username?: string
  firstName?: string
}

export interface TicketPayload {
  tgUid: number
  exp: number
}

export function isTelegramAuthEnabled(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.RELAY_API_KEY
}

export function verifyInitData(initData: string): TelegramUser | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return null

  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) return null

  const authDateRaw = params.get("auth_date")
  if (!authDateRaw) return null
  const authDate = parseInt(authDateRaw, 10)
  if (!Number.isFinite(authDate)) return null
  const ageSec = Math.floor(Date.now() / 1000) - authDate
  if (ageSec > INIT_DATA_MAX_AGE_SEC || ageSec < -30) return null

  params.delete("hash")
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest()
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  if (!safeEqualHex(expected, hash)) return null

  const userRaw = params.get("user")
  if (!userRaw) return null
  try {
    const user = JSON.parse(userRaw) as {
      id?: number
      username?: string
      first_name?: string
    }
    if (typeof user.id !== "number") return null
    return {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
    }
  } catch {
    return null
  }
}

export function issueTicket(tgUid: number): string {
  const payload: TicketPayload = {
    tgUid,
    exp: Date.now() + TICKET_TTL_MS,
  }
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = ticketHmac(payloadB64)
  return `${TICKET_PREFIX}${payloadB64}.${sig}`
}

export function verifyTicket(ticket: string): TicketPayload | null {
  if (!ticket.startsWith(TICKET_PREFIX)) return null
  const rest = ticket.slice(TICKET_PREFIX.length)
  const dot = rest.indexOf(".")
  if (dot < 0) return null
  const payloadB64 = rest.slice(0, dot)
  const sig = rest.slice(dot + 1)
  const expected = ticketHmac(payloadB64)
  if (!safeEqualHex(expected, sig)) return null
  try {
    const payload = JSON.parse(fromBase64Url(payloadB64)) as TicketPayload
    if (typeof payload.tgUid !== "number" || typeof payload.exp !== "number") return null
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

function ticketHmac(payloadB64: string): string {
  const secret = process.env.RELAY_API_KEY
  if (!secret) throw new Error("RELAY_API_KEY must be set to use Telegram tickets")
  return createHmac("sha256", secret).update(payloadB64).digest("hex")
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (input.length % 4)) % 4)
  return Buffer.from(padded, "base64").toString("utf8")
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  } catch {
    return false
  }
}
