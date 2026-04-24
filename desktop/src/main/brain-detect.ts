import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Detect locally-installed brain CLIs (Claude, Codex) by shelling
// `which`. The renderer surfaces detected entries on step 5 so the
// user can pick a brain that already exists on their PATH instead of
// the bundled OpenClaw.

export type BrainDetection = {
  openclaw: { available: true } // bundled — always shown
  claude: { available: boolean; path?: string }
  codex: { available: boolean; path?: string }
}

export async function detectBrains(): Promise<BrainDetection> {
  const [claudePath, codexPath] = await Promise.all([whichSafe('claude'), whichSafe('codex')])
  return {
    openclaw: { available: true },
    claude: claudePath
      ? { available: true, path: claudePath }
      : { available: false },
    codex: codexPath ? { available: true, path: codexPath } : { available: false },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function whichSafe(name: string): Promise<string | null> {
  // Sanitize: only allow alphanumerics + dashes + underscores. We'll
  // pass this as an argv element to /usr/bin/which but defense-in-depth
  // never hurts when shelling out.
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return null
  try {
    const { stdout } = await execFileAsync('/usr/bin/which', [name], {
      timeout: 1500,
      env: {
        ...process.env,
        // Make sure homebrew paths resolve even when launched from
        // login items where PATH is minimal.
        PATH: [
          '/opt/homebrew/bin',
          '/usr/local/bin',
          '/usr/bin',
          '/bin',
          process.env.PATH ?? '',
        ]
          .filter(Boolean)
          .join(':'),
      },
    })
    const trimmed = stdout.trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}
