# Automated iOS Device Testing Plan

## Goal

Enable Claude Code to autonomously build, deploy, interact with, and verify the VoiceClaw app on a physical iPhone (UDID: `<YOUR_DEVICE_UDID>`) without requiring manual user intervention.

> **Note:** Replace `<YOUR_DEVICE_UDID>` with your own device UDID. Find it with `xcrun xctrace list devices` or `idevice_id -l`.

## Current Environment

- **Device:** iPhone 12 Pro, iOS 26.3.1, Developer Mode enabled, DDI mounted
- **Mac:** Apple M3 Max, macOS 15.3.1, Xcode installed
- **Project:** Expo SDK 55, React Native 0.83, custom native Turbo Module (Vapi Swift bridge)
- **Available tools:** `idb`, `libimobiledevice` (idevicescreenshot, idevicesyslog, etc.), `xcrun devicectl`, `xcodebuild`

---

## Approach Comparison

### 1. idb (iOS Development Bridge) by Facebook

**What works on physical devices:**
- `idb list-targets` -- device discovery
- `idb log` -- device log streaming with predicate filtering
- `idb launch` / `idb terminate` -- app lifecycle
- `idb install` / `idb uninstall` -- app management
- `idb xctest run ui` -- run XCUITest bundles on device
- `idb list-apps` -- enumerate installed apps

**What does NOT work on physical devices (tested):**
- `idb screenshot` -- fails with "SecureStartService of com.apple.mobile.screenshotr Failed"
- `idb ui tap` -- fails with "Target doesn't conform to FBSimulatorLifecycleCommands protocol"
- `idb ui describe-all` -- fails with "Target doesn't conform to FBAccessibilityCommands protocol"
- `idb ui text`, `idb ui swipe` -- same protocol conformance failure
- All `idb ui *` commands -- **simulator-only**

**Verdict:** idb's UI interaction commands are **simulator-only**. Its value on physical devices is limited to app lifecycle management, log streaming, and running pre-built XCTest bundles. Not sufficient on its own.

---

### 2. XCUITest via xcodebuild

**How it works:** Write Swift XCUITest test cases that use Apple's accessibility APIs to find elements, tap, type, swipe, and assert UI state. Run them from the command line with `xcodebuild test`.

**Command structure:**
```bash
xcodebuild test \
  -workspace ios/voiceclaw.xcworkspace \
  -scheme VoiceClaw \
  -destination 'platform=iOS,id=<YOUR_DEVICE_UDID>' \
  -only-testing:VoiceClawUITests/TestClassName/testMethodName
```

**Pros:**
- First-party Apple framework -- most reliable on real devices
- Full access to accessibility tree, tap, type, swipe, assertions
- Can take screenshots via `XCTAttachment`
- Can be invoked from CLI without any third-party dependencies
- `idb xctest run ui` can also run pre-built XCUITest bundles
- Tests can be targeted individually (`-only-testing`)

**Cons:**
- Tests must be written in Swift (not JavaScript/TypeScript)
- Requires a UI test target in the Xcode project (needs to be created)
- Longer feedback loop: build test target, deploy, run
- Cannot dynamically generate new test cases at runtime -- Claude Code would need to write Swift test files, build, and run them
- Code signing required for the test runner on physical devices

**Verdict:** The most reliable approach for physical device testing. The main friction is the Swift compilation step, but this is manageable since Claude Code can write/edit Swift files and invoke xcodebuild.

---

### 3. Appium + WebDriverAgent (WDA)

**How it works:** Appium is a Node.js server implementing the W3C WebDriver protocol. For iOS, it uses the XCUITest driver which deploys WebDriverAgent (a Facebook-originated XCTest-based HTTP server) onto the device. Once running, WDA exposes a REST API on the device that proxies commands to native XCTest calls.

**Capabilities on real devices:**
- Tap, type, swipe, scroll, long press
- Screenshot capture
- Access full accessibility tree (element hierarchy)
- Find elements by accessibility ID, label, XPath, class name
- Launch/terminate apps
- Get/set device orientation

**Setup requirements:**
- Install Node.js, Appium 2.x, XCUITest driver
- Configure `xcodeOrgId` and `xcodeSigningId` for automatic code signing of WDA
- WDA builds and deploys to device on first run (one-time ~2 min build)
- Appium server runs locally, proxies HTTP requests to WDA on device via USB

**Pros:**
- Rich HTTP API -- Claude Code can make curl requests to interact with the app
- No need to compile new Swift code for each interaction
- Dynamic element discovery and interaction
- Screenshots via API endpoint
- Well-documented, large community
- Works on physical devices with proper signing

**Cons:**
- Heavy dependency chain (Node.js, Appium server, WDA, XCUITest driver)
- Initial WDA build can be flaky with code signing
- Appium server must stay running as a long-lived process
- Additional port forwarding complexity for physical devices
- Performance overhead compared to direct XCUITest

**Verdict:** Excellent capabilities but heavy setup. The HTTP API model is ideal for Claude Code since it can issue curl commands dynamically without recompilation. Worth considering as a secondary approach.

---

### 4. Maestro

**Official iOS support:** Simulator-only. No physical device support.

**Community workaround:** `maestro-ios-device` (by devicelab-dev) patches Maestro to work on physical devices via an XCTest runner that starts an HTTP server on device port 22087, with port forwarding to localhost.

**Setup:**
```bash
curl -fsSL https://raw.githubusercontent.com/devicelab-dev/maestro-ios-device/main/setup.sh | bash
maestro-ios-device --team-id TEAM_ID --device DEVICE_UDID
maestro --driver-host-port 6001 --device DEVICE_UDID --app-file /path/to/app.ipa test flow.yaml
```

**Pros:**
- YAML-based test flows (easy for Claude Code to generate)
- Good for UI flow testing
- Community bridge exists for physical devices

**Cons:**
- Physical device support is unofficial/community-maintained
- Requires patching Maestro installation (fragile)
- `--app-file` is mandatory (need .ipa for every test run)
- Some commands unsupported on real devices (addMedia)
- Maestro itself not installed on this machine (would need `brew install maestro`)
- Two terminal processes required (bridge + test runner)

**Verdict:** Promising YAML-based approach but the physical device support is community-maintained and fragile. The need for an .ipa file per run adds friction for a development workflow. Not recommended as the primary approach.

---

### 5. Detox

**Physical device support:** Android only. iOS real device testing is **not supported**.

**Verdict:** Not viable for our use case. Eliminated.

---

### 6. xcrun devicectl

**Available on physical devices:**
- `devicectl list devices` -- device discovery
- `devicectl device process launch` -- launch apps (with `--console` for log streaming)
- `devicectl device process terminate` -- kill apps
- `devicectl device install app` -- install apps
- `devicectl device info apps` -- list installed apps
- `devicectl device info processes` -- list running processes

**NOT available:**
- No screenshot capability
- No UI interaction (tap, type, swipe)
- No accessibility tree inspection

**Verdict:** Useful for app lifecycle management alongside other tools, but cannot drive UI interaction or capture screenshots. Supplementary only.

---

### 7. libimobiledevice

**Installed tools:** `idevicescreenshot`, `idevicesyslog`, `idevice_id`, `ideviceinfo`, `idevicediagnostics`, `idevicedebug`

**Current status on this device:**
- `idevicescreenshot` -- **fails** with "Could not start screenshotr service: Invalid service" (requires Developer Disk Image mount via legacy protocol, which iOS 17+ changed)
- `idevice_id -l` -- works, lists device UDID
- `idevicesyslog` -- likely works for log capture

**Verdict:** Limited utility on iOS 17+. The screenshot service protocol changed and libimobiledevice hasn't kept up. Not reliable for our iOS 26.3.1 device.

---

### 8. XcodeBuildMCP

**What it is:** An MCP server that wraps xcodebuild and provides 59+ tools for AI agents to build, test, and debug iOS apps.

**Physical device tools:**
- `build_device`, `build_run_device` -- build and deploy to device
- `install_app_device`, `launch_app_device`, `stop_app_device`
- `test_device` -- run test suites on physical devices
- `start_device_log_cap` / `stop_device_log_cap` -- log capture
- `list_devices`, `get_device_app_path`

**Simulator-only tools (NOT available on device):**
- `tap`, `type_text`, `swipe`, `long_press`, `touch` -- UI automation
- `screenshot`, `snapshot_ui` -- screen capture and view hierarchy

**Verdict:** XcodeBuildMCP is excellent for build/deploy/test workflow but its UI automation is simulator-only. It would help with the "build and deploy" part but not with interactive testing on the physical device.

---

### 9. Cavy (React Native)

**How it works:** In-app test framework that uses React refs to find and interact with components. Tests run inside the live app.

**Pros:**
- Tests written in JavaScript
- Runs on any device where the app runs
- Direct access to React component tree

**Cons:**
- Requires instrumenting the app with test hooks (production code changes)
- No screenshot capability
- Limited to React-layer interactions (cannot test native module behavior)
- Project appears less actively maintained
- Cannot test the native Vapi bridge which is the core of VoiceClaw

**Verdict:** Not suitable. VoiceClaw's critical functionality is in the native Swift bridge, which Cavy cannot test.

---

## Recommended Approach: Hybrid XCUITest + Appium

### Primary: XCUITest via xcodebuild (Phase 1)

XCUITest is the most reliable option for physical device testing. The workflow:

1. **Claude Code writes/edits Swift XCUITest files** in a `VoiceClawUITests` target
2. **Build and run tests** via `xcodebuild test -destination 'platform=iOS,id=...'`
3. **Parse xcodebuild output** for pass/fail results
4. **Extract screenshots** from the xcresult bundle
5. **Read Metro logs** from `/tmp/metro-live.log` for JS-side verification

This approach requires a one-time setup of the UI test target in Xcode, after which Claude Code can iterate on test cases by editing Swift files and running `xcodebuild test`.

### Secondary: Appium/WDA for Dynamic Exploration (Phase 2)

Once XCUITest is working, add Appium as an optional tool for:
- **Ad-hoc UI exploration** -- Claude Code can curl the WDA API to discover elements, take screenshots, and interact dynamically without recompilation
- **Quick verification checks** -- tap a button and take a screenshot without writing a full XCUITest

### Supplementary Tools (Both Phases)

- **`xcrun devicectl`** -- app lifecycle (launch, terminate, install)
- **`idb log`** -- device log streaming with predicate filtering
- **Metro logs** (`/tmp/metro-live.log`) -- JS bundle load verification, React Native errors

---

## Implementation Steps

### Phase 1: XCUITest Foundation (estimated: 1-2 hours)

1. **Create UI test target** -- Add `VoiceClawUITests` target to the Xcode project
2. **Configure code signing** -- Ensure the test runner is signed for the physical device
3. **Write base test helper** -- Swift utilities for common operations:
   - Launch app and wait for ready state
   - Find elements by accessibility ID
   - Take and save screenshots
   - Assert text content
4. **Add accessibility identifiers** -- Tag key React Native components with `testID` props (these map to accessibility identifiers on iOS)
5. **Write smoke test** -- Verify app launches and main screen renders
6. **Create CLI wrapper script** -- Shell script that Claude Code calls to build and run tests, parse results, and extract screenshots
7. **Test the full loop** -- Claude Code writes a test, builds, runs, reads results

### Phase 2: Appium/WDA Integration (estimated: 2-3 hours)

1. **Install Appium** -- `npm install -g appium` and `appium driver install xcuitest`
2. **Configure WDA signing** -- Set `xcodeOrgId` and `xcodeSigningId`
3. **Create start/stop scripts** -- Launch Appium server in background, tear down when done
4. **Write curl-based interaction helpers** -- Shell functions Claude Code can call:
   - `device-screenshot` -- capture current screen
   - `device-tap <element>` -- tap by accessibility ID
   - `device-type <text>` -- type into focused field
   - `device-tree` -- dump accessibility tree as JSON
5. **Test dynamic exploration** -- Claude Code uses curl to explore app state

### Phase 3: CI Integration (future)

1. Connect to CI pipeline for automated regression testing
2. Run XCUITest suite on every PR

---

## What Can Be Automated vs Manual

### Fully Automatable
- Build and deploy to device
- App launch verification (Metro logs + XCUITest)
- UI element presence verification
- Button taps, text input, navigation
- Screenshot capture and comparison
- Log monitoring and error detection
- Accessibility tree inspection

### Requires Manual Testing
- Audio/microphone functionality (Vapi voice calls) -- hardware input cannot be simulated
- Push notification delivery (requires Apple Push Notification service)
- Background/foreground app lifecycle edge cases
- Bluetooth/network connectivity changes
- Physical gesture nuances (force touch, etc.)

### Partially Automatable
- Voice call flow -- can automate initiating a call and verifying UI state changes, but cannot verify actual audio quality
- Settings/permissions -- XCUITest can interact with system dialogs, but initial permission grants may need one-time manual approval

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Code signing issues with test runner | Pre-configure signing in Xcode, document Team ID and provisioning profile |
| XCUITest build times slow down iteration | Use `build-for-testing` + `test-without-building` to separate compilation from execution |
| Accessibility IDs missing from RN components | Systematically add `testID` to all interactive components |
| WDA build failures on first run | Document exact Appium/WDA setup steps, test before relying on it |
| iOS version incompatibilities | Pin Xcode version, test DDI compatibility |
