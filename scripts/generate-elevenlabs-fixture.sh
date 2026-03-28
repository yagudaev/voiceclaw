#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVICE_UDID="${DEVICE_UDID:-}"
DEVICE_DB="${DEVICE_DB:-}"
VOICE_ID="${VOICE_ID:-Awx8TeMHHpDzbm42nIB6}"
TEXT="${TEXT:-Hello VoiceClaw. Please tell me a short joke about coffee.}"
OUTPUT="${OUTPUT:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --udid)
      DEVICE_UDID="$2"
      shift 2
      ;;
    --db)
      DEVICE_DB="$2"
      shift 2
      ;;
    --voice-id)
      VOICE_ID="$2"
      shift 2
      ;;
    --text)
      TEXT="$2"
      shift 2
      ;;
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/generate-elevenlabs-fixture.sh [options]

Options:
  --udid DEVICE_UDID   Pull settings DB from this device if --db is not given
  --db PATH            Read the ElevenLabs API key from a local voiceclaw.db
  --voice-id ID        ElevenLabs voice ID
  --text TEXT          Prompt text to synthesize
  --output PATH        Output mp3 path
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$OUTPUT" ]]; then
  mkdir -p /tmp/voiceclaw-audio-fixtures
  OUTPUT="/tmp/voiceclaw-audio-fixtures/fixture-$(date +%s).mp3"
fi

mkdir -p "$(dirname "$OUTPUT")"

if [[ -z "$DEVICE_DB" ]]; then
  if [[ -z "$DEVICE_UDID" ]]; then
    echo "ERROR: pass --db or --udid so the script can resolve the ElevenLabs key." >&2
    exit 1
  fi

  DEVICE_DB="/tmp/voiceclaw-device-fixture.db"
  rm -f "$DEVICE_DB"
  xcrun devicectl device copy from \
    --device "$DEVICE_UDID" \
    --domain-type appDataContainer \
    --domain-identifier com.yagudaev.voiceclaw \
    --source Documents/SQLite/voiceclaw.db \
    --destination "$DEVICE_DB" >/dev/null
fi

if [[ ! -f "$DEVICE_DB" ]]; then
  echo "ERROR: could not find device database at $DEVICE_DB" >&2
  exit 1
fi

API_KEY="$(sqlite3 "$DEVICE_DB" "select value from settings where key='elevenlabs_api_key';")"

if [[ -z "$API_KEY" ]]; then
  echo "ERROR: elevenlabs_api_key is not set in $DEVICE_DB" >&2
  exit 1
fi

REQUEST_BODY="$(python3 - <<'PY' "$TEXT"
import json
import sys
print(json.dumps({
    "text": sys.argv[1],
    "model_id": "eleven_turbo_v2_5",
}))
PY
)"

curl -sS -X POST \
  "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID/stream" \
  -H "xi-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY" \
  -o "$OUTPUT"

printf '%s\n' "$TEXT" > "${OUTPUT%.mp3}.txt"
echo "$OUTPUT"
