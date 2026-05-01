import { describe, expect, it } from "vitest"
import { RelaySession } from "../../src/session.js"
import type { ProviderAdapter } from "../../src/adapters/types.js"
import type { SessionConfigEvent } from "../../src/types.js"

interface AdapterSpy {
  frames: { data: string; mimeType?: string }[]
  axTexts: string[]
}

describe("session frame.append -> adapter wiring", () => {
  it("forwards axText to adapter.sendAxText after sendFrame when present", async () => {
    const { session, spy } = makeSessionWithSpyAdapter()
    await deliver(session, {
      type: "frame.append",
      data: "<jpeg-base64>",
      axText: "[Screen text — Code]\nButton: Run",
    })
    expect(spy.frames).toHaveLength(1)
    expect(spy.axTexts).toEqual(["[Screen text — Code]\nButton: Run"])
  })

  it("does not call sendAxText when axText is absent", async () => {
    const { session, spy } = makeSessionWithSpyAdapter()
    await deliver(session, { type: "frame.append", data: "<jpeg>" })
    expect(spy.frames).toHaveLength(1)
    expect(spy.axTexts).toEqual([])
  })

  it("does not call sendAxText when axText is empty string", async () => {
    const { session, spy } = makeSessionWithSpyAdapter()
    await deliver(session, { type: "frame.append", data: "<jpeg>", axText: "" })
    expect(spy.axTexts).toEqual([])
  })

  it("skips sendAxText if adapter doesn't implement it (legacy adapter)", async () => {
    const { session, spy } = makeSessionWithSpyAdapter({ omitSendAxText: true })
    await deliver(session, { type: "frame.append", data: "<jpeg>", axText: "anything" })
    expect(spy.frames).toHaveLength(1)
    expect(spy.axTexts).toEqual([])
  })
})

function makeSessionWithSpyAdapter(opts: { omitSendAxText?: boolean } = {}): {
  session: RelaySession
  spy: AdapterSpy
} {
  const spy: AdapterSpy = { frames: [], axTexts: [] }
  const adapter: ProviderAdapter = {
    capabilities: { blockingToolResponse: true },
    connect: async () => {},
    sendAudio: () => {},
    commitAudio: () => {},
    sendFrame: (data, mimeType) => spy.frames.push({ data, mimeType }),
    createResponse: () => {},
    cancelResponse: () => {},
    sendToolResult: () => {},
    injectContext: () => {},
    getTranscript: () => [],
    disconnect: () => {},
  }
  if (!opts.omitSendAxText) {
    adapter.sendAxText = (text) => spy.axTexts.push(text)
  }
  const ws = {
    OPEN: 1,
    readyState: 1,
    send: () => {},
    close: () => {},
    on: () => {},
  }
  const session = new RelaySession(ws as unknown as never)
  const inner = session as unknown as {
    config: SessionConfigEvent
    adapter: ProviderAdapter
    currentTurnStartMs: number
  }
  inner.config = {
    type: "session.config",
    provider: "gemini",
    voice: "test",
    brainAgent: "disabled",
    apiKey: "test-key",
    sessionKey: "frame-test",
  }
  inner.adapter = adapter
  inner.currentTurnStartMs = Date.now()
  return { session, spy }
}

async function deliver(session: RelaySession, event: Record<string, unknown>): Promise<void> {
  // Re-enter the same dispatcher the WS "message" listener uses. The handler
  // is private, but accessing it via index lets tests assert the routing
  // without standing up a real WebSocket pair.
  const inner = session as unknown as {
    handleMessage: (raw: unknown) => Promise<void>
  }
  await inner.handleMessage(JSON.stringify(event))
}
