import { WebSocketServer, WebSocket as WsSocket } from "ws"
import { GeminiAdapter } from "../../src/adapters/gemini.js"
import type { SessionConfigEvent } from "../../src/types.js"

// Declarative script of what a mock socket should send / do.
// `at` is milliseconds after that socket received its setup message.
export type ScriptStep =
  | { at: number, msg: Record<string, unknown> }
  | { at: number, close: number, reason?: string }

// `send` lets the callback push a message back to the same socket (or close it).
export type ReactiveAction =
  | { msg: Record<string, unknown> }
  | { close: number, reason?: string }

export interface ConnectionScript {
  steps: ScriptStep[]
  // 'auto' (default) → reply setupComplete immediately on receiving setup
  // number → reply setupComplete after N ms (lets the test queue messages mid-handshake)
  // 'never' → never reply setupComplete (simulates setup-time failure)
  ackSetup?: "auto" | "never" | number
  // Optional: react to non-setup messages received on this socket.
  // Return one or more actions to send back, optionally with a delay.
  onMessage?: (msg: Record<string, unknown>) => Array<ReactiveAction & { afterMs?: number }> | undefined
}

export interface MockHandle {
  adapter: GeminiAdapter
  internals: AdapterInternals
  events: RelayEvent[]
  setupsReceived: SetupMessage[]
  messagesPerSocket: Record<string, unknown>[][]
  port: number
  dispose: () => Promise<void>
}

export type RelayEvent = { type: string, [k: string]: unknown }
type SetupMessage = { sessionResumption?: { handle?: string }, [k: string]: unknown }

export interface AdapterInternals {
  wsUrlOverride: string
  postResumeTimeoutMs: number
  resumptionHandle: string | null
  reconnect: (reason: string, forceFresh?: boolean) => Promise<void>
  pendingToolCalls: number
  watchdogTimer: ReturnType<typeof setTimeout> | null
  watchdogEnabled: boolean
  resetWatchdog: () => void
}

const TEST_CONFIG: SessionConfigEvent = {
  type: "session.config",
  provider: "gemini",
  model: "gemini-3.1-flash-live-preview",
  voice: "Zephyr",
  apiKey: "test",
  brainAgent: "none",
  deviceContext: { timezone: "UTC", locale: "en-US", deviceModel: "mock" },
}

// Spin up an ephemeral mock Gemini upstream + a connected GeminiAdapter, run
// the supplied per-connection scripts, and hand the test a handle to inspect
// what happened. Tests advance time with `waitMs(...)`, then assert on
// `setupsReceived`, `events`, and `messagesPerSocket`.
export async function mountMockGemini(
  scripts: ConnectionScript[],
): Promise<MockHandle> {
  process.env.GEMINI_API_KEY ||= "test-key"

  const wss = new WebSocketServer({ port: 0 })
  await new Promise<void>((resolve) => wss.once("listening", () => resolve()))
  const address = wss.address()
  const port = typeof address === "object" && address ? address.port : 0

  const setupsReceived: SetupMessage[] = []
  const messagesPerSocket: Record<string, unknown>[][] = []
  let connectionIndex = 0

  wss.on("connection", (ws) => {
    const myIndex = connectionIndex++
    messagesPerSocket[myIndex] ??= []
    const script = scripts[myIndex]

    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw)) as Record<string, unknown>
      if ("setup" in msg) {
        setupsReceived.push(msg.setup as SetupMessage)
        ackSetup(ws, script?.ackSetup ?? "auto")
        if (script) runScript(ws, script.steps)
        return
      }
      messagesPerSocket[myIndex].push(msg)
      const reactions = script?.onMessage?.(msg)
      if (reactions) {
        for (const r of reactions) {
          const fire = () => {
            if (ws.readyState !== WsSocket.OPEN) return
            if ("msg" in r) ws.send(JSON.stringify(r.msg))
            else if ("close" in r) ws.close(r.close, r.reason ?? "")
          }
          if (r.afterMs && r.afterMs > 0) setTimeout(fire, r.afterMs)
          else fire()
        }
      }
    })
  })

  const adapter = new GeminiAdapter()
  const internals = adapter as unknown as AdapterInternals
  internals.wsUrlOverride = `ws://localhost:${port}`

  const events: RelayEvent[] = []
  await adapter.connect(TEST_CONFIG, (event) => events.push(event as RelayEvent))

  const dispose = async () => {
    adapter.disconnect()
    await new Promise<void>((resolve) => wss.close(() => resolve()))
  }

  return { adapter, internals, events, setupsReceived, messagesPerSocket, port, dispose }
}

export function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function eventsOfType(events: RelayEvent[], type: string): RelayEvent[] {
  return events.filter((e) => e.type === type)
}

// Builds a base64 PCM16 chunk of the requested length in samples.
export function pcm16Chunk(samples: number, stamp = 0): string {
  const buf = Buffer.alloc(samples * 2)
  buf.writeInt16LE(stamp % 32767, 0)
  return buf.toString("base64")
}

// --- helpers ---

function ackSetup(ws: WsSocket, mode: "auto" | "never" | number) {
  if (mode === "never") {
    // Close after a microtask so the adapter sees the failure, not just an
    // unresponsive socket.
    setImmediate(() => ws.close(1011, "setup failed"))
    return
  }
  const send = () => {
    if (ws.readyState === WsSocket.OPEN) ws.send(JSON.stringify({ setupComplete: {} }))
  }
  if (mode === "auto") send()
  else setTimeout(send, mode)
}

function runScript(ws: WsSocket, steps: ScriptStep[]) {
  for (const step of steps) {
    setTimeout(() => {
      if (ws.readyState !== WsSocket.OPEN) return
      if ("msg" in step) {
        ws.send(JSON.stringify(step.msg))
      } else if ("close" in step) {
        ws.close(step.close, step.reason ?? "")
      }
    }, step.at)
  }
}
