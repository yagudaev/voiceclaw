// Main-process PostHog wrapper for VoiceClaw desktop.
//
// - Lazy-init on first use. We never import posthog-node at module top
//   level — that adds ~200ms to cold start on a quiet machine.
// - Distinct ID: a UUID stored in the SQLite settings table. Survives
//   reinstalls (same userData dir) but differs per Mac, so cross-Mac
//   identification stays separated unless the user signs in.
// - Opt-out: a `telemetry_opted_out` row in settings. When true,
//   identify/capture/captureException all become no-ops in O(1).
// - Failure modes never throw — telemetry errors are swallowed and
//   logged to console at debug level.

import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { PostHog } from 'posthog-node'
import { getDb } from './db'

const DISTINCT_ID_KEY = 'telemetry_distinct_id'
const OPT_OUT_KEY = 'telemetry_opted_out'

type CommonProps = Record<string, unknown>

let cachedClient: PostHog | null = null
let cachedDistinctId: string | null = null
let cachedOptOut: boolean | null = null

export function getDistinctId(): string {
  if (cachedDistinctId) return cachedDistinctId
  cachedDistinctId = readOrCreateDistinctId()
  return cachedDistinctId
}

export function isOptedOut(): boolean {
  if (cachedOptOut !== null) return cachedOptOut
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(OPT_OUT_KEY) as { value: string } | undefined
    cachedOptOut = row?.value === 'true'
  } catch {
    cachedOptOut = false
  }
  return cachedOptOut
}

export function setOptedOut(optedOut: boolean): void {
  try {
    const db = getDb()
    db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    ).run(OPT_OUT_KEY, optedOut ? 'true' : 'false', optedOut ? 'true' : 'false')
    cachedOptOut = optedOut
  } catch {
    // ignore
  }
}

export function identify(props?: CommonProps): void {
  if (isOptedOut()) return
  try {
    const client = ensureClient()
    if (!client) return
    client.identify({
      distinctId: getDistinctId(),
      properties: {
        $set: {
          ...props,
          app_version: app.getVersion(),
          platform: process.platform,
          arch: process.arch,
        },
      },
    })
  } catch {
    // never throw
  }
}

export function capture(event: string, props?: CommonProps): void {
  if (isOptedOut()) return
  try {
    const client = ensureClient()
    if (!client) return
    client.capture({
      distinctId: getDistinctId(),
      event,
      properties: { app_version: app.getVersion(), ...props },
    })
  } catch {
    // never throw
  }
}

export function captureException(
  err: unknown,
  context?: CommonProps,
): void {
  if (isOptedOut()) return
  try {
    const client = ensureClient()
    if (!client) return
    const error = err instanceof Error ? err : new Error(String(err))
    client.captureException(error, getDistinctId(), {
      app_version: app.getVersion(),
      platform: process.platform,
      ...context,
    })
  } catch {
    // never throw
  }
}

export async function flush(): Promise<void> {
  try {
    await cachedClient?.flush()
  } catch {
    // never throw
  }
}

export async function shutdown(): Promise<void> {
  try {
    await cachedClient?.shutdown()
  } catch {
    // never throw
  }
}

// Wire process-level error handlers. Idempotent — safe to call once
// at app startup. We pair this with `before-quit` flushing in index.ts.
export function registerProcessHandlers(): void {
  process.on('uncaughtException', (err) => {
    captureException(err, { source: 'uncaughtException' })
  })
  process.on('unhandledRejection', (reason) => {
    captureException(reason, { source: 'unhandledRejection' })
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureClient(): PostHog | null {
  if (cachedClient) return cachedClient
  const token = resolveToken()
  if (!token) return null
  try {
    // Resolve the module via dynamic require. Avoids loading posthog-node
    // during bundler analysis if telemetry is never used.
    const { PostHog: PostHogCtor } = require('posthog-node') as typeof import('posthog-node')
    cachedClient = new PostHogCtor(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 5,
      flushInterval: 10_000,
    })
    return cachedClient
  } catch {
    return null
  }
}

function resolveToken(): string | undefined {
  // Both `NEXT_PUBLIC_…` (shared with website) and a `desktop`-specific
  // var are accepted. The shared var matches the spec from the user.
  return (
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ??
    process.env.VOICECLAW_POSTHOG_PROJECT_TOKEN
  )
}

function readOrCreateDistinctId(): string {
  try {
    const db = getDb()
    const existing = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(DISTINCT_ID_KEY) as { value: string } | undefined
    if (existing?.value) return existing.value

    const id = randomUUID()
    db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    ).run(DISTINCT_ID_KEY, id, id)
    return id
  } catch {
    // If the DB is unavailable, fall back to an in-memory UUID. This
    // means we lose stable identity across launches — fine for failure
    // mode but not normal operation.
    return randomUUID()
  }
}
