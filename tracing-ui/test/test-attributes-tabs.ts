// Unit-ish test for the pure attribute flattening helper used by AttributesTabs.
//
// Run: npx tsx test/test-attributes-tabs.ts

import { flattenAttributes } from "../src/components/AttributesTabs.js"

function run() {
  const rows = flattenAttributes({
    gen_ai: {
      usage: {
        input_tokens: 12,
        output_tokens: 3,
      },
    },
    media: {
      user_audio: {
        path: "/tmp/user.pcm",
      },
    },
    events: [
      { name: "first", timeMs: 10 },
      { name: "second", timeMs: 20 },
    ],
    emptyArray: [],
    emptyObject: {},
  })

  expectRow(rows, "gen_ai.usage.input_tokens", "12")
  expectRow(rows, "gen_ai.usage.output_tokens", "3")
  expectRow(rows, "media.user_audio.path", "/tmp/user.pcm")
  expectRow(rows, "events[0].name", "first")
  expectRow(rows, "events[1].timeMs", "20")
  expectRow(rows, "emptyArray", "[]")
  expectRow(rows, "emptyObject", "{}")

  if (flattenAttributes({}).length !== 0) {
    throw new Error("expected empty attrs to flatten to no rows")
  }

  console.log("  PASS  attributes flatten to dot paths with array indexes")
}

run()

function expectRow(rows: { key: string; value: string }[], key: string, value: string) {
  const row = rows.find((entry) => entry.key === key)
  if (!row) throw new Error(`missing row ${key}`)
  if (row.value !== value) {
    throw new Error(`row ${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(row.value)}`)
  }
}
