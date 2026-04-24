// Server-side PostHog wrapper. Used by API routes to send events and
// captureException without dragging the browser SDK into Node.
//
// - Lazy-init in the request handler. Reuses a cached PostHog instance
//   across invocations within the same lambda warm.
// - Fails closed: if the token is missing or the SDK throws, every
//   exported function becomes a no-op.

import { PostHog as PostHogServer } from "posthog-node"

let cachedClient: PostHogServer | null = null

export function captureServerEvent(
  distinctId: string,
  event: string,
  props?: Record<string, unknown>,
): void {
  try {
    const client = ensureClient()
    client?.capture({ distinctId, event, properties: props })
  } catch {
    // never throw from telemetry
  }
}

export function captureServerException(
  err: unknown,
  options?: {
    distinctId?: string
    properties?: Record<string, unknown>
  },
): void {
  try {
    const client = ensureClient()
    if (!client) return
    const error = err instanceof Error ? err : new Error(String(err))
    client.captureException(error, options?.distinctId, options?.properties)
  } catch {
    // never throw from telemetry
  }
}

export async function flushServerEvents(): Promise<void> {
  try {
    await cachedClient?.flush()
  } catch {
    // never throw from telemetry
  }
}

// Wrap an API route handler so any thrown error is captured to PostHog
// before it bubbles back to Next. Returns the handler unmodified if
// telemetry is not configured.
export function withCapture<T extends (...args: never[]) => Promise<unknown>>(
  handler: T,
  routeName: string,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (err) {
      captureServerException(err, {
        distinctId: "server",
        properties: { route: routeName },
      })
      throw err
    }
  }) as T
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureClient(): PostHogServer | null {
  if (cachedClient) return cachedClient
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  if (!token) return null

  try {
    cachedClient = new PostHogServer(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    })
    return cachedClient
  } catch {
    return null
  }
}
