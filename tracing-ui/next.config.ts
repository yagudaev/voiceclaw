import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

// @prisma/client ships native engine binaries; Next.js's server-components
// bundler needs to treat it as external so the engines aren't re-bundled for
// the server runtime (and so runtime file resolution works).
//
// `outputFileTracingRoot` is pinned to this workspace to silence Next's
// "multiple lockfiles" warning when the repo is opened inside a broader yarn
// root (e.g. `~/code/yarn.lock` in a monorepo parent).
const __dirname = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  outputFileTracingRoot: __dirname,
}

export default nextConfig
