#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

echo "VoiceClaw Relay Server Setup"
echo "============================"
echo

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
  echo "Found existing .env file at $ENV_FILE"
  read -rp "Overwrite? (y/N) " overwrite
  if [[ "$overwrite" != "y" && "$overwrite" != "Y" ]]; then
    echo "Keeping existing .env"
    exit 0
  fi
fi

# Prompt for OpenAI API key
echo
read -rp "Enter your OpenAI API key (sk-...): " OPENAI_KEY

if [[ -z "$OPENAI_KEY" ]]; then
  echo "Error: API key cannot be empty"
  exit 1
fi

# Validate the key against OpenAI's API
echo
echo "Validating API key..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_KEY")

if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "Error: OpenAI API returned HTTP $HTTP_STATUS — key may be invalid"
  exit 1
fi

echo "API key is valid"

# Write .env
cat > "$ENV_FILE" <<EOF
# OpenAI API key for Realtime API access
OPENAI_API_KEY=$OPENAI_KEY

# Server port (default: 8080)
# PORT=8080
EOF

echo
echo "Wrote $ENV_FILE"
echo "Start the server with: yarn dev:server"
