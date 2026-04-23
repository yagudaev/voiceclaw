import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

// better-sqlite3 is a native module. Next.js's server-components bundler needs
// to treat it as external so it isn't re-bundled for the server runtime.
//
// `outputFileTracingRoot` is pinned to this workspace to silence Next's
// "multiple lockfiles" warning when the repo is opened inside a broader yarn
// root (e.g. `~/code/yarn.lock` in a monorepo parent).
const __dirname = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingRoot: __dirname,
}

export default nextConfig
