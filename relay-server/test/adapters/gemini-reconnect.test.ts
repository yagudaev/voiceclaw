import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { GeminiAdapter } from "../../src/adapters/gemini.js"
import {
  eventsOfType,
  mountMockGemini,
  pcm16Chunk,
  waitMs,
  type AdapterInternals,
  type MockHandle,
} from "../helpers/mock-gemini.js"

const MAX_PENDING_AUDIO = 50
const MAX_PENDING_CONTROL = 20

describe("GeminiAdapter reconnect", () => {
  let mock: MockHandle | null = null

  afterEach(async () => {
    await mock?.dispose()
    mock = null
  })

  describe("with a stored resumption handle", () => {
    it("reconnects on goAway and re-sends the handle", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 50, msg: { sessionResumptionUpdate: { newHandle: "handle-abc-123", resumable: true } } },
          { at: 100, msg: { goAway: { timeLeft: "2s" } } },
          { at: 150, close: 1011, reason: "service unavailable" },
        ] },
        { steps: [
          { at: 50, msg: { sessionResumptionUpdate: { newHandle: "handle-def-456", resumable: true } } },
        ] },
      ])

      await waitMs(2000)

      expect(mock.setupsReceived).toHaveLength(2)
      expect(mock.setupsReceived[0].sessionResumption).toBeDefined()
      expect(mock.setupsReceived[0].sessionResumption?.handle).toBeUndefined()
      expect(mock.setupsReceived[1].sessionResumption?.handle).toBe("handle-abc-123")

      expect(eventsOfType(mock.events, "session.rotating")).toHaveLength(1)
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(1)
      expect(eventsOfType(mock.events, "error")).toHaveLength(0)
      expect(mock.internals.resumptionHandle).toBe("handle-def-456")
    })

    it("retries once when the first reconnect attempt fails", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 30, msg: { sessionResumptionUpdate: { newHandle: "retry-handle", resumable: true } } },
          { at: 60, msg: { goAway: { timeLeft: "2s" } } },
          { at: 100, close: 1011, reason: "rotating" },
        ] },
        { ackSetup: "never", steps: [] },
        { steps: [] },
      ])

      await waitMs(2500)

      expect(mock.setupsReceived).toHaveLength(3)
      expect(eventsOfType(mock.events, "session.rotating")).toHaveLength(1)
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(1)
      expect(eventsOfType(mock.events, "error")).toHaveLength(0)
    })

    it("transparently resumes on a 1011 close (transient server error)", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "h-stable", resumable: true } } },
          { at: 50, close: 1011, reason: "internal error" },
        ] },
        { steps: [] },
      ])

      await waitMs(500)

      expect(mock.setupsReceived).toHaveLength(2)
      expect(mock.setupsReceived[1].sessionResumption?.handle).toBe("h-stable")
      expect(eventsOfType(mock.events, "error")).toHaveLength(0)
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(1)
    })

    it("surfaces an error when every reconnect attempt fails", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "h", resumable: true } } },
          { at: 40, msg: { goAway: { timeLeft: "2s" } } },
        ] },
        { ackSetup: "never", steps: [] },
        { ackSetup: "never", steps: [] },
      ])

      await waitMs(3000)

      expect(mock.setupsReceived).toHaveLength(3)
      expect(eventsOfType(mock.events, "error")).toHaveLength(1)
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(0)
    })

    it("rotates twice in a row, using the latest handle each time", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "handle-gen-1", resumable: true } } },
          { at: 40, msg: { goAway: { timeLeft: "2s" } } },
          { at: 80, close: 1011, reason: "done" },
        ] },
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "handle-gen-2", resumable: true } } },
          { at: 40, msg: { goAway: { timeLeft: "2s" } } },
          { at: 80, close: 1011, reason: "done" },
        ] },
        { steps: [] },
      ])

      await waitMs(2500)

      expect(mock.setupsReceived).toHaveLength(3)
      expect(mock.setupsReceived[2].sessionResumption?.handle).toBe("handle-gen-2")
      expect(eventsOfType(mock.events, "session.rotating")).toHaveLength(2)
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(2)
      expect(eventsOfType(mock.events, "error")).toHaveLength(0)
    })

    it("does not rotate again on a resumed-session goAway before any new handle arrives", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "stale-handle", resumable: true } } },
          { at: 40, msg: { goAway: { timeLeft: "2s" } } },
          { at: 80, close: 1011, reason: "rotating" },
        ] },
        { steps: [
          { at: 40, msg: { goAway: { timeLeft: "2s" } } },
        ] },
      ])

      await waitMs(1500)

      expect(mock.setupsReceived).toHaveLength(2)
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(1)
    })
  })

  describe("without a resumption handle", () => {
    it("surfaces an error on close when no handle was ever stored", async () => {
      mock = await mountMockGemini([
        { steps: [{ at: 50, close: 1011, reason: "nope" }] },
      ])

      await waitMs(500)

      expect(eventsOfType(mock.events, "error")).toHaveLength(1)
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(0)
    })

    it("forced-fresh reconnect after poisoned recovery still opts into resumption with no handle", async () => {
      mock = await mountMockGemini([
        { steps: [] },
        { steps: [] },
      ])

      mock.internals.resumptionHandle = null
      await mock.internals.reconnect("poisoned handle — fresh session", true)
      await waitMs(200)

      expect(mock.setupsReceived).toHaveLength(2)
      expect(mock.setupsReceived[1].sessionResumption).toBeDefined()
      expect(mock.setupsReceived[1].sessionResumption?.handle).toBeUndefined()
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(1)
      expect(eventsOfType(mock.events, "error")).toHaveLength(0)
    })
  })

  describe("post-resume poisoned-handle detection", () => {
    it("does NOT trip on an idle resumed session (no inputTranscription, no generation)", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "idle-h1", resumable: true } } },
          { at: 40, msg: { goAway: { timeLeft: "2s" } } },
          { at: 80, close: 1011, reason: "rotating" },
        ] },
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "idle-h2", resumable: true } } },
        ] },
      ])
      mock.internals.postResumeTimeoutMs = 200

      await waitMs(1500)

      expect(mock.setupsReceived).toHaveLength(2)
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(1)
      expect(eventsOfType(mock.events, "error")).toHaveLength(0)
    })

    it("DOES trip when ASR fires post-resume but generation never does", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "h1", resumable: true } } },
          { at: 40, msg: { goAway: { timeLeft: "2s" } } },
          { at: 80, close: 1011, reason: "rotating" },
        ] },
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "h2", resumable: true } } },
          { at: 50, msg: { serverContent: { inputTranscription: { text: "hello" } } } },
        ] },
        { steps: [] },
      ])
      mock.internals.postResumeTimeoutMs = 200

      await waitMs(1500)

      expect(mock.setupsReceived).toHaveLength(3)
      expect(mock.setupsReceived[2].sessionResumption?.handle).toBeUndefined()
    })
  })

  describe("with a tool call in flight", () => {
    it("defers rotation when goAway arrives mid-tool, then rotates with the post-tool handle", async () => {
      mock = await mountMockGemini([
        {
          steps: [
            { at: 20, msg: { sessionResumptionUpdate: { newHandle: "pre-tool-handle", resumable: true } } },
            { at: 40, msg: { toolCall: { functionCalls: [{ id: "call-1", name: "ask_brain", args: { question: "hi" } }] } } },
            { at: 60, msg: { sessionResumptionUpdate: { newHandle: "mid-tool", resumable: false } } },
            { at: 80, msg: { goAway: { timeLeft: "5s" } } },
          ],
          // When the original socket sees the toolResponse, emit the post-tool handle.
          // The adapter should then trigger the deferred rotation.
          onMessage: (msg) => {
            if ("toolResponse" in msg) {
              return [{ afterMs: 20, msg: { sessionResumptionUpdate: { newHandle: "post-tool-handle", resumable: true } } }]
            }
            return undefined
          },
        },
        { steps: [] },
      ])

      const seen = await pollUntil(() => mock!.events.find((e) => e.type === "tool.call"), 500)
      expect(seen).toBeDefined()
      mock.adapter.sendToolResult("call-1", JSON.stringify({ answer: "42" }))

      await waitMs(800)

      const toolResponsesOnFirstSocket = mock.messagesPerSocket[0].filter((m) => "toolResponse" in m)
      expect(toolResponsesOnFirstSocket).toHaveLength(1)
      expect(mock.messagesPerSocket[1] ?? []).toHaveLength(0)
      expect(mock.setupsReceived).toHaveLength(2)
      expect(mock.setupsReceived[1].sessionResumption?.handle).toBe("post-tool-handle")
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(1)
      expect(eventsOfType(mock.events, "error")).toHaveLength(0)
    })

    it("surfaces an error when the socket hard-closes mid-tool with no safe rotation path", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "pre-tool", resumable: true } } },
          { at: 40, msg: { toolCall: { functionCalls: [{ id: "call-2", name: "ask_brain", args: { question: "x" } }] } } },
          { at: 60, msg: { sessionResumptionUpdate: { newHandle: "mid", resumable: false } } },
          { at: 100, close: 1011, reason: "timeLeft expired" },
        ] },
      ])

      await pollUntil(() => mock!.events.find((e) => e.type === "tool.call"), 500)
      // Tool result arrives AFTER the socket closed — should not be sent anywhere
      setTimeout(() => mock!.adapter.sendToolResult("call-2", JSON.stringify({ answer: "late" })), 100)

      await waitMs(800)

      expect(eventsOfType(mock.events, "error")).toHaveLength(1)
      expect(eventsOfType(mock.events, "session.rotated")).toHaveLength(0)
      expect(mock.messagesPerSocket[1] ?? []).toHaveLength(0)
    })
  })

  describe("send queue during rotation", () => {
    it("buffers audio + control across the rotation window and flushes control before audio", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "h1", resumable: true } } },
          { at: 40, msg: { goAway: { timeLeft: "3s" } } },
          { at: 80, close: 1011, reason: "rotating" },
        ] },
        // Delay setupComplete on the resumed socket so client has time to buffer
        { ackSetup: 100, steps: [] },
      ])

      await waitMs(60) // wait for goAway → rotation begins
      for (let i = 0; i < MAX_PENDING_AUDIO + 10; i++) {
        mock.adapter.sendAudio(pcm16Chunk(960, i))
      }
      mock.adapter.sendToolResult("call-x", JSON.stringify({ ok: true }))

      await waitMs(1500)

      const onSocket2 = mock.messagesPerSocket[1] ?? []
      const audio = onSocket2.filter((m) => "realtimeInput" in m)
      const tools = onSocket2.filter((m) => "toolResponse" in m)
      expect(audio).toHaveLength(MAX_PENDING_AUDIO)
      expect(tools).toHaveLength(1)
      const firstTool = onSocket2.findIndex((m) => "toolResponse" in m)
      const firstAudio = onSocket2.findIndex((m) => "realtimeInput" in m)
      expect(firstTool).toBeLessThan(firstAudio)
    })

    it("preserves the queue across attempt-1 failure", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "h1", resumable: true } } },
          { at: 40, msg: { goAway: { timeLeft: "3s" } } },
          { at: 80, close: 1011, reason: "rotating" },
        ] },
        { ackSetup: "never", steps: [] },
        { ackSetup: 100, steps: [] },
      ])

      await waitMs(60)
      for (let i = 0; i < 10; i++) mock.adapter.sendAudio(pcm16Chunk(960))
      mock.adapter.sendToolResult("call-retry", JSON.stringify({ ok: true }))

      await waitMs(2500)

      const onSocket3 = mock.messagesPerSocket[2] ?? []
      expect(onSocket3.filter((m) => "realtimeInput" in m)).toHaveLength(10)
      expect(onSocket3.filter((m) => "toolResponse" in m)).toHaveLength(1)
      expect(eventsOfType(mock.events, "error")).toHaveLength(0)
    })

    it("drops newest control messages once the queue is full, preserving originals", async () => {
      mock = await mountMockGemini([
        { steps: [
          { at: 20, msg: { sessionResumptionUpdate: { newHandle: "h1", resumable: true } } },
          { at: 40, msg: { goAway: { timeLeft: "3s" } } },
          { at: 80, close: 1011, reason: "rotating" },
        ] },
        { ackSetup: 200, steps: [] },
      ])

      await waitMs(60)
      for (let i = 0; i < MAX_PENDING_CONTROL + 10; i++) {
        mock.adapter.sendToolResult(`call-${i}`, JSON.stringify({ seq: i }))
      }

      await waitMs(1500)

      const onSocket2 = mock.messagesPerSocket[1] ?? []
      const tools = onSocket2.filter((m) => "toolResponse" in m) as Array<{ toolResponse: { functionResponses: { id: string }[] } }>
      expect(tools).toHaveLength(MAX_PENDING_CONTROL)
      expect(tools[0].toolResponse.functionResponses[0].id).toBe("call-0")
      expect(tools[tools.length - 1].toolResponse.functionResponses[0].id).toBe(`call-${MAX_PENDING_CONTROL - 1}`)
    })
  })
})

describe("GeminiAdapter watchdog gating", () => {
  // No mock server needed — these probe internal state directly.
  let adapter: GeminiAdapter
  let internals: AdapterInternals

  beforeEach(() => {
    adapter = new GeminiAdapter()
    internals = adapter as unknown as AdapterInternals
    internals.watchdogEnabled = true
  })

  afterEach(() => adapter.disconnect())

  it("arms when no tool calls are pending", () => {
    internals.pendingToolCalls = 0
    internals.resetWatchdog()
    expect(internals.watchdogTimer).not.toBeNull()
  })

  it("suppresses while a tool call is in flight", () => {
    internals.pendingToolCalls = 1
    internals.resetWatchdog()
    expect(internals.watchdogTimer).toBeNull()
  })

  it("re-arms after pending tool calls drain", () => {
    internals.pendingToolCalls = 1
    internals.resetWatchdog()
    internals.pendingToolCalls = 0
    internals.resetWatchdog()
    expect(internals.watchdogTimer).not.toBeNull()
  })
})

// --- helpers ---

async function pollUntil<T>(probe: () => T | undefined, timeoutMs: number): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const v = probe()
    if (v !== undefined) return v
    await waitMs(10)
  }
  return undefined
}
