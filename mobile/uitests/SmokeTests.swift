import XCTest

/// Smoke tests that verify the app launches and key UI elements are visible.
/// These run quickly and serve as a first check that nothing is catastrophically broken.
final class SmokeTests: VoiceClawUITests {

  // MARK: - App Launch

  func testAppLaunches() throws {
    // The base class setUp already launches the app.
    // Just verify the app is running by checking for the chat screen.
    assertExists(testID: "chat-screen")
    takeScreenshot(name: "app-launched")
  }

  // MARK: - Chat Screen Elements

  func testChatScreenHasInputBar() throws {
    assertExists(testID: "input-bar")
    assertExists(testID: "chat-input")
    assertExists(testID: "send-button")
    assertExists(testID: "call-button")
  }

  func testChatScreenHasMessagesList() throws {
    assertExists(testID: "messages-list")
  }

  func testChatScreenHasNewConversationButton() throws {
    assertExists(testID: "new-conversation-button")
  }

  // MARK: - Tab Navigation

  func testCanNavigateToSettings() throws {
    navigateToTab("Settings")
    assertExists(testID: "settings-screen")
    takeScreenshot(name: "settings-screen")
  }

  func testCanNavigateToHistory() throws {
    navigateToTab("History")
    // History tab may not have a testID yet, but verify tab navigation works
    takeScreenshot(name: "history-screen")
  }

  func testCanNavigateBackToChat() throws {
    navigateToTab("Settings")
    assertExists(testID: "settings-screen")
    navigateToTab("Chat")
    assertExists(testID: "chat-screen")
  }

  // MARK: - Settings Screen Elements

  func testSettingsScreenHasCards() throws {
    navigateToTab("Settings")
    assertExists(testID: "voice-pipeline-card")
    assertExists(testID: "brain-config-card")
    assertExists(testID: "latency-stats-card")
    takeScreenshot(name: "settings-cards")
  }

  func testVapiCallStartsAndEnds() throws {
    tap(testID: "call-button")
    assertExists(testID: "call-controls", timeout: 30)
    assertExists(testID: "mute-button", timeout: 30)
    assertExists(testID: "end-call-button", timeout: 30)
    takeScreenshot(name: "vapi-call-active")

    tap(testID: "end-call-button")
    assertExists(testID: "call-button", timeout: 20)
  }
}
