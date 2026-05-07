#!/usr/bin/env node
// Generates the bundled OpenAI voice samples under
// `desktop/resources/voice-previews/openai/<voice>.wav`. The desktop
// app reads these at runtime so the Settings preview button never hits
// the network.
//
// Usage:
//   OPENAI_API_KEY=... node desktop/scripts/generate-openai-voice-previews.mjs
//
// Pass `--force` to overwrite existing WAVs.

import { mkdir, stat, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { setTimeout as sleep } from "node:timers/promises"

const VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"]
const PROMPT_TEXT = "Hi, I'm here."
const TTS_URL = "https://api.openai.com/v1/audio/speech"
const TTS_MODEL = "gpt-4o-mini-tts"
const RESPONSE_FORMAT = "wav"
const INTER_REQUEST_DELAY_MS = 1_000

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, "..", "resources", "voice-previews", "openai")

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[openai-previews] set OPENAI_API_KEY")
    process.exit(2)
  }
  const force = process.argv.includes("--force")
  await mkdir(outDir, { recursive: true })
  let firstRequest = true
  for (const voice of VOICES) {
    const path = resolve(outDir, `${voice}.wav`)
    if (!force && (await fileExists(path))) {
      console.log(`[openai-previews] ${voice} … exists, skip (pass --force to overwrite)`)
      continue
    }
    if (!firstRequest) await sleep(INTER_REQUEST_DELAY_MS)
    firstRequest = false
    process.stdout.write(`[openai-previews] ${voice} … `)
    const wav = await captureVoice(apiKey, voice)
    await writeFile(path, wav)
    console.log(`${wav.length} bytes → ${path}`)
  }
  console.log("[openai-previews] done")
}

async function captureVoice(apiKey, voice) {
  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice,
      input: PROMPT_TEXT,
      response_format: RESPONSE_FORMAT,
    }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`TTS ${response.status} for voice=${voice}: ${body.slice(0, 400)}`)
  }
  const buf = Buffer.from(await response.arrayBuffer())
  return buf
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fileExists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
