import XCTest

/// Base class for VoiceClaw UI tests. Provides helpers for launching the app,
/// finding elements by accessibility identifier (testID in React Native),
/// taking screenshots, and common assertions.
class VoiceClawUITests: XCTestCase {

  var app: XCUIApplication!

  override func setUpWithError() throws {
    continueAfterFailure = false
    app = XCUIApplication()
    app.launch()
  }

  override func tearDownWithError() throws {
    app = nil
  }

  // MARK: - Element Helpers

  /// Find an element by its `testID` (maps to `accessibilityIdentifier` on iOS).
  func element(withTestID testID: String) -> XCUIElement {
    return app.descendants(matching: .any).matching(identifier: testID).firstMatch
  }

  /// Wait for an element with the given testID to exist, with a timeout.
  @discardableResult
  func waitForElement(
    withTestID testID: String,
    timeout: TimeInterval = 10
  ) -> XCUIElement {
    let el = element(withTestID: testID)
    let exists = el.waitForExistence(timeout: timeout)
    XCTAssertTrue(exists, "Element with testID '\(testID)' did not appear within \(timeout)s")
    return el
  }

  /// Tap an element identified by testID.
  func tap(testID: String, timeout: TimeInterval = 10) {
    let el = waitForElement(withTestID: testID, timeout: timeout)
    el.tap()
  }

  /// Type text into an element identified by testID.
  func typeText(into testID: String, text: String, timeout: TimeInterval = 10) {
    let el = waitForElement(withTestID: testID, timeout: timeout)
    el.tap()
    el.typeText(text)
  }

  /// Assert that an element with the given testID exists on screen.
  func assertExists(testID: String, timeout: TimeInterval = 10) {
    let el = element(withTestID: testID)
    XCTAssertTrue(
      el.waitForExistence(timeout: timeout),
      "Expected element with testID '\(testID)' to exist"
    )
  }

  /// Assert that an element with the given testID does NOT exist.
  func assertNotExists(testID: String) {
    let el = element(withTestID: testID)
    XCTAssertFalse(el.exists, "Expected element with testID '\(testID)' to NOT exist")
  }

  // MARK: - Screenshot Helpers

  /// Take a screenshot and attach it to the test results. Also saves to a
  /// temp directory if the `SCREENSHOT_DIR` environment variable is set.
  func takeScreenshot(name: String) {
    let screenshot = XCUIScreen.main.screenshot()
    let attachment = XCTAttachment(screenshot: screenshot)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)

    // Save to disk if SCREENSHOT_DIR is set (used by CI / CLI wrapper)
    if let dir = ProcessInfo.processInfo.environment["SCREENSHOT_DIR"] {
      let url = URL(fileURLWithPath: dir)
        .appendingPathComponent("\(name).png")
      try? screenshot.pngRepresentation.write(to: url)
    }
  }

  // MARK: - Tab Navigation

  /// Navigate to a tab by tapping its tab bar button.
  /// Tab titles in this app: "Chat", "History", "Settings"
  /// React Native uses a custom tab bar (not native UITabBar), so we search
  /// by accessibility label across all buttons.
  func navigateToTab(_ title: String) {
    // Try native tab bar first
    let nativeTab = app.tabBars.buttons[title]
    if nativeTab.waitForExistence(timeout: 3) {
      nativeTab.tap()
      return
    }
    // Fall back to any button matching the title (React Native custom tab bar)
    let customTab = app.buttons["\(title), tab, \(tabIndex(for: title)) of 3"]
    if customTab.waitForExistence(timeout: 3) {
      customTab.tap()
      return
    }
    // Last resort: find by label substring
    let predicate = NSPredicate(format: "label CONTAINS[c] %@", title)
    let match = app.buttons.matching(predicate).firstMatch
    XCTAssertTrue(
      match.waitForExistence(timeout: 10),
      "Tab '\(title)' not found in any button"
    )
    match.tap()
  }

  private func tabIndex(for title: String) -> Int {
    switch title {
    case "Chat": return 1
    case "History": return 2
    case "Settings": return 3
    default: return 1
    }
  }
}
