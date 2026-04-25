#!/usr/bin/env node
// Renames the dev Electron.app bundle's display name from "Electron"
// to "VoiceClaw" so Cmd+Tab, the Dock, and the Application menu show
// the right product name during `yarn dev`. Packaged builds get this
// from electron-builder.yml's productName, but the dev binary lives in
// node_modules and ships with CFBundleName="Electron" by default.
//
// Idempotent: re-running on an already-patched bundle is a no-op.

import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PRODUCT_NAME = "VoiceClaw"
const __dirname = dirname(fileURLToPath(import.meta.url))
const plistPath = resolve(
  __dirname,
  "..",
  "node_modules/electron/dist/Electron.app/Contents/Info.plist",
)

if (!existsSync(plistPath)) {
  // Hoisted install or non-mac platform — nothing to patch.
  process.exit(0)
}

for (const key of ["CFBundleName", "CFBundleDisplayName"]) {
  const current = readKey(key)
  if (current === PRODUCT_NAME) continue
  writeKey(key, PRODUCT_NAME)
  console.log(`patched ${key}: ${current} → ${PRODUCT_NAME}`)
}

function readKey(key) {
  try {
    return execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, plistPath], {
      encoding: "utf8",
    }).trim()
  } catch {
    return null
  }
}

function writeKey(key, value) {
  execFileSync("/usr/libexec/PlistBuddy", [
    "-c",
    `Set :${key} ${value}`,
    plistPath,
  ])
}
