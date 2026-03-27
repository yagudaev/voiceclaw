#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# run-device-tests.sh
#
# Builds and runs XCUITests on a connected physical iOS device.
#
# Usage:
#   ./scripts/run-device-tests.sh                 # auto-detect device, run all tests
#   ./scripts/run-device-tests.sh --only SmokeTests  # run specific test class
#   ./scripts/run-device-tests.sh --udid DEVICE_ID   # target a specific device
#   ./scripts/run-device-tests.sh --prebuild         # run expo prebuild first
#
# Environment:
#   SCREENSHOT_DIR  - directory to save screenshots (default: /tmp/voiceclaw-screenshots)
#   DEVICE_UDID     - device UDID override (alternative to --udid flag)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Helper Functions ────────────────────────────────────────────────────────

detect_device() {
  if [ -n "$DEVICE_UDID" ]; then
    echo "$DEVICE_UDID"
    return
  fi

  # Try xcrun devicectl first (Xcode 15+)
  local device_id
  device_id=$(xcrun devicectl list devices 2>/dev/null \
    | grep "available" \
    | head -1 \
    | awk '{for(i=1;i<=NF;i++) if($i ~ /^[A-F0-9-]{36}$/) print $i}')

  if [ -n "$device_id" ]; then
    echo "$device_id"
    return
  fi

  # Fallback: try xctrace (older UDIDs)
  device_id=$(xcrun xctrace list devices 2>/dev/null \
    | grep -v "Simulator" \
    | grep -v "^==" \
    | grep -v "^$" \
    | grep -v "MacBook" \
    | head -1 \
    | sed 's/.*(\([A-Za-z0-9-]*\))/\1/')

  if [ -n "$device_id" ]; then
    echo "$device_id"
    return
  fi

  echo ""
}

parse_xcodebuild_output() {
  # Filter xcodebuild output to show only test results, not build spam
  while IFS= read -r line; do
    if [[ "$line" == *"Test Case"* ]] || \
       [[ "$line" == *"Test Suite"* ]] || \
       [[ "$line" == *"Executed"* ]] || \
       [[ "$line" == *"passed"* ]] || \
       [[ "$line" == *"failed"* ]] || \
       [[ "$line" == *"error:"* ]] || \
       [[ "$line" == *"** TEST"* ]]; then
      echo "$line"
    fi
  done
}

# ─── Main ────────────────────────────────────────────────────────────────────

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="$PROJECT_ROOT/ios/VoiceClaw.xcworkspace"
SCHEME="VoiceClaw"
SCREENSHOT_DIR="${SCREENSHOT_DIR:-/tmp/voiceclaw-screenshots}"
DEVICE_UDID="${DEVICE_UDID:-}"
ONLY_TESTING=""
DO_PREBUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --udid)
      DEVICE_UDID="$2"
      shift 2
      ;;
    --only)
      ONLY_TESTING="$2"
      shift 2
      ;;
    --prebuild)
      DO_PREBUILD=true
      shift
      ;;
    --screenshot-dir)
      SCREENSHOT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      head -17 "$0" | tail -14
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ─── Prebuild (optional) ────────────────────────────────────────────────────

if [ "$DO_PREBUILD" = true ]; then
  echo "==> Running expo prebuild..."
  cd "$PROJECT_ROOT"
  npx expo prebuild --platform ios --clean
  echo ""
fi

# ─── Detect device ──────────────────────────────────────────────────────────

DEVICE_UDID=$(detect_device)

if [ -z "$DEVICE_UDID" ]; then
  echo "ERROR: No connected iOS device found."
  echo ""
  echo "Make sure your device is:"
  echo "  1. Connected via USB or on the same network"
  echo "  2. Paired and trusted"
  echo "  3. Unlocked"
  echo ""
  echo "Or specify a device with: --udid YOUR_DEVICE_UDID"
  exit 1
fi

echo "==> Device: $DEVICE_UDID"

# ─── Validate workspace ────────────────────────────────────────────────────

if [ ! -d "$WORKSPACE" ]; then
  echo "ERROR: Xcode workspace not found at $WORKSPACE"
  echo "Run with --prebuild or: npx expo prebuild --platform ios"
  exit 1
fi

# ─── Prepare screenshot directory ────────────────────────────────────────────

mkdir -p "$SCREENSHOT_DIR"
echo "==> Screenshots: $SCREENSHOT_DIR"
echo ""

# ─── Build test arguments ────────────────────────────────────────────────────

XCODEBUILD_ARGS=(
  -workspace "$WORKSPACE"
  -scheme "$SCHEME"
  -destination "id=$DEVICE_UDID"
)

if [ -n "$ONLY_TESTING" ]; then
  XCODEBUILD_ARGS+=(-only-testing:"VoiceClawUITests/$ONLY_TESTING")
  echo "==> Running: $ONLY_TESTING"
else
  echo "==> Running: all UI tests"
fi

echo ""

# ─── Run tests ───────────────────────────────────────────────────────────────

RESULT_BUNDLE_PATH="/tmp/voiceclaw-test-results-$(date +%s).xcresult"

echo "==> Building and testing..."
echo ""

set +e
xcodebuild test \
  "${XCODEBUILD_ARGS[@]}" \
  -resultBundlePath "$RESULT_BUNDLE_PATH" \
  SCREENSHOT_DIR="$SCREENSHOT_DIR" \
  2>&1 | tee /tmp/voiceclaw-xcodebuild.log | parse_xcodebuild_output

TEST_EXIT_CODE=${PIPESTATUS[0]}
set -e

echo ""
echo "─────────────────────────────────────────────"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "RESULT: ALL TESTS PASSED"
else
  echo "RESULT: SOME TESTS FAILED (exit code $TEST_EXIT_CODE)"
fi

echo "─────────────────────────────────────────────"

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "Full log:       /tmp/voiceclaw-xcodebuild.log"
echo "Result bundle:  $RESULT_BUNDLE_PATH"
echo "Screenshots:    $SCREENSHOT_DIR/"

if [ -d "$SCREENSHOT_DIR" ]; then
  screenshot_count=$(find "$SCREENSHOT_DIR" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$screenshot_count" -gt 0 ]; then
    echo "  ($screenshot_count screenshots saved)"
  fi
fi

echo ""
exit $TEST_EXIT_CODE
