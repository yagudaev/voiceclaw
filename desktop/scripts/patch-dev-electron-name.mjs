#!/usr/bin/env node
// Renames the dev Electron.app bundle's display name from "Electron"
// to "VoiceClaw" so Cmd+Tab, the Dock, and the Application menu show
// the right product name during `yarn dev`. Packaged builds get this
// from electron-builder.yml's productName, but the dev binary lives in
// node_modules and ships with CFBundleName="Electron" by default.
//
// Patching Info.plist alone isn't enough: macOS LaunchServices caches
// bundle metadata by CFBundleIdentifier and won't pick up the new
// name on its own. We also touch the bundle and run lsregister -f to
// force a refresh.
//
// Idempotent: re-running on an already-patched bundle re-registers
// with LaunchServices but doesn't rewrite the plist.

import { execFileSync } from "node:child_process"
import { existsSync, utimesSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PRODUCT_NAME = "VoiceClaw"
const __dirname = dirname(fileURLToPath(import.meta.url))
const appBundle = resolve(
  __dirname,
  "..",
  "node_modules/electron/dist/Electron.app",
)
const plistPath = resolve(appBundle, "Contents/Info.plist")
const lsregister =
  "/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"

if (!existsSync(plistPath)) {
  // Hoisted install or non-mac platform — nothing to patch.
  process.exit(0)
}

let patched = false
for (const key of ["CFBundleName", "CFBundleDisplayName"]) {
  const current = readKey(key)
  if (current === PRODUCT_NAME) continue
  writeKey(key, PRODUCT_NAME)
  console.log(`patched ${key}: ${current} → ${PRODUCT_NAME}`)
  patched = true
}

if (patched) {
  // Bump the bundle's mtime so LaunchServices treats it as changed.
  const now = new Date()
  utimesSync(appBundle, now, now)
}

// Always re-register with LaunchServices. Cheap, and covers the case
// where the plist is already correct but the LS cache still has stale
// metadata from a prior run.
try {
  execFileSync(lsregister, ["-f", appBundle], { stdio: "ignore" })
} catch (err) {
  console.warn(`lsregister -f failed (non-fatal): ${err.message ?? err}`)
}

// Even after lsregister, the Dock's Cmd+Tab UI keeps a per-running-app
// label cache that is only invalidated when the Dock process itself
// restarts. Restarting it here is harmless — launchd respawns it in
// under a second and no user state is lost.
if (patched) {
  try {
    execFileSync("killall", ["Dock"], { stdio: "ignore" })
  } catch {
    // Dock may not be running in CI / non-interactive shells.
  }
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
