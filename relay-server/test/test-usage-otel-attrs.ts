// Unit test for voice-turn usage OTel attribute mapping.
//
// Run: npx tsx test/test-usage-otel-attrs.ts

import { usageToOtelAttrs } from "../src/tracing/turn-tracer.js"

function run() {
  const attrs = usageToOtelAttrs({
    promptTokens: 123,
    completionTokens: 45,
    inputAudioTokens: 67,
    outputAudioTokens: 89,
  })

  expectEqual("input tokens", attrs["gen_ai.usage.input_tokens"], 123)
  expectEqual("output tokens", attrs["gen_ai.usage.output_tokens"], 45)
  expectEqual("input audio tokens", attrs["gen_ai.usage.input_audio_tokens"], 67)
  expectEqual("output audio tokens", attrs["gen_ai.usage.output_audio_tokens"], 89)

  const partial = usageToOtelAttrs({ inputAudioTokens: 10 })
  expectEqual("partial key count", Object.keys(partial).length, 1)
  expectEqual("partial input audio tokens", partial["gen_ai.usage.input_audio_tokens"], 10)

  const empty = usageToOtelAttrs({})
  expectEqual("empty key count", Object.keys(empty).length, 0)

  console.log("  PASS  usage metrics map to vendor-neutral OTel attrs")
}

run()

function expectEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}
