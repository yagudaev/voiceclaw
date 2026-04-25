#!/usr/bin/env node
// Rename the dev Electron.app bundle into a sibling VoiceClaw.app so
// Cmd+Tab and the Dock show "VoiceClaw" during `yarn dev` /
// `yarn dev:desktop`. macOS reads the Cmd+Tab label from the .app
// directory's filesystem name (Apple QA1544 / FileManager.displayName),
// so patching only Info.plist or app.setName() does not change what
// the OS displays — we have to launch from a differently-named bundle.
//
// Called from desktop/package.json#dev, not postinstall, so it only
// runs when someone actually starts the desktop app — installs across
// the monorepo stay free of side effects.
//
// Production is unaffected: electron-builder.yml#productName produces
// VoiceClaw.app for packaged DMGs.
//
// Idempotent: stamps the copy with the source bundle's CFBundleVersion
// and skips the rsync when they still match. Costs ~50ms when up to
// date.

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PRODUCT_NAME = "VoiceClaw"
// Distinct from production (com.getvoiceclaw.desktop) and from the
// shared "com.github.Electron" id every other dev Electron uses, so
// LaunchServices doesn't conflate this bundle's metadata with theirs.
const DEV_BUNDLE_ID = "com.getvoiceclaw.desktop.dev"
const VERSION_STAMP_KEY = "VoiceClawSourceVersion"

const __dirname = dirname(fileURLToPath(import.meta.url))
const electronPkg = resolve(__dirname, "..", "node_modules/electron")
const sourceApp = resolve(electronPkg, "dist/Electron.app")
const targetApp = resolve(electronPkg, `dist/${PRODUCT_NAME}.app`)
const sourcePlist = resolve(sourceApp, "Contents/Info.plist")
const targetPlist = resolve(targetApp, "Contents/Info.plist")
const pathTxt = resolve(electronPkg, "path.txt")
const lsregister =
  "/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"

if (process.platform !== "darwin" || !existsSync(sourceApp)) {
  process.exit(0)
}

const sourceVersion = readPlistKey(sourcePlist, "CFBundleVersion")
const stampedVersion = existsSync(targetPlist)
  ? readPlistKey(targetPlist, VERSION_STAMP_KEY)
  : null

let changed = false

if (!existsSync(targetApp) || stampedVersion !== sourceVersion) {
  execFileSync("rsync", ["-a", "--delete", `${sourceApp}/`, `${targetApp}/`])
  console.log(`[dev-name] synced VoiceClaw.app from Electron ${sourceVersion}`)
  changed = true
}

for (const [key, value] of [
  ["CFBundleName", PRODUCT_NAME],
  ["CFBundleDisplayName", PRODUCT_NAME],
  ["CFBundleIdentifier", DEV_BUNDLE_ID],
  [VERSION_STAMP_KEY, sourceVersion],
]) {
  if (readPlistKey(targetPlist, key) === value) continue
  writePlistKey(targetPlist, key, value)
  changed = true
}

const desiredPath = `${PRODUCT_NAME}.app/Contents/MacOS/Electron`
if (!existsSync(pathTxt) || readFileSync(pathTxt, "utf8") !== desiredPath) {
  // No trailing newline — electron's index.js reads the file verbatim
  // and an extra "\n" produces ENOENT on spawn.
  writeFileSync(pathTxt, desiredPath)
  changed = true
}

if (changed) {
  try {
    execFileSync("codesign", ["--force", "--sign", "-", targetApp], { stdio: "ignore" })
  } catch (err) {
    console.warn(`[dev-name] codesign refresh failed (non-fatal): ${err.message ?? err}`)
  }
  try {
    execFileSync(lsregister, ["-f", targetApp], { stdio: "ignore" })
  } catch (err) {
    console.warn(`[dev-name] lsregister failed (non-fatal): ${err.message ?? err}`)
  }
  // Dock caches Cmd+Tab labels per running app; restarting it is the
  // only way to make it pick up the new bundle metadata. launchd
  // respawns it in under a second, no user state is lost.
  try {
    execFileSync("killall", ["Dock"], { stdio: "ignore" })
  } catch {
    // Dock may not be running in CI / non-interactive shells.
  }
}

function readPlistKey(plistPath: string, key: string): string | null {
  try {
    return execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, plistPath], {
      encoding: "utf8",
    }).trim()
  } catch {
    return null
  }
}

function writePlistKey(plistPath: string, key: string, value: string): void {
  try {
    execFileSync("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${value}`, plistPath])
  } catch {
    // Key doesn't exist yet — add it. We only ever write strings.
    execFileSync("/usr/libexec/PlistBuddy", [
      "-c",
      `Add :${key} string ${value}`,
      plistPath,
    ])
  }
}
