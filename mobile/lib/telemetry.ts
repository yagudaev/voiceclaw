// Mobile-side PostHog wrapper. Uses posthog-react-native which handles
// the RN app lifecycle (foreground/background, screen tracking, native
// crash hooks) for us.
//
// - Lazy-init: the first call to getClient() spins up the SDK. We never
//   instantiate at module-top so importing this file is cheap.
// - Distinct ID: stored in the SQLite settings table so it's stable
//   across reinstalls of the same app on the same device.
// - Opt-out: a `telemetry_opted_out` setting flips every export to a
//   no-op. The toggle in the settings screen reads/writes the same row.

import { Platform } from 'react-native'
import Constants from 'expo-constants'
import PostHog from 'posthog-react-native'
import { getSetting, setSetting } from '@/db/settings'

// posthog-react-native's event-property type only allows JSON-serializable
// values (string | number | boolean | null | nested object/array). We
// keep `unknown` here for ergonomics at call sites, but cast on the way
// into capture() so the type system stays out of the way.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommonProps = Record<string, any>

const DISTINCT_ID_KEY = 'telemetry_distinct_id'
const OPT_OUT_KEY = 'telemetry_opted_out'

let cachedClient: PostHog | null = null
let cachedOptOut: boolean | null = null
let initPromise: Promise<PostHog | null> | null = null

export async function getClient(): Promise<PostHog | null> {
  if (cachedClient) return cachedClient
  if (initPromise) return initPromise
  initPromise = initClient()
  return initPromise
}

export async function captureMobile(
  event: string,
  props?: CommonProps,
): Promise<void> {
  try {
    if (await isOptedOut()) return
    const client = await getClient()
    client?.capture(event, props)
  } catch {
    // never throw
  }
}

export async function captureMobileException(
  err: unknown,
  context?: CommonProps,
): Promise<void> {
  try {
    if (await isOptedOut()) return
    const client = await getClient()
    if (!client) return
    const error = err instanceof Error ? err : new Error(String(err))
    client.captureException(error, context)
  } catch {
    // never throw
  }
}

export async function isOptedOut(): Promise<boolean> {
  if (cachedOptOut !== null) return cachedOptOut
  try {
    const v = await getSetting(OPT_OUT_KEY)
    cachedOptOut = v === 'true'
  } catch {
    cachedOptOut = false
  }
  return cachedOptOut
}

export async function setMobileOptedOut(optedOut: boolean): Promise<void> {
  cachedOptOut = optedOut
  await setSetting(OPT_OUT_KEY, optedOut ? 'true' : 'false')
  if (optedOut) {
    cachedClient?.optOut()
  } else {
    cachedClient?.optIn()
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function initClient(): Promise<PostHog | null> {
  try {
    const token =
      (Constants.expoConfig?.extra as Record<string, string> | undefined)
        ?.posthogProjectToken ??
      process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN ??
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    if (!token) return null
    const host =
      (Constants.expoConfig?.extra as Record<string, string> | undefined)
        ?.posthogHost ??
      process.env.EXPO_PUBLIC_POSTHOG_HOST ??
      process.env.NEXT_PUBLIC_POSTHOG_HOST ??
      'https://us.i.posthog.com'

    const distinctId = await readOrCreateDistinctId()

    const client = new PostHog(token, {
      host,
      bootstrap: { distinctId },
      captureAppLifecycleEvents: true,
      enableSessionReplay: false, // RN SR is opt-in beta; turn on later per-cohort
    })
    client.identify(distinctId, { platform: Platform.OS })

    if (await isOptedOut()) {
      client.optOut()
    }

    cachedClient = client
    return client
  } catch {
    return null
  }
}

async function readOrCreateDistinctId(): Promise<string> {
  try {
    const existing = await getSetting(DISTINCT_ID_KEY)
    if (existing) return existing
    const id = generateUuid()
    await setSetting(DISTINCT_ID_KEY, id)
    return id
  } catch {
    return generateUuid()
  }
}

function generateUuid(): string {
  // RFC4122 v4 — small inline impl to avoid a uuid dep.
  const cryptoLike =
    (globalThis as unknown as { crypto?: { getRandomValues?: (b: Uint8Array) => Uint8Array } })
      .crypto
  const bytes = new Uint8Array(16)
  if (cryptoLike?.getRandomValues) {
    cryptoLike.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
