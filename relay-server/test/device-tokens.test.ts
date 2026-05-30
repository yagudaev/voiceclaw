import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { checkDeviceToken, touchDeviceToken } from "../src/device-tokens.js"

describe("checkDeviceToken", () => {
  let prevUrl: string | undefined
  let prevNonce: string | undefined

  beforeEach(() => {
    prevUrl = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    prevNonce = process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = "http://127.0.0.1:65535"
    process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = "nonce-xyz"
  })

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL
    else process.env.VOICECLAW_DEVICE_TOKEN_CHECK_URL = prevUrl
    if (prevNonce === undefined) delete process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE
    else process.env.VOICECLAW_DEVICE_TOKEN_CHECK_NONCE = prevNonce
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

function withFetch(fn: typeof fetch): Disposable {
  const original = globalThis.fetch
  globalThis.fetch = fn
  return {
    [Symbol.dispose]: () => {
      globalThis.fetch = original
    },
  }
}
