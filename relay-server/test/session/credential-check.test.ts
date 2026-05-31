// Locks the order in which checkRelayCredential evaluates auth paths.
// Two paths after the master-key drop:
//   1. RELAY_ALLOW_UNAUTHENTICATED dev hatch
//   2. per-device token via the localhost bridge (this is how the
//      desktop's own 'system'-kind device token authenticates too)
// Most critical regression: a random UUID that happens to be lying
// around (e.g. an old `realtime_api_key` value from a pre-migration
// install) must NOT authenticate via any leftover master-key path.

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { checkRelayCredential } from "../../src/session.js"

function withFetch(fn: typeof fetch): Disposable {
  const original = globalThis.fetch
  globalThis.fetch = fn
  return {
    [Symbol.dispose]: () => {
      globalThis.fetch = original
    },
  }
}

describe("checkRelayCredential", () => {
  let prevRelayKey: string | undefined
  let prevAllow: string | undefined
  let prevUrl: string | undefined
  let prevNonce: string | undefined

  beforeEach(() => {
    prevRelayKey = process.env.RELAY_API_KEY
    prevAllow = process.env.RELAY_ALLOW_UNAUTHENTICATED
    prevUrl = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    prevNonce = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    delete process.env.RELAY_API_KEY
    delete process.env.RELAY_ALLOW_UNAUTHENTICATED
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
  })

  afterEach(() => {
    if (prevRelayKey === undefined) delete process.env.RELAY_API_KEY
    else process.env.RELAY_API_KEY = prevRelayKey
    if (prevAllow === undefined) delete process.env.RELAY_ALLOW_UNAUTHENTICATED
    else process.env.RELAY_ALLOW_UNAUTHENTICATED = prevAllow
    if (prevUrl === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    else process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = prevUrl
    if (prevNonce === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    else process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = prevNonce
  })

  it("(1) dev-hatch: RELAY_ALLOW_UNAUTHENTICATED=true allows anything (even no key)", async () => {
    process.env.RELAY_ALLOW_UNAUTHENTICATED = "true"
    using _ = withFetch(async () => {
      throw new Error("fetch must not be called on the dev-hatch path")
    })
    const result = await checkRelayCredential(undefined)
    expect(result).toEqual({ ok: true, via: "dev-hatch" })
  })

  it("(2) device-token: bridge says ok => via=device-token with deviceId", async () => {
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "n"
    using _ = withFetch(async () =>
      new Response(JSON.stringify({ ok: true, deviceId: "phone-7" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )
    const result = await checkRelayCredential("vcd_some-mobile-token")
    expect(result).toEqual({ ok: true, via: "device-token", deviceId: "phone-7" })
  })

  it("(2) device-token: bridge says revoked => reject overall", async () => {
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "n"
    using _ = withFetch(async () =>
      new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )
    const result = await checkRelayCredential("vcd_revoked-token")
    expect(result).toEqual({ ok: false })
  })

  it("no master-key tier: a stray RELAY_API_KEY env value does NOT authenticate matching input", async () => {
    // The pre-migration world treated this as a successful master-key match.
    // Post-migration: RELAY_API_KEY is ignored entirely, and only the
    // device-token bridge can vouch for the candidate.
    process.env.RELAY_API_KEY = "leftover-master-key-from-old-env"
    let bridgeCalled = false
    using _ = withFetch(async () => {
      bridgeCalled = true
      return new Response(JSON.stringify({ ok: false }), { status: 200 })
    })
    const result = await checkRelayCredential("leftover-master-key-from-old-env")
    expect(result).toEqual({ ok: false })
    expect(bridgeCalled).toBe(false) // bridge env not set; short-circuited
  })

  it("no master-key tier: an old realtime_api_key UUID hitting the relay with bridge env present is asked of the bridge, NOT of RELAY_API_KEY", async () => {
    process.env.RELAY_API_KEY = "leftover-master-key"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "n"
    let bridgeCalls = 0
    using _ = withFetch(async () => {
      bridgeCalls += 1
      return new Response(JSON.stringify({ ok: false }), { status: 200 })
    })
    // Even when the provided value EQUALS the leftover RELAY_API_KEY, it
    // must take the device-token path and fail when the bridge rejects it.
    const result = await checkRelayCredential("leftover-master-key")
    expect(result).toEqual({ ok: false })
    expect(bridgeCalls).toBe(1)
  })

  it("reject: no bridge env + no dev-hatch => no auth path can succeed", async () => {
    let called = false
    using _ = withFetch(async () => {
      called = true
      return new Response("{}", { status: 200 })
    })
    const result = await checkRelayCredential("anything")
    expect(result).toEqual({ ok: false })
    expect(called).toBe(false) // env-gated short-circuit before fetch
  })

  it("self-connect regression: desktop's 'system' device token authenticates via the bridge with no RELAY_API_KEY anywhere", async () => {
    // Post-migration shape: the desktop bootstraps a 'system'-kind row in
    // device_tokens and connects with its plaintext. The relay never sees
    // RELAY_API_KEY — only the bridge lookup matters.
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "n"
    using _ = withFetch(async () =>
      new Response(JSON.stringify({ ok: true, deviceId: "this-mac" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )
    const ok = await checkRelayCredential("vcd_system-token-plaintext")
    expect(ok).toEqual({ ok: true, via: "device-token", deviceId: "this-mac" })
  })

  it("self-connect regression: `yarn dev` (RELAY_ALLOW_UNAUTHENTICATED + no bridge) authenticates", async () => {
    process.env.RELAY_ALLOW_UNAUTHENTICATED = "true"
    let fetchCalled = false
    using _ = withFetch(async () => {
      fetchCalled = true
      return new Response("fail", { status: 500 })
    })
    const ok = await checkRelayCredential(undefined)
    expect(ok).toEqual({ ok: true, via: "dev-hatch" })
    expect(fetchCalled).toBe(false)
  })

  it("reject: non-string provided value", async () => {
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "n"
    expect(await checkRelayCredential(undefined)).toEqual({ ok: false })
    expect(await checkRelayCredential(null)).toEqual({ ok: false })
    expect(await checkRelayCredential(123 as unknown)).toEqual({ ok: false })
  })
})
