#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVICE_UDID="${DEVICE_UDID:-}"
TEXT="${TEXT:-Hello VoiceClaw. Please tell me a short joke about coffee.}"
PLAY_DELAY="${PLAY_DELAY:-12}"
TEST_TARGET="${TEST_TARGET:-PipelineTests/testRealSpeechFixtureRoundTrip}"
OUTPUT="${OUTPUT:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --udid)
      DEVICE_UDID="$2"
      shift 2
      ;;
    --text)
      TEXT="$2"
      shift 2
      ;;
    --play-delay)
      PLAY_DELAY="$2"
      shift 2
      ;;
    --test)
      TEST_TARGET="$2"
      shift 2
      ;;
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/run-device-audio-e2e.sh [options]

Options:
  --udid DEVICE_UDID   Physical device UDID
  --text TEXT          Prompt text for the saved speech fixture
  --play-delay SEC     Delay before playing the speech fixture
  --test TARGET        XCTest target path, default PipelineTests/testRealSpeechFixtureRoundTrip
  --output PATH        Output mp3 path

Notes:
  - Keep the phone close to the Mac speakers before running this.
  - The script generates an ElevenLabs mp3 fixture, saves it, then plays it
    while the device UI test is waiting for speech.
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if ! command -v afplay >/dev/null 2>&1; then
  echo "ERROR: afplay is required for local audio playback." >&2
  exit 1
fi

FIXTURE_CMD=("$PROJECT_ROOT/scripts/generate-elevenlabs-fixture.sh")
if [[ -n "$DEVICE_UDID" ]]; then
  FIXTURE_CMD+=(--udid "$DEVICE_UDID")
fi
FIXTURE_CMD+=(--text "$TEXT")
if [[ -n "$OUTPUT" ]]; then
  FIXTURE_CMD+=(--output "$OUTPUT")
fi

FIXTURE_PATH="$("${FIXTURE_CMD[@]}")"
PLAYER_PID=""

cleanup() {
  if [[ -n "$PLAYER_PID" ]]; then
    kill "$PLAYER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "==> Speech fixture: $FIXTURE_PATH"
echo "==> Playback delay: ${PLAY_DELAY}s"
echo "==> Test target: $TEST_TARGET"
echo "==> Keep the device close to the Mac speakers."

(
  sleep "$PLAY_DELAY"
  afplay "$FIXTURE_PATH"
) &
PLAYER_PID=$!

cd "$PROJECT_ROOT"
TEST_CMD=("$PROJECT_ROOT/scripts/run-device-tests.sh")
if [[ -n "$DEVICE_UDID" ]]; then
  TEST_CMD+=(--udid "$DEVICE_UDID")
fi
TEST_CMD+=(--only "$TEST_TARGET")
"${TEST_CMD[@]}"
