import { describe, expect, it } from "vitest"
import { mapAdapterError } from "../../src/adapters/error-map.js"

describe("mapAdapterError — xAI", () => {
  it("401 → invalid key + settings URL", () => {
    const r = mapAdapterError("xai", 401, null)
    expect(r.userMessage).toBe("xAI API key invalid or revoked. Update it in Settings → Provider.")
    expect(r.actionUrl).toBe("voiceclaw://settings/provider")
  })

  it("402 → out of credits + billing URL", () => {
    const r = mapAdapterError("xai", 402, null)
    expect(r.userMessage).toBe("xAI account out of credits or hit spending limit. Top up to continue.")
    expect(r.actionUrl).toBe("https://console.x.ai/team")
  })

  it("429 → same as 402 (xAI uses 429 for credits too)", () => {
    const r = mapAdapterError("xai", 429, null)
    expect(r.userMessage).toBe("xAI account out of credits or hit spending limit. Top up to continue.")
    expect(r.actionUrl).toBe("https://console.x.ai/team")
  })

  it("403 → permissions + console URL", () => {
    const r = mapAdapterError("xai", 403, null)
    expect(r.userMessage).toBe("xAI rejected this request. Check API key permissions.")
    expect(r.actionUrl).toBe("https://console.x.ai")
  })

  it("500 → service error + status URL", () => {
    const r = mapAdapterError("xai", 500, null)
    expect(r.userMessage).toBe("xAI service is having issues. Try again in a moment.")
    expect(r.actionUrl).toBe("https://status.x.ai")
  })

  it("503 → service error", () => {
    const r = mapAdapterError("xai", 503, null)
    expect(r.userMessage).toContain("xAI service is having issues")
  })

  it("null status (1006 close) → generic closed message", () => {
    const r = mapAdapterError("xai", null, null)
    expect(r.userMessage).toBe("Connection to xAI closed unexpectedly. Try again.")
    expect(r.actionUrl).toBeNull()
  })
})

describe("mapAdapterError — OpenAI", () => {
  it("401 → invalid key + settings URL", () => {
    const r = mapAdapterError("openai", 401, null)
    expect(r.userMessage).toBe("OpenAI API key invalid or revoked. Update it in Settings → Provider.")
    expect(r.actionUrl).toBe("voiceclaw://settings/provider")
  })

  it("402 → quota exceeded + billing URL", () => {
    const r = mapAdapterError("openai", 402, null)
    expect(r.userMessage).toBe("OpenAI quota exceeded. Top up your account.")
    expect(r.actionUrl).toBe("https://platform.openai.com/account/billing")
  })

  it("429 with insufficient_quota body → quota exceeded + billing URL", () => {
    const r = mapAdapterError("openai", 429, '{"error":{"type":"insufficient_quota"}}')
    expect(r.userMessage).toBe("OpenAI quota exceeded. Top up your account.")
    expect(r.actionUrl).toBe("https://platform.openai.com/account/billing")
  })

  it("429 without insufficient_quota body → rate limit, no URL", () => {
    const r = mapAdapterError("openai", 429, '{"error":{"type":"rate_limit_exceeded"}}')
    expect(r.userMessage).toBe("OpenAI rate limit. Try again in a moment.")
    expect(r.actionUrl).toBeNull()
  })

  it("500 → service error + status URL", () => {
    const r = mapAdapterError("openai", 500, null)
    expect(r.userMessage).toBe("OpenAI service is having issues. Try again in a moment.")
    expect(r.actionUrl).toBe("https://status.openai.com")
  })

  it("null status → generic closed message", () => {
    const r = mapAdapterError("openai", null, null)
    expect(r.userMessage).toBe("Connection to OpenAI closed unexpectedly. Try again.")
    expect(r.actionUrl).toBeNull()
  })
})

describe("mapAdapterError — Gemini", () => {
  it("401 → invalid key + settings URL", () => {
    const r = mapAdapterError("gemini", 401, null)
    expect(r.userMessage).toBe("Gemini API key invalid. Update it in Settings → Provider.")
    expect(r.actionUrl).toBe("voiceclaw://settings/provider")
  })

  it("403 → invalid key + settings URL (same as 401 for Gemini)", () => {
    const r = mapAdapterError("gemini", 403, null)
    expect(r.userMessage).toBe("Gemini API key invalid. Update it in Settings → Provider.")
    expect(r.actionUrl).toBe("voiceclaw://settings/provider")
  })

  it("429 → quota exceeded + AI Studio URL", () => {
    const r = mapAdapterError("gemini", 429, null)
    expect(r.userMessage).toBe("Gemini quota exceeded. Top up or wait for the daily reset.")
    expect(r.actionUrl).toBe("https://aistudio.google.com/app/billing")
  })

  it("500 → service error + GCP status URL", () => {
    const r = mapAdapterError("gemini", 500, null)
    expect(r.userMessage).toBe("Gemini service is having issues. Try again in a moment.")
    expect(r.actionUrl).toBe("https://status.cloud.google.com")
  })

  it("null status → generic closed message", () => {
    const r = mapAdapterError("gemini", null, null)
    expect(r.userMessage).toBe("Connection to Gemini closed unexpectedly. Try again.")
    expect(r.actionUrl).toBeNull()
  })
})

describe("mapAdapterError — unknown provider", () => {
  it("500 → generic service error, no URL", () => {
    const r = mapAdapterError("someProvider", 500, null)
    expect(r.userMessage).toContain("service is having issues")
    expect(r.actionUrl).toBeNull()
  })

  it("null status → generic closed message with provider name", () => {
    const r = mapAdapterError("someProvider", null, null)
    expect(r.userMessage).toContain("someProvider")
    expect(r.actionUrl).toBeNull()
  })
})
