#!/usr/bin/env node
// In dev (`yarn dev`), Electron runs from node_modules/electron and
// shows up in macOS Cmd+Tab as "Electron" with a generic icon. The
// label that Cmd+Tab renders comes from the .app directory's
// filesystem name (Apple QA1544 — `FileManager.displayName(atPath:)`
// uses the bundle folder name in preference to CFBundleName when they
// disagree), so patching only the Info.plist or renaming the binary
// inside the bundle does NOT change what Cmd+Tab displays.
//
// What does work: ship a sibling .app whose folder name is
// "VoiceClaw.app". This script rsyncs node_modules/electron's
// Electron.app into a sibling VoiceClaw.app and points the electron
// npm package's path.txt at the copy so electron-vite spawns the
// renamed bundle. The original Electron.app is left untouched —
// electron-rebuild and any other consumer that hardcodes that path
// keeps working.
//
// Idempotent: re-running on an already-prepared copy refreshes
// LaunchServices but doesn't re-rsync.

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PRODUCT_NAME = "VoiceClaw"
// Distinct from production (com.getvoiceclaw.desktop) and from the
// shared "com.github.Electron" id every other dev Electron uses, so
// LaunchServices doesn't conflate this bundle's metadata with theirs.
const DEV_BUNDLE_ID = "com.getvoiceclaw.desktop.dev"

const __dirname = dirname(fileURLToPath(import.meta.url))
const electronPkg = resolve(__dirname, "..", "node_modules/electron")
const sourceApp = resolve(electronPkg, "dist/Electron.app")
const targetApp = resolve(electronPkg, `dist/${PRODUCT_NAME}.app`)
const targetPlist = resolve(targetApp, "Contents/Info.plist")
const pathTxt = resolve(electronPkg, "path.txt")
const lsregister =
  "/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"

if (!existsSync(sourceApp)) {
  // Hoisted install or non-mac platform — nothing to patch.
  process.exit(0)
}

let changed = false

if (!existsSync(targetApp)) {
  execFileSync("rsync", ["-a", `${sourceApp}/`, `${targetApp}/`])
  console.log(`copied ${sourceApp} → ${targetApp}`)
  changed = true
}

for (const [key, value] of [
  ["CFBundleName", PRODUCT_NAME],
  ["CFBundleDisplayName", PRODUCT_NAME],
  ["CFBundleIdentifier", DEV_BUNDLE_ID],
]) {
  const current = readPlistKey(targetPlist, key)
  if (current === value) continue
  writePlistKey(targetPlist, key, value)
  console.log(`patched ${key}: ${current} → ${value}`)
  changed = true
}

const desiredPath = `${PRODUCT_NAME}.app/Contents/MacOS/Electron`
if (existsSync(pathTxt)) {
  const current = readFileSync(pathTxt, "utf8").trim()
  if (current !== desiredPath) {
    writeFileSync(pathTxt, desiredPath)
    console.log(`patched path.txt: ${current} → ${desiredPath}`)
    changed = true
  }
}

if (changed) {
  // Re-sign ad-hoc — Info.plist is not bound to the original
  // signature, but re-signing is cheap and keeps the bundle clean.
  try {
    execFileSync("codesign", ["--force", "--sign", "-", targetApp], {
      stdio: "ignore",
    })
  } catch (err) {
    console.warn(`codesign refresh failed (non-fatal): ${err.message ?? err}`)
  }
  try {
    execFileSync(lsregister, ["-f", targetApp], { stdio: "ignore" })
  } catch (err) {
    console.warn(`lsregister -f failed (non-fatal): ${err.message ?? err}`)
  }
  // Restart the Dock so Cmd+Tab picks up the new bundle name on its
  // next render. launchd respawns it in under a second.
  try {
    execFileSync("killall", ["Dock"], { stdio: "ignore" })
  } catch {
    // Dock may not be running in CI / non-interactive shells.
  }
}

function readPlistKey(plistPath, key) {
  try {
    return execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, plistPath], {
      encoding: "utf8",
    }).trim()
  } catch {
    return null
  }
}

function writePlistKey(plistPath, key, value) {
  execFileSync("/usr/libexec/PlistBuddy", [
    "-c",
    `Set :${key} ${value}`,
    plistPath,
  ])
}
