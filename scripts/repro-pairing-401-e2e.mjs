#!/usr/bin/env node
// End-to-end pairing-401 repro. Runs three scenarios against a real
// relay-server process talking to a real (stand-in) device-token bridge,
// PLUS the counterexample the codex reviewer flagged: a relay started
// with stale VOICECLAW_DEVICE_TOKEN_CHECK_URL/NONCE in its environment.
//
// Scenarios:
//   A. master key       — RELAY_API_KEY presented as session.auth.apiKey  → expect ok
//   B. paired device    — vcd_<known-token> presented                     → expect ok
//   C. garbage          — random non-vcd_ string                          → expect 401
//
// Counterexamples (regressions):
//   X. paired device, relay started with STALE bridge env + live discovery → must still ok
//      (this is what 17faa8e was refuted on)
//   Y. paired device, relay started with stale discovery file + live env  → must still ok
//      (covers the symmetric "desktop crashed without cleanup, env points at fresh bridge")
//
// All five scenarios must pass for the fix to be considered correct.
// Exits 0 only if every scenario lands in its expected bucket.

import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve, dirname } from "node:path"
import { randomBytes, randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { createServer } from "node:http"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, "..")
const require = createRequire(resolve(repoRoot, "package.json"))
const WebSocket = require("ws")

const MASTER_KEY = `vc-master-${randomBytes(8).toString("hex")}`
const PAIRED_TOKEN = `vcd_${randomBytes(16).toString("hex")}`
const GARBAGE_TOKEN = `garbage-${randomBytes(8).toString("hex")}`

const RELAY_BOOT_TIMEOUT_MS = 10_000
const SCENARIO_TIMEOUT_MS = 7_000

function nowMs() { return Date.now() }

async function pickFreePort() {
  return await new Promise((resolveFn, reject) => {
    const srv = createServer()
    srv.on("error", reject)
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address()
      const port = typeof addr === "object" && addr ? addr.port : 0
      srv.close(() => resolveFn(port))
    })
  })
}

async function waitForRelay(port, timeoutMs) {
  const start = nowMs()
  while (nowMs() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`)
      if (res.ok) return true
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

function startBridge({ discoveryFile, knownToken, deviceId }) {
  return new Promise((resolveFn, reject) => {
    const child = spawn(process.execPath, [
      join(repoRoot, "scripts", "repro-bridge-server.mjs"),
      "--discovery-file", discoveryFile,
      "--known-token", knownToken,
      "--device-id", deviceId,
    ], { stdio: ["ignore", "pipe", "pipe"] })

    let stdoutBuf = ""
    let settled = false
    const onLine = (line) => {
      if (settled) return
      try {
        const parsed = JSON.parse(line)
        if (parsed.status === "ready") {
          settled = true
          resolveFn({ proc: child, url: parsed.url, nonce: parsed.nonce })
        }
      } catch { /* ignore non-JSON */ }
    }
    child.stdout.on("data", (chunk) => {
      stdoutBuf += chunk.toString("utf-8")
      let idx
      while ((idx = stdoutBuf.indexOf("\n")) >= 0) {
        const line = stdoutBuf.slice(0, idx)
        stdoutBuf = stdoutBuf.slice(idx + 1)
        onLine(line)
      }
    })
    child.stderr.on("data", (chunk) => {
      process.stderr.write(`[bridge stderr] ${chunk}`)
    })
    child.on("exit", (code, signal) => {
      if (!settled) {
        settled = true
        reject(new Error(`bridge exited before ready (code=${code} signal=${signal})`))
      }
    })
    setTimeout(() => {
      if (!settled) {
        settled = true
        try { child.kill("SIGTERM") } catch { /* ignore */ }
        reject(new Error("bridge startup timed out"))
      }
    }, 5_000).unref?.()
  })
}

function startRelay({ port, env }) {
  return new Promise((resolveFn, reject) => {
    const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx")
    const child = spawn(tsxBin, ["src/index.ts"], {
      cwd: join(repoRoot, "relay-server"),
      env: { ...process.env, ...env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    })
    const logBuf = []
    let settled = false
    child.stdout.on("data", (chunk) => {
      const s = chunk.toString("utf-8")
      logBuf.push(s)
      process.stdout.write(`[relay] ${s}`)
    })
    child.stderr.on("data", (chunk) => {
      const s = chunk.toString("utf-8")
      logBuf.push(s)
      process.stderr.write(`[relay stderr] ${s}`)
    })
    child.on("exit", (code, signal) => {
      if (!settled) {
        settled = true
        reject(new Error(`relay exited before ready (code=${code} signal=${signal})\n${logBuf.join("")}`))
      }
    })

    waitForRelay(port, RELAY_BOOT_TIMEOUT_MS).then((up) => {
      if (settled) return
      settled = true
      if (up) resolveFn({ proc: child, logs: () => logBuf.join("") })
      else {
        try { child.kill("SIGTERM") } catch { /* ignore */ }
        reject(new Error(`relay never became healthy on port ${port}\n${logBuf.join("")}`))
      }
    })
  })
}

async function killProc(proc) {
  if (!proc || proc.killed) return
  try { proc.kill("SIGTERM") } catch { /* ignore */ }
  await new Promise((r) => setTimeout(r, 200))
  try { proc.kill("SIGKILL") } catch { /* ignore */ }
}

function runRepro(port, apiKey, scenarioLabel) {
  return new Promise((resolveFn) => {
    const url = `ws://127.0.0.1:${port}/ws`
    const result = {
      scenario: scenarioLabel,
      ws_url: url,
      first_relay_message: null,
      close_code: null,
      close_reason: null,
      observed_result: "pending",
      error: null,
    }
    let ws
    try {
      ws = new WebSocket(url)
    } catch (err) {
      result.observed_result = "unreachable"
      result.error = err?.message ?? String(err)
      resolveFn(result)
      return
    }
    let firstMsg = false
    let settled = false
    const settle = (label) => {
      if (settled) return
      settled = true
      result.observed_result = label
      try { ws.terminate() } catch { /* ignore */ }
      resolveFn(result)
    }
    const timer = setTimeout(() => settle("timeout"), SCENARIO_TIMEOUT_MS)
    timer.unref?.()
    ws.on("open", () => {
      const payload = { type: "session.auth", apiKey, deviceName: "repro" }
      try { ws.send(JSON.stringify(payload)) } catch (err) {
        result.error = `send failed: ${err?.message ?? err}`
        settle("other")
      }
    })
    ws.on("message", (raw) => {
      if (firstMsg) return
      firstMsg = true
      let parsed
      try { parsed = JSON.parse(String(raw)) } catch {
        result.first_relay_message = String(raw).slice(0, 256)
        settle("malformed")
        return
      }
      result.first_relay_message = parsed
      if (parsed?.type === "session.auth.ok") settle("ok")
      else if (parsed?.type === "error" && parsed.code === 401) setTimeout(() => settle("401"), 200)
      else setTimeout(() => settle("other"), 200)
    })
    ws.on("close", (code, reasonBuf) => {
      result.close_code = code
      result.close_reason = reasonBuf ? Buffer.from(reasonBuf).toString("utf-8") : ""
      if (!firstMsg) {
        if (code === 1006) settle("unreachable")
        else if (code === 1008) settle("401")
        else settle("other")
      }
    })
    ws.on("error", () => { /* close fires too */ })
  })
}

async function runScenarioGroup(label, { discoveryFile, knownToken, deviceId, relayEnvOverride }) {
  console.log(`\n=== ${label} ===`)
  const relayPort = await pickFreePort()
  const bridgeOpts = { discoveryFile, knownToken, deviceId }
  let bridge
  if (discoveryFile) {
    bridge = await startBridge(bridgeOpts)
  }
  const envBase = {
    RELAY_API_KEY: MASTER_KEY,
    RELAY_BIND_HOST: "127.0.0.1",
    PORT: String(relayPort),
    NODE_ENV: "development",
    VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE: discoveryFile ?? "/tmp/voiceclaw-nonexistent-discovery.json",
  }
  delete envBase.VOICECLAW_DEVICE_TOKEN_CHECK_URL
  delete envBase.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
  const env = { ...envBase, ...relayEnvOverride }
  // RELAY_ALLOW_UNAUTHENTICATED must NOT be set or auth is bypassed.
  delete env.RELAY_ALLOW_UNAUTHENTICATED

  const relay = await startRelay({ port: relayPort, env })

  const results = []
  results.push(await runRepro(relayPort, MASTER_KEY, `${label}/A:master-key`))
  results.push(await runRepro(relayPort, PAIRED_TOKEN, `${label}/B:paired-device`))
  results.push(await runRepro(relayPort, GARBAGE_TOKEN, `${label}/C:garbage`))

  await killProc(relay.proc)
  if (bridge) await killProc(bridge.proc)
  try { if (discoveryFile && existsSync(discoveryFile)) rmSync(discoveryFile, { force: true }) } catch { /* ignore */ }
  return results
}

async function main() {
  const tmpRoot = mkdtempSync(join(tmpdir(), "vc-pair401-e2e-"))
  const failures = []
  const all = []

  try {
    // Group 1: baseline — discovery file present, NO env vars set.
    // Mirrors a developer running `yarn dev` against a live desktop.
    {
      const discoveryFile = join(tmpRoot, "g1", "device-token-bridge.json")
      const results = await runScenarioGroup("group-1:discovery-only", {
        discoveryFile,
        knownToken: PAIRED_TOKEN,
        deviceId: "phone-g1",
        relayEnvOverride: {},
      })
      all.push(...results)
    }

    // Group 2: env only (no discovery file). Mirrors the desktop-spawned
    // bundled relay path (buildRelayEnv injects URL+NONCE; desktop process
    // has not written a discovery file at the override path).
    {
      const bridgePort = await pickFreePort()
      // Start a real bridge on a known port, with NO discovery file written
      // to the override path the relay sees.
      const realDiscoveryFile = join(tmpRoot, "g2-real", "real.json")
      const fakeDiscoveryOverride = join(tmpRoot, "g2-fake", "device-token-bridge.json")
      const bridge = await startBridge({
        discoveryFile: realDiscoveryFile, // bridge writes here
        knownToken: PAIRED_TOKEN,
        deviceId: "phone-g2",
      })
      const relayPort = await pickFreePort()
      const env = {
        RELAY_API_KEY: MASTER_KEY,
        RELAY_BIND_HOST: "127.0.0.1",
        PORT: String(relayPort),
        NODE_ENV: "development",
        VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE: fakeDiscoveryOverride, // does not exist
        VOICECLAW_DEVICE_TOKEN_CHECK_URL: bridge.url,
        VOICECLAW_DEVICE_TOKEN_CHECK_NONCE: bridge.nonce,
      }
      console.log(`\n=== group-2:env-only ===`)
      const relay = await startRelay({ port: relayPort, env })
      all.push(await runRepro(relayPort, MASTER_KEY, "group-2:env-only/A:master-key"))
      all.push(await runRepro(relayPort, PAIRED_TOKEN, "group-2:env-only/B:paired-device"))
      all.push(await runRepro(relayPort, GARBAGE_TOKEN, "group-2:env-only/C:garbage"))
      await killProc(relay.proc)
      await killProc(bridge.proc)
      try { rmSync(realDiscoveryFile, { force: true }) } catch { /* ignore */ }
    }

    // Group 3 (THE COUNTEREXAMPLE): stale env points at a dead port,
    // live discovery file points at the running bridge. Before the fix:
    // every paired-device session.auth 401s because getBridgeConfig()
    // returned the stale env source. After the fix: discovery wins.
    {
      const discoveryFile = join(tmpRoot, "g3", "device-token-bridge.json")
      const deadPort = await pickFreePort()
      // Don't actually bind deadPort — let it remain a dead URL.
      const staleUrl = `http://127.0.0.1:${deadPort}`
      const staleNonce = "stale-nonce-from-old-launch"
      const results = await runScenarioGroup("group-3:stale-env-live-discovery", {
        discoveryFile,
        knownToken: PAIRED_TOKEN,
        deviceId: "phone-g3",
        relayEnvOverride: {
          VOICECLAW_DEVICE_TOKEN_CHECK_URL: staleUrl,
          VOICECLAW_DEVICE_TOKEN_CHECK_NONCE: staleNonce,
        },
      })
      all.push(...results)
    }

    // Group 4 (SYMMETRIC COUNTEREXAMPLE): a stale discovery file (dead pid)
    // exists at the override path, while live env points at a running bridge.
    // Fix must fall back to env when pid is dead.
    {
      const bridgePort = await pickFreePort()
      const realDiscoveryFile = join(tmpRoot, "g4-real", "real.json")
      const staleDiscoveryFile = join(tmpRoot, "g4-stale", "device-token-bridge.json")
      const bridge = await startBridge({
        discoveryFile: realDiscoveryFile,
        knownToken: PAIRED_TOKEN,
        deviceId: "phone-g4",
      })
      // Write a stale discovery file with a guaranteed-dead pid.
      const deadPid = 2_147_483_646
      const stalePort = await pickFreePort() // not bound; not used
      const fs = await import("node:fs")
      fs.mkdirSync(dirname(staleDiscoveryFile), { recursive: true })
      fs.writeFileSync(staleDiscoveryFile, JSON.stringify({
        url: `http://127.0.0.1:${stalePort}`,
        nonce: "stale-discovery-nonce",
        pid: deadPid,
        startedAt: Date.now() - 60_000,
      }))
      const relayPort = await pickFreePort()
      const env = {
        RELAY_API_KEY: MASTER_KEY,
        RELAY_BIND_HOST: "127.0.0.1",
        PORT: String(relayPort),
        NODE_ENV: "development",
        VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE: staleDiscoveryFile,
        VOICECLAW_DEVICE_TOKEN_CHECK_URL: bridge.url,
        VOICECLAW_DEVICE_TOKEN_CHECK_NONCE: bridge.nonce,
      }
      console.log(`\n=== group-4:stale-discovery-live-env ===`)
      const relay = await startRelay({ port: relayPort, env })
      all.push(await runRepro(relayPort, MASTER_KEY, "group-4:stale-discovery-live-env/A:master-key"))
      all.push(await runRepro(relayPort, PAIRED_TOKEN, "group-4:stale-discovery-live-env/B:paired-device"))
      all.push(await runRepro(relayPort, GARBAGE_TOKEN, "group-4:stale-discovery-live-env/C:garbage"))
      await killProc(relay.proc)
      await killProc(bridge.proc)
      try { rmSync(realDiscoveryFile, { force: true }) } catch { /* ignore */ }
      try { rmSync(staleDiscoveryFile, { force: true }) } catch { /* ignore */ }
    }

    const expected = {
      "A:master-key": "ok",
      "B:paired-device": "ok",
      "C:garbage": "401",
    }
    console.log("\n=== summary ===")
    for (const r of all) {
      const suffix = r.scenario.split("/").at(-1)
      const expectedResult = expected[suffix]
      const pass = r.observed_result === expectedResult
      console.log(`${pass ? "PASS" : "FAIL"}  ${r.scenario}  expect=${expectedResult}  got=${r.observed_result}${r.close_reason ? `  (${r.close_reason})` : ""}`)
      if (!pass) failures.push(r)
    }
  } finally {
    try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* ignore */ }
  }

  if (failures.length > 0) {
    console.log(`\n${failures.length} scenario(s) failed`)
    process.exit(1)
  }
  console.log("\nALL SCENARIOS PASS")
}

main().catch((err) => {
  console.error("fatal:", err?.stack ?? err?.message ?? err)
  process.exit(2)
})
