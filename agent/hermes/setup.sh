#!/usr/bin/env bash
#
# VoiceClaw — Hermes API Server Setup
#
# Enables the Hermes gateway HTTP API so the relay server can talk to
# Holly over OpenAI-compatible /v1/chat/completions instead of CLI.
#
# Usage:
#   ./agent/hermes/setup.sh              # interactive (prompts for API key)
#   ./agent/hermes/setup.sh --no-key     # skip auth (local dev only)
#   ./agent/hermes/setup.sh --key SECRET # set a specific key
#
# What it does:
#   1. Checks that hermes is installed
#   2. Appends API_SERVER_ENABLED=true to ~/.hermes/.env
#   3. Optionally sets API_SERVER_KEY for bearer auth
#   4. Restarts the hermes gateway
#   5. Verifies the API is responding on port 8642
#
set -euo pipefail

HERMES_ENV="${HOME}/.hermes/.env"
API_PORT=8642
API_URL="http://127.0.0.1:${API_PORT}"

# --- helpers (bottom of script has the main flow) ---

info()  { printf "\033[1;34m▸\033[0m %s\n" "$1"; }
ok()    { printf "\033[1;32m✓\033[0m %s\n" "$1"; }
err()   { printf "\033[1;31m✗\033[0m %s\n" "$1" >&2; }
die()   { err "$1"; exit 1; }

check_hermes() {
  command -v hermes >/dev/null 2>&1 || die "hermes not found in PATH. Install it first: https://github.com/hermes-agent/hermes"
  info "hermes found at $(which hermes)"
}

already_enabled() {
  grep -q "^API_SERVER_ENABLED=true" "$HERMES_ENV" 2>/dev/null
}

enable_api_server() {
  local key_arg="$1"

  if already_enabled; then
    ok "API_SERVER_ENABLED already set in ${HERMES_ENV}"
  else
    {
      echo ""
      echo "# VoiceClaw relay server integration"
      echo "API_SERVER_ENABLED=true"
      echo "API_SERVER_PORT=${API_PORT}"
    } >> "$HERMES_ENV"
    ok "Added API_SERVER_ENABLED=true to ${HERMES_ENV}"
  fi

  if [ -n "$key_arg" ]; then
    if grep -q "^API_SERVER_KEY=" "$HERMES_ENV" 2>/dev/null; then
      sed -i.bak "s/^API_SERVER_KEY=.*/API_SERVER_KEY=${key_arg}/" "$HERMES_ENV"
      rm -f "${HERMES_ENV}.bak"
    else
      echo "API_SERVER_KEY=${key_arg}" >> "$HERMES_ENV"
    fi
    ok "API_SERVER_KEY configured"
  fi
}

restart_gateway() {
  info "Restarting hermes gateway..."
  hermes gateway restart 2>/dev/null || hermes gateway start 2>/dev/null || true
  sleep 2
}

verify_health() {
  info "Checking ${API_URL}/health ..."
  local attempts=0
  while [ $attempts -lt 5 ]; do
    if curl -sf "${API_URL}/health" >/dev/null 2>&1; then
      ok "Hermes API server is running on port ${API_PORT}"
      echo ""
      info "Relay server can now reach Holly at:"
      echo "  POST ${API_URL}/v1/chat/completions"
      echo ""
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 1
  done
  err "API server not responding on port ${API_PORT} after 5 attempts"
  err "Check gateway logs: hermes gateway logs"
  return 1
}

# --- main ---

main() {
  local key=""
  local skip_key=false

  while [ $# -gt 0 ]; do
    case "$1" in
      --no-key)  skip_key=true; shift;;
      --key)     key="$2"; shift 2;;
      -h|--help) info "Usage: $0 [--no-key | --key SECRET]"; exit 0;;
      *)         die "Unknown option: $1";;
    esac
  done

  echo ""
  info "VoiceClaw — Hermes API Server Setup"
  echo ""

  check_hermes

  if [ -z "$key" ] && [ "$skip_key" = false ]; then
    printf "\033[1;34m▸\033[0m Enter API key for bearer auth (leave blank for no auth): "
    read -r key
  fi

  enable_api_server "$key"
  restart_gateway
  verify_health
}

main "$@"
