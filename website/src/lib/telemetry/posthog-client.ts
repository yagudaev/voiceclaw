// Client-side PostHog wrapper.
//
// - Lazy-init on the first call from the browser. We never run during SSR.
// - Bails cleanly (no-op) if the public token is missing so dev/preview
//   deploys without telemetry env vars still build and run.
// - Captures: pageviews, pageleaves, autocapture (clicks/forms),
//   session recordings (with input masking via [data-ph-mask]),
//   uncaught exceptions + unhandled promise rejections.

import type { PostHog } from "posthog-js"

type PostHogModule = typeof import("posthog-js")

let cachedClient: PostHog | null = null
let initPromise: Promise<PostHog | null> | null = null

export function isTelemetryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN)
}

export async function getClient(): Promise<PostHog | null> {
  if (typeof window === "undefined") return null
  if (cachedClient) return cachedClient
  if (!isTelemetryConfigured()) return null

  if (!initPromise) {
    initPromise = initClient()
  }
  return initPromise
}

export async function capture(
  event: string,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    const client = await getClient()
    client?.capture(event, props)
  } catch {
    // never throw from telemetry
  }
}

export async function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    const client = await getClient()
    if (!client) return
    const error = err instanceof Error ? err : new Error(String(err))
    client.captureException(error, context)
  } catch {
    // never throw from telemetry
  }
}

export async function identify(
  distinctId: string,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    const client = await getClient()
    client?.identify(distinctId, props)
  } catch {
    // never throw from telemetry
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function initClient(): Promise<PostHog | null> {
  try {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com"
    if (!token) return null

    const mod = (await import("posthog-js")) as unknown as PostHogModule
    const posthog = mod.default ?? (mod as unknown as PostHog)

    posthog.init(token, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      capture_exceptions: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-ph-mask]",
      } as Record<string, unknown>,
      person_profiles: "identified_only",
      loaded: () => {
        // PostHog auto-captures unhandled errors / rejections via
        // capture_exceptions: true. Nothing extra needed here.
      },
    })

    cachedClient = posthog
    return posthog
  } catch {
    return null
  }
}
