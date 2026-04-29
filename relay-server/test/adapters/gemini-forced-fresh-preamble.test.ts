import { afterEach, describe, expect, it } from "vitest"
import { WebSocketServer, WebSocket as WsSocket } from "ws"
import { GeminiAdapter } from "../../src/adapters/gemini.js"
import type { SessionConfigEvent } from "../../src/types.js"
import {
  eventsOfType,
  waitMs,
  type AdapterInternals,
  type RelayEvent,
} from "../helpers/mock-gemini.js"

describe("GeminiAdapter forced-fresh preamble rebuild", () => {
  let handle: ScriptedHandle | null = null

  afterEach(async () => {
    await handle?.dispose()
    handle = null
  })

  it("rebuilds preamble from initial conversationHistory + in-call transcript on forced-fresh reconnect", async () => {
    const initialHistory = makeHistory([
      ["user", "I'm planning a trip to San Francisco next month"],
      ["assistant", "Exciting — what dates and what's the vibe you're after?"],
      ["user", "April 15 to 22, mostly food and walking"],
      ["assistant", "Got it. Mission burritos and Golden Gate Park then."],
    ])

    handle = await mountWithHistory(initialHistory, [
      { steps: [
        { at: 20, msg: { sessionResumptionUpdate: { newHandle: "h1", resumable: true } } },
        { at: 40, msg: { serverContent: { inputTranscription: { text: "What about coffee in the Mission?" } } } },
        { at: 60, msg: { serverContent: { outputTranscription: { text: "Try Four Barrel or Ritual." } } } },
        { at: 80, msg: { serverContent: { turnComplete: true } } },
        { at: 100, msg: { serverContent: { inputTranscription: { text: "Any rooftop bars near downtown?" } } } },
        { at: 120, msg: { serverContent: { outputTranscription: { text: "Charmaine's at the Proper Hotel is great." } } } },
        { at: 140, msg: { serverContent: { turnComplete: true } } },
      ] },
      { steps: [] },
    ])

    await waitMs(250)
    expect(handle.adapter.getTranscript()).toHaveLength(4)

    handle.internals.resumptionHandle = null
    await handle.internals.reconnect("test forced fresh", true)
    await waitMs(150)

    expect(handle.setupsReceived).toHaveLength(2)
    const initialInstruction = handle.setupsReceived[0].systemInstruction?.parts?.[0]?.text ?? ""
    expect(initialInstruction).not.toContain("Four Barrel")
    expect(initialInstruction).not.toContain("Charmaine")
    const resumedInstruction = handle.setupsReceived[1].systemInstruction?.parts?.[0]?.text ?? ""
    expect(resumedInstruction).toContain("San Francisco")
    expect(resumedInstruction).toContain("April 15 to 22")
    expect(resumedInstruction).toContain("Four Barrel or Ritual")
    expect(resumedInstruction).toContain("Charmaine's at the Proper Hotel")
    expect(eventsOfType(handle.events, "session.rotated")).toHaveLength(1)
    expect(eventsOfType(handle.events, "error")).toHaveLength(0)
  })

  it("leaves preamble unchanged on a handle-based reconnect (Gemini restores in-call state via the handle)", async () => {
    const initialHistory = makeHistory([
      ["user", "Remind me what we decided about the Q2 roadmap"],
      ["assistant", "We agreed to ship the analytics dashboard first."],
    ])

    handle = await mountWithHistory(initialHistory, [
      { steps: [
        { at: 20, msg: { sessionResumptionUpdate: { newHandle: "stable-handle", resumable: true } } },
        { at: 40, msg: { serverContent: { inputTranscription: { text: "And what about hiring?" } } } },
        { at: 60, msg: { serverContent: { outputTranscription: { text: "Two senior engineers in Q2." } } } },
        { at: 80, msg: { serverContent: { turnComplete: true } } },
        { at: 100, msg: { goAway: { timeLeft: "2s" } } },
        { at: 140, close: 1011 },
      ] },
      { steps: [] },
    ])

    await waitMs(800)

    expect(handle.setupsReceived).toHaveLength(2)
    const initialInstruction = handle.setupsReceived[0].systemInstruction?.parts?.[0]?.text ?? ""
    const resumedInstruction = handle.setupsReceived[1].systemInstruction?.parts?.[0]?.text ?? ""
    expect(resumedInstruction).toBe(initialInstruction)
    expect(resumedInstruction).not.toContain("hiring")
    expect(resumedInstruction).not.toContain("senior engineers")
    expect(handle.setupsReceived[1].sessionResumption?.handle).toBe("stable-handle")
  })

  it("forced-fresh with no in-call turns leaves preamble equal to the initial preamble", async () => {
    const initialHistory = makeHistory([
      ["user", "Hello"],
      ["assistant", "Hi there!"],
    ])

    handle = await mountWithHistory(initialHistory, [
      { steps: [] },
      { steps: [] },
    ])

    expect(handle.adapter.getTranscript()).toHaveLength(0)

    handle.internals.resumptionHandle = null
    await handle.internals.reconnect("test forced fresh no turns", true)
    await waitMs(150)

    expect(handle.setupsReceived).toHaveLength(2)
    const initialInstruction = handle.setupsReceived[0].systemInstruction?.parts?.[0]?.text ?? ""
    const resumedInstruction = handle.setupsReceived[1].systemInstruction?.parts?.[0]?.text ?? ""
    expect(resumedInstruction).toBe(initialInstruction)
  })
})

// --- helpers ---

interface ScriptedHandle {
  adapter: GeminiAdapter
  internals: AdapterInternals
  events: RelayEvent[]
  setupsReceived: SetupMessage[]
  dispose: () => Promise<void>
}

type SetupMessage = {
  systemInstruction?: { parts?: { text?: string }[] }
  sessionResumption?: { handle?: string }
  [k: string]: unknown
}

type Script = {
  ackSetup?: "auto" | number
  steps?: { at: number, msg?: Record<string, unknown>, close?: number }[]
}

function makeHistory(pairs: ["user" | "assistant", string][]): { role: "user" | "assistant", text: string }[] {
  return pairs.map(([role, text]) => ({ role, text }))
}

async function mountWithHistory(
  conversationHistory: { role: "user" | "assistant", text: string }[],
  scripts: Script[],
): Promise<ScriptedHandle> {
  process.env.GEMINI_API_KEY ||= "test-key"

  const wss = new WebSocketServer({ port: 0 })
  await new Promise<void>((resolve) => wss.once("listening", () => resolve()))
  const address = wss.address()
  const port = typeof address === "object" && address ? address.port : 0

  const setupsReceived: SetupMessage[] = []
  let connectionIndex = 0

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    const script = scripts[myIndex]

    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw)) as Record<string, unknown>
      if ("setup" in msg) {
        setupsReceived.push(msg.setup as SetupMessage)
        const ack = script?.ackSetup ?? "auto"
        if (ack === "auto") {
          if (ws.readyState === WsSocket.OPEN) ws.send(JSON.stringify({ setupComplete: {} }))
        } else {
          setTimeout(() => {
            if (ws.readyState === WsSocket.OPEN) ws.send(JSON.stringify({ setupComplete: {} }))
          }, ack)
        }
        for (const step of script?.steps ?? []) {
          setTimeout(() => {
            if (ws.readyState !== WsSocket.OPEN) return
            if (step.msg) ws.send(JSON.stringify(step.msg))
            else if (step.close !== undefined) ws.close(step.close)
          }, step.at)
        }
      }
    })
  })

  const config: SessionConfigEvent = {
    type: "session.config",
    provider: "gemini",
    model: "gemini-3.1-flash-live-preview",
    voice: "Zephyr",
    apiKey: "test",
    brainAgent: "none",
    deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
    conversationHistory,
  }

  const adapter = new GeminiAdapter()
  const internals = adapter as unknown as AdapterInternals
  internals.wsUrlOverride = `ws://localhost:${port}`

  const events: RelayEvent[] = []
  await adapter.connect(config, (event) => events.push(event as RelayEvent))

  const dispose = async () => {
    adapter.disconnect()
    await new Promise<void>((resolve) => wss.close(() => resolve()))
  }

  return { adapter, internals, events, setupsReceived, dispose }
}
