#!/usr/bin/env node
import { execSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(here, "..")
const repoRoot = resolve(desktopRoot, "..")

step("fetch Node 22 runtime", () => run("node", ["scripts/fetch-node.mjs"], desktopRoot))
step("build relay-server bundle", () =>
  run("yarn", ["workspace", "relay-server", "run", "build:bundle"], repoRoot),
)
step("build openclaw bundle", () => run("node", ["scripts/build-openclaw-bundle.mjs"], desktopRoot))
step("build ax-capture sidecar", () => run("node", ["scripts/build-ax-capture.mjs"], desktopRoot))

function step(label, fn) {
  console.log(`\n[build-services] ${label}`)
  fn()
}

function run(cmd, args, cwd) {
  console.log(`[build-services] $ ${cmd} ${args.join(" ")}  (cwd=${cwd})`)
  execSync([cmd, ...args].join(" "), { cwd, stdio: "inherit" })
}
