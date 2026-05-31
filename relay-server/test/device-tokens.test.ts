import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  __resetBridgeDiscoveryCacheForTests,
  checkDeviceToken,
  getBridgeConfig,
  identifyDeviceToken,
  touchDeviceToken,
} from "../src/device-tokens.js"

describe("checkDeviceToken", () => {
  let prevUrl: string | undefined
  let prevNonce: string | undefined
  let prevDiscoveryFile: string | undefined
  let prevUserDataDir: string | undefined

  beforeEach(() => {
    prevUrl = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    prevNonce = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    prevDiscoveryFile = process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE
    prevUserDataDir = process.env.VOICECLAW_DESKTOP_USER_DATA_DIR
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "nonce-xyz"
    process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE = "/tmp/voiceclaw-test-no-such-discovery.json"
    __resetBridgeDiscoveryCacheForTests()
  })

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    else process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = prevUrl
    if (prevNonce === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    else process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = prevNonce
    if (prevDiscoveryFile === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE
    else process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE = prevDiscoveryFile
    if (prevUserDataDir === undefined) delete process.env.VOICECLAW_DESKTOP_USER_DATA_DIR
    else process.env.VOICECLAW_DESKTOP_USER_DATA_DIR = prevUserDataDir
    __resetBridgeDiscoveryCacheForTests()
  })

  it("posts the plaintext token to the bridge with the nonce header", async () => {
    let observedUrl: string | undefined
    let observedMethod: string | undefined
    let observedBody: string | undefined
    let observedHeaders: Record<string, string> | undefined
    using _ = withFetch(async (input, init) => {
      observedUrl = String(input)
      observedMethod = init?.method
      observedBody = typeof init?.body === "string" ? init.body : ""
      observedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({ ok: true, deviceId: "dev-42" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    })
    const result = await checkDeviceToken("vcd_plaintext")
    expect(result).toEqual({ ok: true, deviceId: "dev-42" })

    expect(observedMethod).toBe("POST")
    expect(observedUrl).toContain("/device-token/check")
    expect(observedUrl).not.toContain("vcd_plaintext")
    expect(JSON.parse(observedBody ?? "")).toEqual({ token: "vcd_plaintext" })
    expect(observedHeaders?.["x-voiceclaw-nonce"]).toBe("nonce-xyz")
  })

  it("returns not-ok when the bridge says ok: false (revoked or unknown)", async () => {
    using _ = withFetch(async () =>
      new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )
    expect(await checkDeviceToken("vcd_revoked")).toEqual({ ok: false })
  })

  it("returns not-ok when the bridge env vars are absent (standalone dev)", async () => {
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    using _ = withFetch(async () => {
      throw new Error("fetch must not be called when env is absent")
    })
    expect(await checkDeviceToken("vcd_any")).toEqual({ ok: false })
  })

  it("returns not-ok for non-string input without calling the bridge", async () => {
    let called = false
    using _ = withFetch(async () => {
      called = true
      return new Response("nope", { status: 200 })
    })
    expect(await checkDeviceToken(undefined)).toEqual({ ok: false })
    expect(await checkDeviceToken(null)).toEqual({ ok: false })
    expect(await checkDeviceToken(42 as unknown)).toEqual({ ok: false })
    expect(await checkDeviceToken("")).toEqual({ ok: false })
    expect(called).toBe(false)
  })

  it("returns not-ok when the bridge returns a non-2xx status", async () => {
    using _ = withFetch(async () =>
      new Response("forbidden", { status: 403 }),
    )
    expect(await checkDeviceToken("vcd_x")).toEqual({ ok: false })
  })

  it("returns not-ok when the bridge throws", async () => {
    using _ = withFetch(async () => {
      throw new Error("ECONNREFUSED")
    })
    expect(await checkDeviceToken("vcd_x")).toEqual({ ok: false })
  })

  it("touchDeviceToken is a no-op when env is absent", async () => {
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    using _ = withFetch(async () => {
      throw new Error("fetch must not be called")
    })
    await touchDeviceToken("dev-1") // does not throw
  })

  it("identifyDeviceToken posts the plaintext token + name with the nonce", async () => {
    const seen: { url: string; body: string; headers: Record<string, string> }[] = []
    using _ = withFetch(async (input, init) => {
      seen.push({
        url: String(input),
        body: typeof init?.body === "string" ? init.body : "",
        headers: init?.headers as Record<string, string>,
      })
      return new Response(JSON.stringify({ ok: true, renamed: true }), { status: 200 })
    })
    await identifyDeviceToken("vcd_xyz", "Michael's iPhone")
    expect(seen).toHaveLength(1)
    expect(seen[0].url).toContain("/device-token/identify")
    expect(JSON.parse(seen[0].body)).toEqual({ token: "vcd_xyz", name: "Michael's iPhone" })
    expect(seen[0].headers["x-voiceclaw-nonce"]).toBe("nonce-xyz")
  })

  it("identifyDeviceToken is a no-op for blank name or missing env", async () => {
    let called = 0
    using _ = withFetch(async () => {
      called++
      return new Response("{}", { status: 200 })
    })
    await identifyDeviceToken("vcd_xyz", "   ")
    expect(called).toBe(0)
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    await identifyDeviceToken("vcd_xyz", "Phone")
    expect(called).toBe(0)
  })

  it("touchDeviceToken posts the device id with the nonce", async () => {
    const seen: { url: string; body: string; headers: Record<string, string> }[] = []
    using _ = withFetch(async (input, init) => {
      const body = typeof init?.body === "string" ? init.body : ""
      seen.push({
        url: String(input),
        body,
        headers: init?.headers as Record<string, string>,
      })
      return new Response("{}", { status: 200 })
    })
    await touchDeviceToken("dev-42")
    expect(seen).toHaveLength(1)
    expect(seen[0].url).toContain("/device-token/touch")
    expect(JSON.parse(seen[0].body)).toEqual({ id: "dev-42" })
    expect(seen[0].headers["x-voiceclaw-nonce"]).toBe("nonce-xyz")
  })
})

describe("bridge discovery file fallback", () => {
  let tmp: string
  let discoveryPath: string
  let prevEnv: { url?: string; nonce?: string; discoveryFile?: string; userDataDir?: string } = {}

  beforeEach(() => {
    prevEnv = {
      url: process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL,
      nonce: process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE,
      discoveryFile: process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE,
      userDataDir: process.env.VOICECLAW_DESKTOP_USER_DATA_DIR,
    }
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    tmp = mkdtempSync(join(tmpdir(), "voiceclaw-discovery-"))
    discoveryPath = join(tmp, "device-token-bridge.json")
    process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE = discoveryPath
    __resetBridgeDiscoveryCacheForTests()
  })

  afterEach(() => {
    if (prevEnv.url === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    else process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = prevEnv.url
    if (prevEnv.nonce === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    else process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = prevEnv.nonce
    if (prevEnv.discoveryFile === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE
    else process.env.VOICECLAW_DEVICE_TOKEN_DISCOVERY_FILE = prevEnv.discoveryFile
    if (prevEnv.userDataDir === undefined) delete process.env.VOICECLAW_DESKTOP_USER_DATA_DIR
    else process.env.VOICECLAW_DESKTOP_USER_DATA_DIR = prevEnv.userDataDir
    rmSync(tmp, { recursive: true, force: true })
    __resetBridgeDiscoveryCacheForTests()
  })

  it("returns null when neither env nor file is present", () => {
    expect(getBridgeConfig()).toBeNull()
  })

  it("reads {url, nonce} from the discovery file when env is unset", () => {
    writeFileSync(
      discoveryPath,
      JSON.stringify({ url: "http://127.0.0.1:55555", nonce: "disc-nonce", pid: process.pid }),
    )
    const cfg = getBridgeConfig()
    expect(cfg?.url).toBe("http://127.0.0.1:55555")
    expect(cfg?.nonce).toBe("disc-nonce")
    expect(cfg?.source).toBe("discovery")
  })

  it("discovery file wins over env when both are present and the discovery pid is alive", () => {
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:11111"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "env-nonce"
    writeFileSync(
      discoveryPath,
      JSON.stringify({ url: "http://127.0.0.1:55555", nonce: "disc-nonce", pid: process.pid }),
    )
    const cfg = getBridgeConfig()
    expect(cfg?.source).toBe("discovery")
    expect(cfg?.url).toBe("http://127.0.0.1:55555")
    expect(cfg?.nonce).toBe("disc-nonce")
  })

  it("env wins when the discovery file's pid is dead (stale leftover from a crashed desktop)", () => {
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:11111"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "env-nonce"
    const deadPid = 2_147_483_646
    writeFileSync(
      discoveryPath,
      JSON.stringify({ url: "http://127.0.0.1:55555", nonce: "disc-nonce", pid: deadPid }),
    )
    const cfg = getBridgeConfig()
    expect(cfg?.source).toBe("env")
    expect(cfg?.url).toBe("http://127.0.0.1:11111")
  })

  it("env wins when the discovery file has no pid (older bridge writer)", () => {
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:11111"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "env-nonce"
    writeFileSync(
      discoveryPath,
      JSON.stringify({ url: "http://127.0.0.1:55555", nonce: "disc-nonce" }),
    )
    const cfg = getBridgeConfig()
    expect(cfg?.source).toBe("env")
  })

  it("discovery file is used when env points at a dead bridge and discovery pid is alive", () => {
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "stale-env-nonce"
    writeFileSync(
      discoveryPath,
      JSON.stringify({ url: "http://127.0.0.1:55555", nonce: "live-disc-nonce", pid: process.pid }),
    )
    const cfg = getBridgeConfig()
    expect(cfg?.source).toBe("discovery")
    expect(cfg?.nonce).toBe("live-disc-nonce")
  })

  it("uses discovery file to validate a token via the relay's bridge call", async () => {
    writeFileSync(
      discoveryPath,
      JSON.stringify({ url: "http://127.0.0.1:55555", nonce: "disc-nonce" }),
    )
    let observedHeaders: Record<string, string> | undefined
    using _ = withFetch(async (_input, init) => {
      observedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({ ok: true, deviceId: "dev-disc" }), { status: 200 })
    })
    const result = await checkDeviceToken("vcd_plain")
    expect(result).toEqual({ ok: true, deviceId: "dev-disc" })
    expect(observedHeaders?.["x-voiceclaw-nonce"]).toBe("disc-nonce")
  })

  it("ignores a malformed discovery file (missing fields)", () => {
    writeFileSync(discoveryPath, JSON.stringify({ url: "http://127.0.0.1:1" }))
    expect(getBridgeConfig()).toBeNull()
  })
})

function withFetch(fn: typeof fetch): Disposable {
  const original = globalThis.fetch
  globalThis.fetch = fn
  return {
    [Symbol.dispose]: () => {
      globalThis.fetch = original
    },
  }
}
