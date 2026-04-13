// E2E test — connects as a WebSocket client to the relay server,
// sends a session.config, and verifies the full round-trip:
// session.ready → audio exchange → transcript → disconnect

import WebSocket from "ws"

const RELAY_URL = process.env.RELAY_URL || "ws://localhost:8080/ws"
const API_KEY = process.env.TEST_API_KEY || "test-key"

interface TestResult {
  step: string
  pass: boolean
  detail?: string
}

const results: TestResult[] = []
const log = (msg: string) => console.log(`[test] ${msg}`)

function record(step: string, pass: boolean, detail?: string) {
  results.push({ step, pass, detail })
  const icon = pass ? "PASS" : "FAIL"
  log(`${icon}: ${step}${detail ? ` — ${detail}` : ""}`)
}

async function run() {
  log(`Connecting to ${RELAY_URL}...`)

  const ws = new WebSocket(RELAY_URL)
  let sessionReady = false
  let gotAudioDelta = false
  let gotTranscriptDelta = false
  let gotTranscriptDone = false
  let gotTurnEnded = false

  const timeout = (ms: number, label: string) =>
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout waiting for: ${label}`)), ms)
    )

  const waitFor = (
    check: () => boolean,
    label: string,
    ms = 15000
  ): Promise<void> =>
    Promise.race([
      new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (check()) {
            clearInterval(interval)
            resolve()
          }
        }, 100)
      }),
      timeout(ms, label),
    ])

  return new Promise<void>((resolve) => {
    ws.on("open", () => {
      record("WebSocket connected", true)

      // Send session.config
      ws.send(
        JSON.stringify({
          type: "session.config",
          provider: "openai",
          voice: "sage",
          model: "gpt-realtime-mini",
          brainAgent: "kira",
          apiKey: API_KEY,
          deviceContext: {
            timezone: "America/Vancouver",
            locale: "en-CA",
          },
        })
      )
      log("Sent session.config")
    })

    ws.on("message", (raw) => {
      const data = JSON.parse(String(raw))

      switch (data.type) {
        case "session.ready":
          sessionReady = true
          record("Session ready", true, `sessionId=${data.sessionId}`)
          break
        case "audio.delta":
          if (!gotAudioDelta) {
            gotAudioDelta = true
            record("First audio.delta received", true, `${data.data.length} chars base64`)
          }
          break
        case "transcript.delta":
          if (!gotTranscriptDelta) {
            gotTranscriptDelta = true
            record("First transcript.delta", true, `role=${data.role} text="${data.text.substring(0, 50)}"`)
          }
          break
        case "transcript.done":
          gotTranscriptDone = true
          record("transcript.done", true, `role=${data.role} text="${data.text.substring(0, 80)}"`)
          break
        case "turn.ended":
          gotTurnEnded = true
          record("turn.ended", true)
          break
        case "tool.call":
          record("Tool call received", true, `name=${data.name}`)
          break
        case "tool.progress":
          record("Tool progress", true, `summary="${data.summary}"`)
          break
        case "error":
          record("Error event", false, `${data.message} (${data.code})`)
          break
        default:
          log(`Event: ${data.type}`)
      }
    })

    ws.on("error", (err) => {
      record("WebSocket error", false, err.message)
    })

    ws.on("close", (code) => {
      record("WebSocket closed", true, `code=${code}`)
      printSummary()
      resolve()
    })

    // Test flow
    ;(async () => {
      try {
        // Wait for session to be ready
        await waitFor(() => sessionReady, "session.ready", 20000)

        // The assistant should speak first (greeting) since we have no audio input
        // Wait for the watchdog or initial greeting
        log("Waiting for assistant response (greeting or watchdog)...")
        await waitFor(() => gotAudioDelta, "audio.delta", 30000)
        await waitFor(() => gotTranscriptDone, "transcript.done", 30000)

        record("Full round-trip verified", true, "session → audio → transcript")

        // Clean disconnect
        log("Closing connection...")
        ws.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        record("Test flow", false, msg)
        ws.close()
      }
    })()
  })
}

function printSummary() {
  log("\n========== TEST SUMMARY ==========")
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  for (const r of results) {
    log(`  ${r.pass ? "✓" : "✗"} ${r.step}${r.detail ? ` — ${r.detail}` : ""}`)
  }
  log(`\n  ${passed} passed, ${failed} failed`)
  log("==================================")
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error("Test crashed:", err)
  process.exit(1)
})
