#!/usr/bin/env node
// Sources `desktop/.env.build` (if present) before running the given
// command. Lets the `dist:mac` script pick up APPLE_API_KEY et al
// without relying on the user's shell pre-export.
//
// The env file is optional — if it doesn't exist we just run the
// command with whatever env is already set. This way `yarn dist:mac`
// in CI (where credentials come from secret env injection, not a file)
// also works without modification.

import { spawn } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { homedir } from "node:os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "..")

const envPath = resolve(projectRoot, ".env.build")
const env = { ...process.env }

if (existsSync(envPath)) {
  const raw = readFileSync(envPath, "utf8")
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Strip surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    // Expand leading `~` against $HOME so APPLE_API_KEY can use the
    // canonical shorthand.
    if (value.startsWith("~/")) {
      value = resolve(homedir(), value.slice(2))
    }
    env[key] = value
  }
  console.log(`[with-build-env] loaded ${envPath}`)
} else {
  console.log(`[with-build-env] no ${envPath} found — using process env only`)
}

const [command, ...args] = process.argv.slice(2)
if (!command) {
  console.error("[with-build-env] usage: node scripts/with-build-env.mjs <command> [args…]")
  process.exit(2)
}

const child = spawn(command, args, { env, stdio: "inherit" })
child.on("exit", (code) => process.exit(code ?? 1))
child.on("error", (err) => {
  console.error("[with-build-env] failed to spawn:", err.message)
  process.exit(1)
})
