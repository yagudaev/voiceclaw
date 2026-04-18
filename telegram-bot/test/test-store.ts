// Unit tests for the bot's relay URL store + URL validation.
// Run: npx tsx test/test-store.ts

import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { RelayStore, isValidRelayUrl } from "../src/store.js"

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

const tmp = mkdtempSync(join(tmpdir(), "voiceclaw-bot-test-"))
const dbPath = join(tmp, "bot.db")

try {
  const store = new RelayStore(dbPath)

  store.set(42, "https://alice.example.com")
  const alice = store.get(42)
  assert(alice?.relayUrl === "https://alice.example.com", "set/get roundtrip")

  store.set(42, "https://alice.new.example.com")
  const updated = store.get(42)
  assert(updated?.relayUrl === "https://alice.new.example.com", "upsert replaces old value")

  assert(store.get(999) === null, "missing user returns null")

  store.clear(42)
  assert(store.get(42) === null, "clear removes row")

  store.close()

  assert(isValidRelayUrl("https://alice.example.com") === "https://alice.example.com", "accepts https url")
  assert(isValidRelayUrl("https://alice.example.com/") === "https://alice.example.com", "strips trailing path")
  assert(isValidRelayUrl("http://localhost:8080") === "http://localhost:8080", "accepts http for localhost")
  assert(isValidRelayUrl("ftp://nope") === null, "rejects non-http protocols")
  assert(isValidRelayUrl("not a url") === null, "rejects garbage input")
  assert(isValidRelayUrl("https://alice.example.com/path?query#frag") === "https://alice.example.com", "strips path and query")
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
