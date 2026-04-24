// Renderer-side PostHog wrapper. Mirrors main/telemetry.ts but uses
// posthog-js for in-page session replay + autocapture. The distinct_id
// is fetched from main via IPC so events from both processes show up
// under one identity.

import posthog, { type PostHog } from 'posthog-js'

type CommonProps = Record<string, unknown>

const PROJECT_TOKEN = (import.meta as unknown as { env?: Record<string, string> }).env
  ?.VITE_POSTHOG_PROJECT_TOKEN
const POSTHOG_HOST = (import.meta as unknown as { env?: Record<string, string> }).env
  ?.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com'

let initialized = false
let optedOut = false
let initPromise: Promise<PostHog | null> | null = null

export async function initTelemetry(): Promise<PostHog | null> {
  if (initialized) return optedOut ? null : posthog
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      const electronAPI = (window as unknown as { electronAPI?: ElectronTelemetryAPI }).electronAPI
      if (!electronAPI) return null

      optedOut = await electronAPI.telemetry.getOptedOut()
      const distinctId = await electronAPI.telemetry.getDistinctId()
      if (!PROJECT_TOKEN) {
        initialized = true
        return null
      }

      posthog.init(PROJECT_TOKEN, {
        api_host: POSTHOG_HOST,
        bootstrap: { distinctID: distinctId },
        capture_pageview: false, // SPA-style — no pageviews in desktop
        autocapture: true,
        capture_exceptions: true,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '[data-ph-mask]',
        } as Record<string, unknown>,
        person_profiles: 'identified_only',
        opt_out_capturing_by_default: optedOut,
      })
      posthog.identify(distinctId, { platform: 'desktop' })
      initialized = true
      return optedOut ? null : posthog
    } catch {
      return null
    }
  })()
  return initPromise
}

export async function captureRenderer(event: string, props?: CommonProps): Promise<void> {
  try {
    const client = await initTelemetry()
    client?.capture(event, props)
  } catch {
    // never throw
  }
}

export async function captureRendererException(
  err: unknown,
  context?: CommonProps,
): Promise<void> {
  try {
    const client = await initTelemetry()
    if (!client) return
    const error = err instanceof Error ? err : new Error(String(err))
    client.captureException(error, context)
  } catch {
    // never throw
  }
}

export async function setOptedOutRenderer(value: boolean): Promise<void> {
  optedOut = value
  if (value) {
    posthog.opt_out_capturing()
  } else {
    posthog.opt_in_capturing()
  }
  const electronAPI = (window as unknown as { electronAPI?: ElectronTelemetryAPI }).electronAPI
  await electronAPI?.telemetry.setOptedOut(value)
}

export async function isOptedOutRenderer(): Promise<boolean> {
  const electronAPI = (window as unknown as { electronAPI?: ElectronTelemetryAPI }).electronAPI
  if (!electronAPI) return optedOut
  return electronAPI.telemetry.getOptedOut()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ElectronTelemetryAPI = {
  telemetry: {
    getDistinctId: () => Promise<string>
    getOptedOut: () => Promise<boolean>
    setOptedOut: (optedOut: boolean) => Promise<boolean>
    capture: (event: string, props?: CommonProps) => Promise<void>
    captureException: (
      err: { message: string, stack?: string },
      context?: CommonProps,
    ) => Promise<void>
  }
}
