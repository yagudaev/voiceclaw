#!/usr/bin/env node
import { execSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(here, "..")
const stagingDir = join(desktopRoot, "dist-staging")
const sourcePkg = JSON.parse(readFileSync(join(desktopRoot, "package.json"), "utf8"))

step("clear staging dir", () => {
  if (existsSync(stagingDir)) rmSync(stagingDir, { recursive: true, force: true })
  mkdirSync(stagingDir, { recursive: true })
})

step("copy electron-vite output", () => {
  const outSrc = join(desktopRoot, "out")
  if (!existsSync(outSrc)) {
    throw new Error(`[stage-app] expected ${outSrc} to exist. Run \`yarn build\` first.`)
  }
  cpSync(outSrc, join(stagingDir, "out"), { recursive: true })
})

step("write minimal package.json (prod deps only)", () => {
  const stagedPkg = {
    name: sourcePkg.name,
    version: sourcePkg.version,
    private: true,
    main: sourcePkg.main,
    dependencies: sourcePkg.dependencies,
  }
  writeFileSync(join(stagingDir, "package.json"), JSON.stringify(stagedPkg, null, 2))
})

step("install production deps with npm (no workspace ambiguity)", () => {
  execSync("npm install --omit=dev --no-audit --no-fund --no-package-lock --ignore-scripts", {
    cwd: stagingDir,
    stdio: "inherit",
  })
})

step("rebuild better-sqlite3 against electron ABI", () => {
  const electronVersion = readElectronVersion()
  const rebuildBin = join(desktopRoot, "node_modules", ".bin", "electron-rebuild")
  execSync(
    `"${rebuildBin}" -f -w better-sqlite3 --module-dir "${stagingDir}" --version ${electronVersion}`,
    { stdio: "inherit", env: { ...process.env, npm_config_runtime: "electron" } },
  )
})

console.log(`\n[stage-app] staging dir ready at ${stagingDir}`)

function step(label, fn) {
  console.log(`\n[stage-app] ${label}`)
  fn()
}

function readElectronVersion() {
  const electronPkg = JSON.parse(
    readFileSync(join(desktopRoot, "node_modules", "electron", "package.json"), "utf8"),
  )
  return electronPkg.version
}
