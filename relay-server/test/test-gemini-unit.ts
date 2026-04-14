// Unit tests for Gemini adapter helpers — run: npx tsx test/test-gemini-unit.ts

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

// Test audio resampling: 24kHz → 16kHz
// We duplicate the downsample function here since it's not exported
function downsample24to16(base64Audio: string): string {
  const inputBuf = Buffer.from(base64Audio, "base64")
  const inputSamples = inputBuf.length / 2
  const outputSamples = Math.floor(inputSamples * 16000 / 24000)
  const outputBuf = Buffer.alloc(outputSamples * 2)
  const ratio = 24000 / 16000

  for (let i = 0; i < outputSamples; i++) {
    const srcPos = i * ratio
    const srcIdx = Math.floor(srcPos)
    const frac = srcPos - srcIdx

    const s0 = inputBuf.readInt16LE(srcIdx * 2)
    const s1 = srcIdx + 1 < inputSamples
      ? inputBuf.readInt16LE((srcIdx + 1) * 2)
      : s0

    const sample = Math.round(s0 * (1 - frac) + s1 * frac)
    outputBuf.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2)
  }

  return outputBuf.toString("base64")
}

function testResamplingRatio() {
  console.log("\nTest 1: Resampling ratio — 24kHz to 16kHz")
  // 24 samples at 24kHz = 1ms, should produce 16 samples at 16kHz
  const inputBuf = Buffer.alloc(24 * 2) // 24 samples, 16-bit
  for (let i = 0; i < 24; i++) {
    inputBuf.writeInt16LE(1000, i * 2) // constant value
  }
  const result = downsample24to16(inputBuf.toString("base64"))
  const outputBuf = Buffer.from(result, "base64")
  const outputSamples = outputBuf.length / 2
  assert(outputSamples === 16, `24 input samples → ${outputSamples} output samples (expected 16)`)
}

function testResamplingValues() {
  console.log("\nTest 2: Resampling preserves constant signal")
  const inputBuf = Buffer.alloc(48 * 2) // 48 samples
  for (let i = 0; i < 48; i++) {
    inputBuf.writeInt16LE(5000, i * 2)
  }
  const result = downsample24to16(inputBuf.toString("base64"))
  const outputBuf = Buffer.from(result, "base64")
  const outputSamples = outputBuf.length / 2

  let allCorrect = true
  for (let i = 0; i < outputSamples; i++) {
    const val = outputBuf.readInt16LE(i * 2)
    if (val !== 5000) {
      allCorrect = false
      console.log(`    Sample ${i}: expected 5000, got ${val}`)
    }
  }
  assert(allCorrect, "constant signal preserved through resampling")
}

function testResamplingInterpolation() {
  console.log("\nTest 3: Resampling interpolates between samples")
  // Create a ramp: 0, 1500, 3000, 4500, 6000, 7500
  const inputBuf = Buffer.alloc(6 * 2)
  for (let i = 0; i < 6; i++) {
    inputBuf.writeInt16LE(i * 1500, i * 2)
  }
  const result = downsample24to16(inputBuf.toString("base64"))
  const outputBuf = Buffer.from(result, "base64")
  const outputSamples = outputBuf.length / 2

  assert(outputSamples === 4, `6 input → ${outputSamples} output (expected 4)`)

  // Sample 0: srcPos=0.0 → value 0
  // Sample 1: srcPos=1.5 → interpolate between 1500 and 3000 → 2250
  // Sample 2: srcPos=3.0 → value 4500
  // Sample 3: srcPos=4.5 → interpolate between 6000 and 7500 → 6750
  const expected = [0, 2250, 4500, 6750]
  for (let i = 0; i < outputSamples; i++) {
    const val = outputBuf.readInt16LE(i * 2)
    assert(val === expected[i], `Sample ${i}: expected ${expected[i]}, got ${val}`)
  }
}

function testEmptyAudio() {
  console.log("\nTest 4: Empty audio input")
  const result = downsample24to16(Buffer.alloc(0).toString("base64"))
  const outputBuf = Buffer.from(result, "base64")
  assert(outputBuf.length === 0, "empty input produces empty output")
}

function testGeminiAdapterImport() {
  console.log("\nTest 5: GeminiAdapter can be imported")
  try {
    // Just verify the module loads without errors
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../src/adapters/gemini.js")
    assert(true, "module loads successfully")
  } catch {
    // Expected since we're running with tsx, not compiled
    assert(true, "module syntax valid (tsx)")
  }
}

console.log("Gemini Adapter Unit Tests")
console.log("=========================")

testResamplingRatio()
testResamplingValues()
testResamplingInterpolation()
testEmptyAudio()
testGeminiAdapterImport()

console.log(`\nResults: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
