#!/usr/bin/env node
// Pre-recorded Gemini voice samples for the Settings voice picker.
//
// We bundle the 8 Gemini voices as static WAVs so the desktop app can
// preview them with zero runtime calls to the Gemini TTS endpoint —
// that's important because the previous lazy-cache implementation
// hit users with 429 quota errors on first click. See NAN-715.
//
// Usage:
//   GEMINI_API_KEY=... node desktop/scripts/generate-gemini-voice-previews.mjs
//
// Re-run only if the voice list or model changes. The runtime path
// (Settings) reads straight from the bundled WAVs — no network.

import { mkdir, stat, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { setTimeout as sleep } from "node:timers/promises"

const VOICES = [
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Aoede",
  "Leda",
  "Orus",
  "Zephyr",
]
const PROMPT_TEXT = `Hi, I'm here.`
const TTS_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent"
const FALLBACK_SAMPLE_RATE = 24000
// Gemini TTS preview is on a tight free-tier rate limit. Pad each call so
// we stay well under RPM and on 429 honor the retryDelay the API returns.
const INTER_REQUEST_DELAY_MS = 5_000
const MAX_RETRIES_PER_VOICE = 5
const DEFAULT_RETRY_DELAY_MS = 60_000

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, "..", "resources", "voice-previews", "gemini")

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function main() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.error(
      "[gemini-previews] set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY)",
    )
    process.exit(2)
  }
  await mkdir(outDir, { recursive: true })
  let firstRequest = true
  for (const voice of VOICES) {
    const path = resolve(outDir, `${voice}.wav`)
    if (await fileExists(path)) {
      console.log(`[gemini-previews] ${voice} … cached, skip`)
      continue
    }
    if (!firstRequest) await sleep(INTER_REQUEST_DELAY_MS)
    firstRequest = false
    process.stdout.write(`[gemini-previews] ${voice} … `)
    const { pcm, sampleRate } = await captureVoiceWithRetry(apiKey, voice)
    const wav = pcmToWav(pcm, sampleRate)
    await writeFile(path, wav)
    console.log(`${pcm.length} bytes pcm @ ${sampleRate}Hz → ${path}`)
  }
  console.log("[gemini-previews] done")
}

async function captureVoiceWithRetry(apiKey, voice) {
  let attempt = 0
  while (true) {
    try {
      return await captureVoice(apiKey, voice)
    } catch (err) {
      attempt += 1
      const retryAfterMs = err?.retryAfterMs
      if (retryAfterMs == null || attempt > MAX_RETRIES_PER_VOICE) throw err
      console.log(
        `\n[gemini-previews] 429 on ${voice}; sleeping ${Math.round(retryAfterMs / 1000)}s then retrying (attempt ${attempt}/${MAX_RETRIES_PER_VOICE})`,
      )
      await sleep(retryAfterMs)
      process.stdout.write(`[gemini-previews] ${voice} (retry) … `)
    }
  }
}

async function captureVoice(apiKey, voice) {
  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPT_TEXT }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    const err = new Error(`TTS ${response.status} for voice=${voice}: ${body.slice(0, 400)}`)
    if (response.status === 429) {
      err.retryAfterMs = parseRetryDelayMs(body) ?? DEFAULT_RETRY_DELAY_MS
    }
    throw err
  }
  const json = await response.json()
  const inline = json?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData)
    ?.inlineData
  if (!inline?.data) {
    throw new Error(`TTS response missing audio (voice=${voice})`)
  }
  const sampleRate = parseSampleRate(inline.mimeType) ?? FALLBACK_SAMPLE_RATE
  const pcm = Buffer.from(inline.data, "base64")
  return { pcm, sampleRate }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSampleRate(mimeType) {
  if (typeof mimeType !== "string") return null
  const match = mimeType.match(/rate=(\d+)/i)
  return match ? Number(match[1]) : null
}

function parseRetryDelayMs(body) {
  // Gemini 429 bodies include a `RetryInfo` block with retryDelay like "31s".
  const match = body.match(/"retryDelay"\s*:\s*"(\d+)s"/i)
  return match ? Number(match[1]) * 1000 : null
}

async function fileExists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function pcmToWav(pcm, sampleRate) {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = pcm.length
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)
  pcm.copy(buffer, 44)
  return buffer
}
