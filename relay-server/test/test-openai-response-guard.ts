import assert from "node:assert/strict"
import { OpenAIAdapter } from "../src/adapters/openai.js"

type UpstreamEvent = Record<string, unknown>

function testQueuesClientResponseUntilDone() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  adapter.createResponse()
  assertEvents(adapter, [{ type: "response.create" }], "idle response.create should be sent immediately")

  resetCaptured(adapter)
  adapter.createResponse()
  assertEvents(adapter, [], "active response should queue client response.create")

  emit(adapter, { type: "response.done" })
  assertEvents(adapter, [{ type: "response.create" }], "queued client response.create should flush on response.done")
}

function testToolResultCancelsBeforeCreatingReplacementResponse() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  emit(adapter, { type: "response.created" })
  const state = adapter as unknown as { pendingToolCalls: number }
  state.pendingToolCalls = 1

  adapter.sendToolResult("call-123", "{\"ok\":true}")

  assertEvents(adapter, [
    {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: "call-123",
        output: "{\"ok\":true}",
      },
    },
    { type: "response.cancel" },
  ], "tool result should cancel the active response instead of colliding with response.create")

  resetCaptured(adapter)
  emit(adapter, { type: "response.done" })
  assertEvents(adapter, [{ type: "response.create" }], "tool result should resume with a fresh response after cancel completes")
}

function testToolResultsDoNotSendDuplicateCancels() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  emit(adapter, { type: "response.created" })
  const state = adapter as unknown as { pendingToolCalls: number }
  state.pendingToolCalls = 2

  adapter.sendToolResult("call-1", "{\"ok\":1}")
  adapter.sendToolResult("call-2", "{\"ok\":2}")

  assertEvents(adapter, [
    {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: "call-1",
        output: "{\"ok\":1}",
      },
    },
    { type: "response.cancel" },
    {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: "call-2",
        output: "{\"ok\":2}",
      },
    },
  ], "multiple tool results should share a single pending response.cancel")
}

function testErrorResetsActiveResponseState() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  adapter.createResponse()
  resetCaptured(adapter)

  emit(adapter, { type: "error", error: { message: "upstream failed" } })
  adapter.createResponse()

  assertEvents(adapter, [{ type: "response.create" }], "error should clear active-response state so a new response can start")
}

function testWatchdogDefersWhileResponseIsActive() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  let resetCount = 0
  const state = adapter as unknown as { resetWatchdog: () => void }
  state.resetWatchdog = () => {
    resetCount++
  }

  emit(adapter, { type: "response.created" })
  invokeWatchdog(adapter)

  assert.equal(resetCount, 1, "watchdog should reschedule itself while a response is active")
  assertEvents(adapter, [], "watchdog should not inject a prompt during an active response")
}

function testWatchdogInjectsPromptWhenIdle() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  invokeWatchdog(adapter)

  assertEvents(adapter, [
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
  ], "watchdog should inject its prompt and create a response when idle")
}

function main() {
  testQueuesClientResponseUntilDone()
  testToolResultCancelsBeforeCreatingReplacementResponse()
  testToolResultsDoNotSendDuplicateCancels()
  testErrorResetsActiveResponseState()
  testWatchdogDefersWhileResponseIsActive()
  testWatchdogInjectsPromptWhenIdle()
  console.log("OpenAI response guard tests passed")
}

main()

function getCaptured(adapter: OpenAIAdapter): UpstreamEvent[] {
  const state = adapter as unknown as { capturedEvents: UpstreamEvent[] }
  return state.capturedEvents
}

function setUpCapture(adapter: OpenAIAdapter) {
  const state = adapter as unknown as {
    capturedEvents: UpstreamEvent[]
    sendUpstream: (event: UpstreamEvent) => boolean
  }

  state.capturedEvents = []
  state.sendUpstream = (event: UpstreamEvent) => {
    getCaptured(adapter).push(event)
    return true
  }
}

function resetCaptured(adapter: OpenAIAdapter) {
  getCaptured(adapter).length = 0
}

function emit(adapter: OpenAIAdapter, event: Record<string, unknown>) {
  const state = adapter as unknown as { handleUpstreamEvent: (event: Record<string, unknown>) => void }
  state.handleUpstreamEvent(event)
}

function invokeWatchdog(adapter: OpenAIAdapter) {
  const state = adapter as unknown as { handleWatchdogTimeout: () => void }
  state.handleWatchdogTimeout()
}

function assertEvents(adapter: OpenAIAdapter, expected: UpstreamEvent[], message: string) {
  assert.deepEqual(getCaptured(adapter), expected, message)
}
