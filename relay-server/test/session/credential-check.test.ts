// Locks the order in which checkRelayCredential evaluates auth paths.
// Order is load-bearing:
//   1. RELAY_ALLOW_UNAUTHENTICATED dev hatch
//   2. RELAY_API_KEY master key (timing-safe compare)
//   3. per-device token via the localhost bridge
// Most critical regression: the master-key path MUST succeed without
// touching the device-token bridge, because that's how the desktop
// self-connects and how `yarn dev` reaches the relay. An earlier
// auth change broke this and locked everyone out.

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { __resetBridgeDiscoveryCacheForTests } from "../../src/device-tokens.js"
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
  let prevDiscoveryFile: string | undefined

  beforeEach(() => {
    prevRelayKey = process.env.RELAY_API_KEY
    prevAllow = process.env.RELAY_ALLOW_UNAUTHENTICATED
    prevUrl = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    prevNonce = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    prevDiscoveryFile = process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE
    delete process.env.RELAY_API_KEY
    delete process.env.RELAY_ALLOW_UNAUTHENTICATED
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE = "/tmp/voiceclaw-credcheck-no-such-discovery.json"
    __resetBridgeDiscoveryCacheForTests()
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
    if (prevDiscoveryFile === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE
    else process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE = prevDiscoveryFile
    __resetBridgeDiscoveryCacheForTests()
  })

  it("(1) dev-hatch: RELAY_ALLOW_UNAUTHENTICATED=true allows anything (even no key)", async () => {
    process.env.RELAY_ALLOW_UNAUTHENTICATED = "true"
    using _ = withFetch(async () => {
      throw new Error("fetch must not be called on the dev-hatch path")
    })
    const result = await checkRelayCredential(undefined)
    expect(result).toEqual({ ok: true, via: "dev-hatch" })
  })

  it("(2) master-key: RELAY_API_KEY matches => via=master-key, without calling the bridge", async () => {
    process.env.RELAY_API_KEY = "the-real-key"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "should-not-be-used"
    let called = false
    using _ = withFetch(async () => {
      called = true
      return new Response("nope", { status: 500 })
    })
    const result = await checkRelayCredential("the-real-key")
    expect(result).toEqual({ ok: true, via: "master-key" })
    expect(called).toBe(false)
  })

  it("(2) master-key: rejects a wrong key with constant-time compare even when same length", async () => {
    process.env.RELAY_API_KEY = "the-real-key" // 12 chars
    using _ = withFetch(async () =>
      new Response(JSON.stringify({ ok: false }), { status: 200 }),
    )
    const result = await checkRelayCredential("the-fake-key") // 12 chars
    expect(result.ok).toBe(false)
  })

  it("(3) device-token: bridge says ok => via=device-token with deviceId", async () => {
    process.env.RELAY_API_KEY = "the-real-key"
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

  it("(3) device-token: bridge says revoked => reject with token-unknown reason", async () => {
    process.env.RELAY_API_KEY = "the-real-key"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "n"
    using _ = withFetch(async () =>
      new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )
    const result = await checkRelayCredential("vcd_revoked-token")
    expect(result).toEqual({ ok: false, reason: "master-key-mismatch-token-unknown" })
  })

  it("reject: no RELAY_API_KEY + no bridge env + no dev-hatch => no-bridge reason", async () => {
    let called = false
    using _ = withFetch(async () => {
      called = true
      return new Response("{}", { status: 200 })
    })
    const result = await checkRelayCredential("anything")
    expect(result).toEqual({ ok: false, reason: "master-key-mismatch-no-bridge" })
    expect(called).toBe(false) // env-gated short-circuit before fetch
  })

  it("self-connect regression: master RELAY_API_KEY authenticates with NO device-token bridge env at all", async () => {
    // This is the exact scenario that broke: desktop self-connects with the
    // bundled RELAY_API_KEY before any per-device token bridge exists.
    process.env.RELAY_API_KEY = "bundled-desktop-key-uuid"
    // VOICECLAW_DEVICE_TOKEN_CHECK_URL / NONCE intentionally absent.
    let fetchCalled = false
    using _ = withFetch(async () => {
      fetchCalled = true
      return new Response("fail", { status: 500 })
    })
    const ok = await checkRelayCredential("bundled-desktop-key-uuid")
    expect(ok).toEqual({ ok: true, via: "master-key" })
    expect(fetchCalled).toBe(false)
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

  it("reject: non-string provided value reports no-credential", async () => {
    process.env.RELAY_API_KEY = "x"
    expect(await checkRelayCredential(undefined)).toEqual({ ok: false, reason: "no-credential" })
    expect(await checkRelayCredential(null)).toEqual({ ok: false, reason: "no-credential" })
    expect(await checkRelayCredential(123 as unknown)).toEqual({ ok: false, reason: "no-credential" })
  })
})

describe("checkRelayCredential — discovery-file fallback", () => {
  let cleanup: Array<() => void> = []
  let prev: Record<string, string | undefined> = {}

  beforeEach(async () => {
    prev = {
      RELAY_API_KEY: process.env.RELAY_API_KEY,
      RELAY_ALLOW_UNAUTHENTICATED: process.env.RELAY_ALLOW_UNAUTHENTICATED,
      VOICECLAW_DEVICE_TOKEN_CHECK_URL: process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL,
      VOICECLAW_DEVICE_TOKEN_CHECK_NONCE: process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE,
      VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE: process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE,
    }
    delete process.env.RELAY_API_KEY
    delete process.env.RELAY_ALLOW_UNAUTHENTICATED
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    __resetBridgeDiscoveryCacheForTests()
  })

  afterEach(() => {
    for (const fn of cleanup) fn()
    cleanup = []
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    __resetBridgeDiscoveryCacheForTests()
  })

  it("validates a device token using the discovery file when env URL/NONCE are unset", async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs")
    const { tmpdir } = await import("node:os")
    const { join } = await import("node:path")
    const dir = mkdtempSync(join(tmpdir(), "vc-disc-"))
    cleanup.push(() => rmSync(dir, { recursive: true, force: true }))
    const path = join(dir, "device-token-bridge.json")
    writeFileSync(path, JSON.stringify({ url: "http://127.0.0.1:55555", nonce: "disc-nonce" }))
    process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE = path
    __resetBridgeDiscoveryCacheForTests()
    let observedHeader: string | undefined
    using _ = withFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string> | undefined
      observedHeader = h?.["x-voiceclaw-nonce"]
      return new Response(JSON.stringify({ ok: true, deviceId: "phone-disc" }), { status: 200 })
    })
    const result = await checkRelayCredential("vcd_some-paired-token")
    expect(result).toEqual({ ok: true, via: "device-token", deviceId: "phone-disc" })
    expect(observedHeader).toBe("disc-nonce")
  })

  it("uses live discovery file even when stale env URL/NONCE are also present", async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs")
    const { tmpdir } = await import("node:os")
    const { join } = await import("node:path")
    const dir = mkdtempSync(join(tmpdir(), "vc-disc-stale-env-"))
    cleanup.push(() => rmSync(dir, { recursive: true, force: true }))
    const path = join(dir, "device-token-bridge.json")
    writeFileSync(
      path,
      JSON.stringify({
        url: "http://127.0.0.1:55556",
        nonce: "live-nonce",
        pid: process.pid,
      }),
    )
    process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE = path
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "stale-env-nonce"
    __resetBridgeDiscoveryCacheForTests()
    let observedHeader: string | undefined
    let observedUrl: string | undefined
    using _ = withFetch(async (input, init) => {
      observedUrl = String(input)
      const h = init?.headers as Record<string, string> | undefined
      observedHeader = h?.["x-voiceclaw-nonce"]
      return new Response(JSON.stringify({ ok: true, deviceId: "phone-fresh" }), { status: 200 })
    })
    const result = await checkRelayCredential("vcd_paired")
    expect(result).toEqual({ ok: true, via: "device-token", deviceId: "phone-fresh" })
    expect(observedHeader).toBe("live-nonce")
    expect(observedUrl).toContain("127.0.0.1:55556")
  })

  it("falls back to env when discovery file's pid is dead", async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs")
    const { tmpdir } = await import("node:os")
    const { join } = await import("node:path")
    const dir = mkdtempSync(join(tmpdir(), "vc-disc-dead-"))
    cleanup.push(() => rmSync(dir, { recursive: true, force: true }))
    const path = join(dir, "device-token-bridge.json")
    writeFileSync(
      path,
      JSON.stringify({
        url: "http://127.0.0.1:55557",
        nonce: "dead-disc-nonce",
        pid: 2_147_483_646,
      }),
    )
    process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE = path
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:55558"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "env-nonce"
    __resetBridgeDiscoveryCacheForTests()
    let observedHeader: string | undefined
    using _ = withFetch(async (_input, init) => {
      const h = init?.headers as Record<string, string> | undefined
      observedHeader = h?.["x-voiceclaw-nonce"]
      return new Response(JSON.stringify({ ok: true, deviceId: "phone-env" }), { status: 200 })
    })
    const result = await checkRelayCredential("vcd_paired")
    expect(result).toEqual({ ok: true, via: "device-token", deviceId: "phone-env" })
    expect(observedHeader).toBe("env-nonce")
  })
})
