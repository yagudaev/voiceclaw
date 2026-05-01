#!/usr/bin/env node
// Build the ax-capture Swift sidecar as a universal binary and stage it
// under desktop/resources/bin/ so electron-builder picks it up via
// extraResources.
//
// Output: desktop/resources/bin/ax-capture (arm64+x86_64 universal)
import { execSync, spawnSync } from "node:child_process"
import { mkdirSync, copyFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(here, "..")
const pkgDir = resolve(desktopRoot, "native/ax-capture")
const outDir = resolve(desktopRoot, "resources/bin")
const outBin = resolve(outDir, "ax-capture")

if (!existsSync(pkgDir)) {
  console.error(`[build-ax-capture] package missing: ${pkgDir}`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

const archs = ["arm64", "x86_64"]
const builtBins = []
for (const arch of archs) {
  console.log(`[build-ax-capture] swift build --arch ${arch}`)
  const r = spawnSync(
    "swift",
    ["build", "-c", "release", "--arch", arch, "--package-path", pkgDir],
    { stdio: "inherit" },
  )
  if (r.status !== 0) {
    if (arch === "x86_64") {
      console.warn(
        "[build-ax-capture] x86_64 build failed (likely missing toolchain on Apple Silicon CI). Falling back to arm64-only.",
      )
      continue
    }
    process.exit(r.status ?? 1)
  }
  const built = execSync(
    `swift build -c release --arch ${arch} --package-path "${pkgDir}" --show-bin-path`,
  ).toString().trim()
  builtBins.push(resolve(built, "AXCapture"))
}

if (builtBins.length === 0) {
  console.error("[build-ax-capture] no architectures built")
  process.exit(1)
}

if (builtBins.length === 1) {
  copyFileSync(builtBins[0], outBin)
} else {
  spawnSync("lipo", ["-create", "-output", outBin, ...builtBins], { stdio: "inherit" })
}
spawnSync("chmod", ["+x", outBin])

console.log(`[build-ax-capture] -> ${outBin}`)
