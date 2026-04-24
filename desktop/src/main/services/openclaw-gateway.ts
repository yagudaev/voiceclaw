import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { allocatePort } from '../ports'
import { serviceManager } from './service-manager'

// Bundled OpenClaw gateway spawn. The actual signed binary ships under
// Resources/bin/openclaw-gateway after PR #0 (yagudaev/openclaw release
// pipeline) lands. For now this module locates the binary (if present)
// and wires it into the service manager. If the binary is missing, we
// log and skip — the user can still point at an external endpoint via
// the Brain step of the wizard.

export async function startBundledOpenClaw(): Promise<void> {
  const binaryPath = resolveBundledBinary()
  if (!binaryPath) {
    console.info('[openclaw] bundled binary not found; skipping spawn')
    return
  }

  const port = await allocatePort('openclawGateway')

  await serviceManager.start({
    name: 'openclawGateway',
    command: binaryPath,
    args: ['gateway', '--port', String(port)],
    env: {
      // OpenClaw respects the prod config dir by default; we don't pass
      // OPENCLAW_SKIP_CHANNELS here (would disable telegram per
      // project_openclaw_fork_runtime.md).
    },
    port,
    healthCheckUrl: `http://127.0.0.1:${port}/health`,
    logFile: 'openclaw-gateway.log',
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveBundledBinary(): string | null {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  const binaryName = `openclaw-gateway-darwin-${arch}`

  // Packaged: Resources/bin/openclaw-gateway-darwin-<arch>
  if (app.isPackaged) {
    const packaged = join(process.resourcesPath, 'bin', binaryName)
    return existsSync(packaged) ? packaged : null
  }

  // Dev: look under desktop/resources/bin/ relative to __dirname.
  const dev = join(__dirname, '..', '..', 'resources', 'bin', binaryName)
  return existsSync(dev) ? dev : null
}
