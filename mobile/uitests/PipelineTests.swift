import XCTest

/// Device UI tests that drive the real custom pipeline call path from Chat.
/// They use the debug-only transcript injection controls rendered during Debug
/// builds so the test can exercise the actual call/interrupt flow on device.
final class PipelineTests: VoiceClawUITests {

  func testRealSpeechFixtureRoundTrip() throws {
    enableCustomPipelineMode()
    startCustomPipelineCall()

    waitForLabel(
      testID: "pipeline-debug-transcript-count",
      toContain: "transcripts:1",
      timeout: 75
    )
    waitForLabel(
      testID: "pipeline-debug-last-user",
      toNotContain: "user:none",
      timeout: 75
    )
    waitForLabel(
      testID: "pipeline-debug-assistant-count",
      toContain: "responses:1",
      timeout: 75
    )
    waitForLabel(
      testID: "pipeline-debug-phase",
      toContain: "phase:speaking",
      timeout: 90
    )

    XCTAssertTrue(
      element(withTestID: "message-bubble-user").waitForExistence(timeout: 10),
      "Expected the user transcript bubble to appear"
    )
    XCTAssertTrue(
      element(withTestID: "message-bubble-assistant").waitForExistence(timeout: 10),
      "Expected the assistant response bubble to appear"
    )

    takeScreenshot(name: "custom-pipeline-real-audio-roundtrip")
  }

  func testCustomPipelineConversationEndToEnd() throws {
    enableCustomPipelineMode()
    startCustomPipelineCall()

    tap(testID: "simulate-short-transcript-button")

    waitForLabel(
      testID: "pipeline-debug-phase",
      toContain: "phase:speaking",
      timeout: 30
    )
    waitForLabel(
      testID: "pipeline-debug-assistant-count",
      toContain: "responses:1",
      timeout: 45
    )
    waitForLabel(
      testID: "pipeline-debug-last-assistant",
      toNotContain: "assistant:none",
      timeout: 45
    )

    XCTAssertTrue(
      element(withTestID: "message-bubble-user").waitForExistence(timeout: 10),
      "Expected the user transcript bubble to appear"
    )
    XCTAssertTrue(
      element(withTestID: "message-bubble-assistant").waitForExistence(timeout: 10),
      "Expected the assistant response bubble to appear"
    )

    takeScreenshot(name: "custom-pipeline-conversation")
  }

  func testInterruptDuringTTSResponse() throws {
    enableCustomPipelineMode()
    startCustomPipelineCall()

    tap(testID: "simulate-long-transcript-button")

    waitForLabel(
      testID: "pipeline-debug-phase",
      toContain: "phase:speaking",
      timeout: 30
    )
    waitForLabel(
      testID: "pipeline-debug-tts-count",
      toNotContain: "tts:0",
      timeout: 30
    )

    tap(testID: "interrupt-button")
    tap(testID: "simulate-interrupt-transcript-button")

    waitForLabel(
      testID: "pipeline-debug-interrupt-count",
      toContain: "interrupts:1",
      timeout: 10
    )
    waitForLabel(
      testID: "pipeline-debug-transcript-count",
      toContain: "transcripts:2",
      timeout: 20
    )
    waitForLabel(
      testID: "pipeline-debug-last-user",
      toContain: "redirect successful",
      timeout: 20
    )
    waitForLabel(
      testID: "pipeline-debug-assistant-count",
      toContain: "responses:2",
      timeout: 45
    )
    waitForLabel(
      testID: "pipeline-debug-last-assistant",
      toContain: "redirect successful",
      timeout: 45
    )

    takeScreenshot(name: "custom-pipeline-interrupt")
  }
}
