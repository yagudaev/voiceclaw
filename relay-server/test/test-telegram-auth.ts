// Unit tests for Telegram initData validation + ticket flow.
// Run: npx tsx test/test-telegram-auth.ts

import { createHmac } from "node:crypto"

let passed = 0
let failed = 0

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  PASS: ${name}`)
    passed++
  } else {
    console.log(`  FAIL: ${name}`)
    failed++
  }
}

const TEST_BOT_TOKEN = "123456:TEST_TOKEN_FOR_UNIT_TESTS_ONLY"
const TEST_RELAY_KEY = "test-relay-key-0000000000000000"

process.env.TELEGRAM_BOT_TOKEN = TEST_BOT_TOKEN
process.env.RELAY_API_KEY = TEST_RELAY_KEY

const { verifyInitData, issueTicket, verifyTicket, isTelegramAuthEnabled } =
  await import("../src/telegram-auth.js")

function buildInitData(user: object, authDateSec: number, tamperedHash?: string): string {
  const userJson = JSON.stringify(user)
  const params = new URLSearchParams()
  params.set("auth_date", String(authDateSec))
  params.set("query_id", "AAH_test_query")
  params.set("user", userJson)

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")

  const secretKey = createHmac("sha256", "WebAppData").update(TEST_BOT_TOKEN).digest()
  const hash = tamperedHash ?? createHmac("sha256", secretKey).update(dataCheckString).digest("hex")
  params.set("hash", hash)
  return params.toString()
}

// 1. Env gating
assert(isTelegramAuthEnabled() === true, "isTelegramAuthEnabled returns true when both env vars set")

// 2. Valid initData
const now = Math.floor(Date.now() / 1000)
const goodInit = buildInitData({ id: 42, username: "alice", first_name: "Alice" }, now)
const user = verifyInitData(goodInit)
assert(user !== null && user.id === 42 && user.username === "alice", "verifyInitData accepts fresh valid payload")

// 3. Expired initData (freshness window is 1h)
const oldInit = buildInitData({ id: 42 }, now - 2 * 60 * 60)
assert(verifyInitData(oldInit) === null, "verifyInitData rejects payload older than 1 hour")

// 4. Tampered hash
const tampered = buildInitData({ id: 42 }, now, "0".repeat(64))
assert(verifyInitData(tampered) === null, "verifyInitData rejects tampered hash")

// 5. Missing user
const missingUser = new URLSearchParams()
missingUser.set("auth_date", String(now))
missingUser.set("hash", "0".repeat(64))
assert(verifyInitData(missingUser.toString()) === null, "verifyInitData rejects missing user field")

// 6. Ticket roundtrip
const ticket = issueTicket(42)
assert(ticket.startsWith("tgt."), "issueTicket produces tgt.-prefixed ticket")
const payload = verifyTicket(ticket)
assert(payload !== null && payload.tgUid === 42, "verifyTicket accepts freshly-issued ticket")

// 7. Tampered ticket
const tamperedTicket = ticket.slice(0, -4) + "zzzz"
assert(verifyTicket(tamperedTicket) === null, "verifyTicket rejects tampered ticket")

// 8. Wrong ticket prefix
assert(verifyTicket("wrong.payload.sig") === null, "verifyTicket rejects non-tgt prefix")

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
