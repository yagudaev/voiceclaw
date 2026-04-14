import assert from "node:assert/strict"
import { OpenAIAdapter } from "../src/adapters/openai.js"

type UpstreamEvent = Record<string, unknown>

function getCaptured(adapter: OpenAIAdapter): UpstreamEvent[] {
  return (adapter as unknown as { capturedEvents: UpstreamEvent[] }).capturedEvents
}

function setUpCapture(adapter: OpenAIAdapter) {
  ;(adapter as unknown as { capturedEvents: UpstreamEvent[] }).capturedEvents = []
  ;(adapter as unknown as { sendUpstream: (event: UpstreamEvent) => void }).sendUpstream = (event: UpstreamEvent) => {
    getCaptured(adapter).push(event)
  }
}

function resetCaptured(adapter: OpenAIAdapter) {
  getCaptured(adapter).length = 0
}

function emit(adapter: OpenAIAdapter, event: Record<string, unknown>) {
  ;(adapter as unknown as { handleUpstreamEvent: (event: Record<string, unknown>) => void }).handleUpstreamEvent(event)
}

function assertEvents(adapter: OpenAIAdapter, expected: UpstreamEvent[], message: string) {
  assert.deepEqual(getCaptured(adapter), expected, message)
}

function testQueuesClientResponseUntilDone() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  adapter.createResponse()
  assertEvents(adapter, [{ type: "response.create" }], "idle response.create should be sent immediately")

  resetCaptured(adapter)
  emit(adapter, { type: "response.created" })
  adapter.createResponse()
  assertEvents(adapter, [], "active response should queue client response.create")

  emit(adapter, { type: "response.done" })
  assertEvents(adapter, [{ type: "response.create" }], "queued client response.create should flush on response.done")
}

function testToolResultCancelsBeforeCreatingReplacementResponse() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  emit(adapter, { type: "response.created" })
  ;(adapter as unknown as { pendingToolCalls: number }).pendingToolCalls = 1

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

function testWatchdogDefersWhileResponseIsActive() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  let resetCount = 0
  ;(adapter as unknown as { resetWatchdog: () => void }).resetWatchdog = () => {
    resetCount++
  }

  emit(adapter, { type: "response.created" })
  ;(adapter as unknown as { handleWatchdogTimeout: () => void }).handleWatchdogTimeout()

  assert.equal(resetCount, 1, "watchdog should reschedule itself while a response is active")
  assertEvents(adapter, [], "watchdog should not inject a prompt during an active response")
}

function testWatchdogInjectsPromptWhenIdle() {
  const adapter = new OpenAIAdapter()
  setUpCapture(adapter)

  ;(adapter as unknown as { handleWatchdogTimeout: () => void }).handleWatchdogTimeout()

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
  testWatchdogDefersWhileResponseIsActive()
  testWatchdogInjectsPromptWhenIdle()
  console.log("OpenAI response guard tests passed")
}

main()
