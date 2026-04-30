#!/usr/bin/env node
import { execSync, spawn } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(here, "..")
const arch = process.arch === "arm64" ? "mac-arm64" : "mac"
const appPath = process.env.SMOKE_APP_PATH ?? findPackagedApp()
const settleMs = Number(process.env.SMOKE_SETTLE_MS ?? "10000")
const fakeHome = mkdtempSync(join(tmpdir(), "voiceclaw-smoke-home-"))

console.log(`[smoke] app:      ${appPath}`)
console.log(`[smoke] fakeHome: ${fakeHome}`)
console.log(`[smoke] settling for ${settleMs}ms`)

if (!existsSync(appPath)) {
  console.error(`[smoke] FAIL — packaged app not found at ${appPath}`)
  process.exit(1)
}

const startedAt = Date.now()
const launchProc = spawn("open", ["-n", "-W", "--stdout", "/dev/stderr", "--stderr", "/dev/stderr", appPath], {
  env: { ...process.env, HOME: fakeHome },
  stdio: ["ignore", "inherit", "pipe"],
})

const stderrChunks = []
launchProc.stderr.on("data", chunk => stderrChunks.push(chunk))
let openExited = false
let openExitCode = null
launchProc.on("exit", (code) => {
  openExited = true
  openExitCode = code
})

await sleep(settleMs)

const stderr = Buffer.concat(stderrChunks).toString("utf8")

const fatalPatterns = [
  /Cannot find module/i,
  /Uncaught Exception/i,
  /A JavaScript error occurred in the main process/i,
  /Error: ENOENT/i,
  /SIGABRT|SIGSEGV|SIGBUS/i,
  /Library not loaded/i,
]
for (const pattern of fatalPatterns) {
  if (pattern.test(stderr)) {
    console.error(`[smoke] FAIL — fatal pattern matched in launcher stderr: ${pattern}`)
    console.error(`[smoke] stderr:\n${stderr}`)
    cleanup()
    process.exit(1)
  }
}

const aliveCount = countLiveVoiceClawProcs()
if (aliveCount === 0) {
  console.error(`[smoke] FAIL — no VoiceClaw process alive after ${settleMs}ms (open exited=${openExited} code=${openExitCode})`)
  console.error(`[smoke] launcher stderr:\n${stderr}`)
  const sysLog = recentSystemLog(startedAt)
  if (sysLog) console.error(`[smoke] recent system log:\n${sysLog}`)
  cleanup()
  process.exit(1)
}

console.log(`[smoke] OK — ${aliveCount} VoiceClaw processes alive after ${settleMs}ms, no fatal patterns`)

quitVoiceClaw()
await sleep(2000)
forceKillVoiceClaw()
cleanup()
process.exit(0)

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function findPackagedApp() {
  const candidates = [
    join(desktopRoot, "dist", arch, "VoiceClaw.app"),
    join(desktopRoot, "dist", "mac", "VoiceClaw.app"),
    join(desktopRoot, "dist", "mac-arm64", "VoiceClaw.app"),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  const distDir = join(desktopRoot, "dist")
  if (existsSync(distDir)) {
    for (const entry of readdirSync(distDir)) {
      const candidate = join(distDir, entry, "VoiceClaw.app")
      if (existsSync(candidate)) return candidate
    }
  }
  return candidates[0]
}

function countLiveVoiceClawProcs() {
  try {
    const out = execSync("pgrep -fl VoiceClaw", { encoding: "utf8" })
    const lines = out.split("\n").filter(Boolean).filter(line => !line.includes("smoke-test"))
    return lines.length
  } catch {
    return 0
  }
}

function quitVoiceClaw() {
  try {
    execSync(`osascript -e 'try
  tell application "VoiceClaw" to quit
end try'`)
  } catch {
    // best-effort
  }
}

function forceKillVoiceClaw() {
  try {
    execSync("pkill -x VoiceClaw")
  } catch {
    // best-effort
  }
}

function recentSystemLog(sinceMs) {
  try {
    const seconds = Math.max(1, Math.ceil((Date.now() - sinceMs) / 1000) + 5)
    return execSync(
      `log show --predicate 'process == "VoiceClaw"' --last ${seconds}s --info 2>/dev/null | grep -iE 'sqlite|cannot find|exception|error' | head -20`,
      { encoding: "utf8" },
    )
  } catch {
    return ""
  }
}

function cleanup() {
  try {
    rmSync(fakeHome, { recursive: true, force: true })
  } catch {
    // best-effort
  }
}
