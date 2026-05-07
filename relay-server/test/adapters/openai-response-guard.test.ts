import { describe, expect, it } from "vitest"
import { OpenAIAdapter } from "../../src/adapters/openai.js"

type UpstreamEvent = Record<string, unknown>

describe("OpenAIAdapter response lifecycle", () => {
  it("queues a client response.create while a response is active and flushes on response.done", () => {
    const adapter = new OpenAIAdapter()
    setUpCapture(adapter)

    adapter.createResponse()
    expect(getCaptured(adapter)).toEqual([{ type: "response.create" }])

    resetCaptured(adapter)
    adapter.createResponse()
    expect(getCaptured(adapter)).toEqual([])

    emit(adapter, { type: "response.done" })
    expect(getCaptured(adapter)).toEqual([{ type: "response.create" }])
  })

  it("queues response.create after a tool result without canceling the active response", () => {
    // The function_call lives inside the current response; canceling it would
    // cut the model's still-streaming audio mid-sentence. Just queue the next
    // create and let response.done land naturally.
    const adapter = new OpenAIAdapter()
    setUpCapture(adapter)

    emit(adapter, { type: "response.created" })
    ;(adapter as unknown as { pendingToolCalls: number }).pendingToolCalls = 1

    adapter.sendToolResult("call-123", "{\"ok\":true}")

    expect(getCaptured(adapter)).toEqual([
      {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: "call-123",
          output: "{\"ok\":true}",
        },
      },
    ])

    resetCaptured(adapter)
    emit(adapter, { type: "response.done" })
    expect(getCaptured(adapter)).toEqual([{ type: "response.create" }])
  })

  it("emits one function_call_output per tool result and only one response.create after response.done", () => {
    const adapter = new OpenAIAdapter()
    setUpCapture(adapter)

    emit(adapter, { type: "response.created" })
    ;(adapter as unknown as { pendingToolCalls: number }).pendingToolCalls = 2

    adapter.sendToolResult("call-1", "{\"ok\":1}")
    adapter.sendToolResult("call-2", "{\"ok\":2}")

    expect(getCaptured(adapter)).toEqual([
      {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: "call-1",
          output: "{\"ok\":1}",
        },
      },
      {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: "call-2",
          output: "{\"ok\":2}",
        },
      },
    ])

    resetCaptured(adapter)
    emit(adapter, { type: "response.done" })
    expect(getCaptured(adapter)).toEqual([{ type: "response.create" }])
  })

  it("clears active-response state on error so a new response can start", () => {
    const adapter = new OpenAIAdapter()
    setUpCapture(adapter)

    adapter.createResponse()
    resetCaptured(adapter)

    emit(adapter, { type: "error", error: { message: "upstream failed" } })
    adapter.createResponse()

    expect(getCaptured(adapter)).toEqual([{ type: "response.create" }])
  })

  it("watchdog defers and reschedules itself while a response is active", () => {
    const adapter = new OpenAIAdapter()
    setUpCapture(adapter)

    let resetCount = 0
    ;(adapter as unknown as { resetWatchdog: () => void }).resetWatchdog = () => {
      resetCount++
    }

    emit(adapter, { type: "response.created" })
    invokeWatchdog(adapter)

    expect(resetCount).toBe(1)
    expect(getCaptured(adapter)).toEqual([])
  })

  it("watchdog injects a check-in prompt and creates a response when idle", () => {
    const adapter = new OpenAIAdapter()
    setUpCapture(adapter)

    invokeWatchdog(adapter)

    expect(getCaptured(adapter)).toEqual([
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{
            type: "input_text",
            text: "(The user has been silent for a while. If you were mid-conversation, gently check if they're still there. If the conversation had naturally ended, stay quiet.)",
          }],
        },
      },
      { type: "response.create" },
    ])
  })
})

function getCaptured(adapter: OpenAIAdapter): UpstreamEvent[] {
  return (adapter as unknown as { capturedEvents: UpstreamEvent[] }).capturedEvents
}

function setUpCapture(adapter: OpenAIAdapter) {
  const state = adapter as unknown as {
    capturedEvents: UpstreamEvent[]
    sendUpstream: (event: UpstreamEvent) => boolean
  }
  state.capturedEvents = []
  state.sendUpstream = (event) => {
    state.capturedEvents.push(event)
    return true
  }
}

function resetCaptured(adapter: OpenAIAdapter) {
  getCaptured(adapter).length = 0
}

function emit(adapter: OpenAIAdapter, event: Record<string, unknown>) {
  ;(adapter as unknown as { handleUpstreamEvent: (e: Record<string, unknown>) => void }).handleUpstreamEvent(event)
}

function invokeWatchdog(adapter: OpenAIAdapter) {
  ;(adapter as unknown as { handleWatchdogTimeout: () => void }).handleWatchdogTimeout()
}
