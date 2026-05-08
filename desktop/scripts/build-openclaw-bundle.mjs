#!/usr/bin/env node
import { execSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(here, "..")
const repoRoot = resolve(desktopRoot, "..")
const openclawSource = join(repoRoot, "vendor", "openclaw")
const stagingDir = join(desktopRoot, "resources", "openclaw")

if (!existsSync(join(openclawSource, "dist", "extensions"))) {
  console.error(
    `[openclaw-bundle] expected ${join(openclawSource, "dist")} to be built. ` +
      `Run \`pnpm install --frozen-lockfile && pnpm build\` in vendor/openclaw first.`,
  )
  process.exit(1)
}

if (existsSync(stagingDir)) rmSync(stagingDir, { recursive: true, force: true })
mkdirSync(stagingDir, { recursive: true })

console.log("[openclaw-bundle] running npm pack to capture published file set")
const packDir = join(desktopRoot, "resources", ".openclaw-pack")
if (existsSync(packDir)) rmSync(packDir, { recursive: true, force: true })
mkdirSync(packDir, { recursive: true })
execSync(`npm pack --pack-destination "${packDir}" --ignore-scripts --silent`, {
  cwd: openclawSource,
  stdio: "inherit",
})
const tarball = readdirSync(packDir).find((f) => f.endsWith(".tgz"))
if (!tarball) throw new Error(`[openclaw-bundle] npm pack produced no .tgz in ${packDir}`)
execSync(`tar -xzf "${join(packDir, tarball)}"`, { cwd: packDir, stdio: "inherit" })
const extracted = join(packDir, "package")
for (const entry of readdirSync(extracted)) {
  renameSync(join(extracted, entry), join(stagingDir, entry))
}
rmSync(packDir, { recursive: true, force: true })

console.log("[openclaw-bundle] installing production dependencies")
// `oxlint` declares an optional peer on `oxlint-tsgolint >= 0.22.1` but
// the lockfile's resolved version is older; npm's strict peer resolver
// fails the install. The dep is optional and not actually required for
// runtime, so let npm pick whichever is already there.
execSync("npm install --omit=dev --no-audit --no-fund --no-package-lock --ignore-scripts --legacy-peer-deps", {
  cwd: stagingDir,
  stdio: "inherit",
})

console.log("[openclaw-bundle] removing broken symlinks for electron-builder compatibility")
dropBrokenSymlinks(stagingDir)

console.log(`[openclaw-bundle] staged at ${stagingDir}`)

function dropBrokenSymlinks(root) {
  const queue = [root]
  let removed = 0
  let kept = 0
  while (queue.length) {
    const dir = queue.pop()
    let entries = []
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isSymbolicLink()) {
        try {
          statSync(full)
          kept += 1
        } catch {
          rmSync(full, { force: true })
          removed += 1
        }
      } else if (entry.isDirectory()) {
        queue.push(full)
      }
    }
  }
  console.log(`[openclaw-bundle] removed ${removed} broken symlinks, kept ${kept} valid symlinks`)
}
