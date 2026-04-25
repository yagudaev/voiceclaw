#!/usr/bin/env node
// Renames the dev Electron.app bundle so Cmd+Tab, the Dock, and the
// Application menu show "VoiceClaw" instead of "Electron" during
// `yarn dev`. Packaged builds get this from electron-builder.yml's
// productName, but the dev binary lives in node_modules and ships
// branded as "Electron".
//
// What this patches (all idempotent):
//   1. Contents/Info.plist — CFBundleName, CFBundleDisplayName, and
//      CFBundleExecutable set to "VoiceClaw".
//   2. Contents/MacOS/Electron renamed (or hardlinked) to
//      Contents/MacOS/VoiceClaw. The binary itself is what argv[0]
//      becomes when electron-vite spawns it, and the kernel-level
//      argv[0] is what the Dock actually renders under the Cmd+Tab
//      icon — patching the Info.plist alone leaves it as "Electron".
//   3. node_modules/electron/path.txt — points at the renamed binary
//      so `require('electron')` (used by electron-vite to find the
//      executable) resolves to the new path.
//
// After patching we also touch the bundle, run lsregister -f, and
// restart the Dock so the metadata caches refresh.

import { execFileSync } from "node:child_process"
import {
  existsSync,
  readFileSync,
  renameSync,
  utimesSync,
  writeFileSync,
} from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PRODUCT_NAME = "VoiceClaw"
const __dirname = dirname(fileURLToPath(import.meta.url))
const electronPkg = resolve(__dirname, "..", "node_modules/electron")
const appBundle = resolve(electronPkg, "dist/Electron.app")
const plistPath = resolve(appBundle, "Contents/Info.plist")
const macosDir = resolve(appBundle, "Contents/MacOS")
const oldBinary = resolve(macosDir, "Electron")
const newBinary = resolve(macosDir, PRODUCT_NAME)
const pathTxt = resolve(electronPkg, "path.txt")
const lsregister =
  "/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"

if (!existsSync(plistPath)) {
  // Hoisted install or non-mac platform — nothing to patch.
  process.exit(0)
}

let patched = false
for (const key of ["CFBundleName", "CFBundleDisplayName", "CFBundleExecutable"]) {
  const current = readKey(key)
  if (current === PRODUCT_NAME) continue
  writeKey(key, PRODUCT_NAME)
  console.log(`patched ${key}: ${current} → ${PRODUCT_NAME}`)
  patched = true
}

// Rename the binary under the product name so the kernel-level
// argv[0] becomes "VoiceClaw". `ps -o ucomm` and the Dock's Cmd+Tab
// label both come from this — patching only Info.plist leaves them
// as "Electron".
if (existsSync(oldBinary) && !existsSync(newBinary)) {
  renameSync(oldBinary, newBinary)
  console.log(`renamed binary: Electron → ${PRODUCT_NAME}`)
  patched = true
}

// Point the electron npm package's path.txt at the renamed binary so
// electron-vite spawns it instead of the "Electron" name.
if (existsSync(pathTxt)) {
  const desired = `Electron.app/Contents/MacOS/${PRODUCT_NAME}`
  const current = readFileSync(pathTxt, "utf8").trim()
  if (current !== desired) {
    writeFileSync(pathTxt, desired)
    console.log(`patched path.txt: ${current} → ${desired}`)
    patched = true
  }
}

if (patched) {
  // Bump the bundle's mtime so LaunchServices treats it as changed.
  const now = new Date()
  utimesSync(appBundle, now, now)

  // Renaming a binary in an ad-hoc-signed bundle usually keeps the
  // signature valid (the signature is keyed on content, not name) but
  // re-signing ad-hoc is cheap insurance.
  try {
    execFileSync("codesign", ["--force", "--sign", "-", appBundle], {
      stdio: "ignore",
    })
  } catch (err) {
    console.warn(`codesign refresh failed (non-fatal): ${err.message ?? err}`)
  }
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
