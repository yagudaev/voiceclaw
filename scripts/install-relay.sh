#!/usr/bin/env bash
set -euo pipefail

# ── VoiceClaw Relay Server Installer ────────────────────────────────────────
# One-line install:
#   curl -fsSL https://raw.githubusercontent.com/yagudaev/voiceclaw/main/scripts/install-relay.sh | bash
#
# Non-interactive (pass env vars):
#   GEMINI_API_KEY=xxx RELAY_API_KEY=yyy ./scripts/install-relay.sh
#
# Idempotent — safe to run multiple times.
# ────────────────────────────────────────────────────────────────────────────

REPO_URL="https://github.com/yagudaev/voiceclaw.git"
INSTALL_DIR="${VOICECLAW_DIR:-$HOME/voiceclaw}"
RELAY_DIR="$INSTALL_DIR/relay-server"

# ── Color helpers ───────────────────────────────────────────────────────────

info()  { printf "\033[1;34m[info]\033[0m  %s\n" "$*" ; }
ok()    { printf "\033[1;32m[ok]\033[0m    %s\n" "$*" ; }
warn()  { printf "\033[1;33m[warn]\033[0m  %s\n" "$*" ; }
error() { printf "\033[1;31m[error]\033[0m %s\n" "$*" >&2 ; }
die()   { error "$*" ; exit 1 ; }

# ── Prerequisite checks ────────────────────────────────────────────────────

check_prerequisites() {
  info "Checking prerequisites..."

  # Node.js 20+
  if ! command -v node >/dev/null 2>&1; then
    die "Node.js is not installed. Install Node.js 20+ from https://nodejs.org"
  fi

  local node_major
  node_major=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
  if [ "$node_major" -lt 20 ]; then
    die "Node.js $node_major.x found but 20+ is required. Upgrade at https://nodejs.org"
  fi
  ok "Node.js $(node --version)"

  # npm (ships with node but verify)
  if ! command -v npm >/dev/null 2>&1; then
    die "npm is not installed (should come with Node.js)"
  fi
  ok "npm $(npm --version)"

  # git
  if ! command -v git >/dev/null 2>&1; then
    die "git is not installed. Install from https://git-scm.com"
  fi
  ok "git $(git --version | awk '{print $3}')"
}

# ── Clone or pull ───────────────────────────────────────────────────────────

setup_repo() {
  if [ -d "$INSTALL_DIR/.git" ]; then
    info "Repository already exists at $INSTALL_DIR — pulling latest..."
    git -C "$INSTALL_DIR" pull --ff-only || {
      warn "git pull failed (you may have local changes). Continuing with current state."
    }
    ok "Repository updated"
  else
    info "Cloning VoiceClaw into $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    ok "Repository cloned"
  fi
}

# ── Install dependencies ───────────────────────────────────────────────────

install_deps() {
  info "Installing relay server dependencies..."
  cd "$RELAY_DIR"
  npm install
  ok "Dependencies installed"
}

# ── Create .env ─────────────────────────────────────────────────────────────

setup_env() {
  local env_file="$RELAY_DIR/.env"
  local example_file="$RELAY_DIR/.env.example"

  if [ -f "$env_file" ]; then
    info ".env already exists — skipping creation"
    ok "Using existing .env"
    return
  fi

  if [ ! -f "$example_file" ]; then
    die "Missing .env.example at $example_file"
  fi

  info "Creating .env from .env.example..."
  cp "$example_file" "$env_file"

  # Apply any env vars passed to this script
  local updated=false

  if [ -n "${GEMINI_API_KEY:-}" ]; then
    set_env_value "$env_file" "GEMINI_API_KEY" "$GEMINI_API_KEY"
    ok "Set GEMINI_API_KEY from environment"
    updated=true
  fi

  if [ -n "${OPENAI_API_KEY:-}" ]; then
    set_env_value "$env_file" "OPENAI_API_KEY" "$OPENAI_API_KEY"
    ok "Set OPENAI_API_KEY from environment"
    updated=true
  fi

  if [ -n "${RELAY_API_KEY:-}" ]; then
    set_env_value "$env_file" "RELAY_API_KEY" "$RELAY_API_KEY"
    ok "Set RELAY_API_KEY from environment"
    updated=true
  fi

  if [ -n "${OPENCLAW_GATEWAY_AUTH_TOKEN:-}" ]; then
    set_env_value "$env_file" "OPENCLAW_GATEWAY_AUTH_TOKEN" "$OPENCLAW_GATEWAY_AUTH_TOKEN"
    ok "Set OPENCLAW_GATEWAY_AUTH_TOKEN from environment"
    updated=true
  fi

  # Interactive prompts if running in a terminal and keys are still empty
  if [ -t 0 ] && [ "$updated" = false ]; then
    info "Let's configure your API keys (press Enter to skip any)."
    echo ""

    prompt_env_value "$env_file" "GEMINI_API_KEY" \
      "Gemini API key (https://aistudio.google.com/apikey)"

    prompt_env_value "$env_file" "OPENAI_API_KEY" \
      "OpenAI API key (https://platform.openai.com/api-keys)"

    prompt_env_value "$env_file" "RELAY_API_KEY" \
      "Relay API key (clients use this to connect — generate with: openssl rand -hex 24)"

    echo ""
  fi

  ok ".env created at $env_file"
}

# ── Build ───────────────────────────────────────────────────────────────────

build_relay() {
  info "Building relay server..."
  cd "$RELAY_DIR"
  npm run build
  ok "Build complete"
}

# ── Start and verify ────────────────────────────────────────────────────────

start_and_verify() {
  info "Starting relay server..."
  cd "$RELAY_DIR"

  # Start in background
  node dist/index.js &
  local server_pid=$!

  # Give it a moment to boot
  info "Waiting for server to start..."
  local retries=15
  local delay=1
  local healthy=false

  for ((i = 1; i <= retries; i++)); do
    if curl -sf "http://localhost:8080/health" >/dev/null 2>&1; then
      healthy=true
      break
    fi
    sleep "$delay"
  done

  if [ "$healthy" = true ]; then
    ok "Relay server is running and healthy"
    ok "Health check: http://localhost:8080/health"
    ok "WebSocket:    ws://localhost:8080/ws"
    echo ""
    info "The server is running in the background (PID $server_pid)."
    info "Stop it with: kill $server_pid"
    info "Or run it in the foreground with:"
    info "  cd $RELAY_DIR && npm start"
  else
    error "Server failed to start within ${retries}s"
    kill "$server_pid" 2>/dev/null || true
    info "Check the relay server logs for errors."
    info "Make sure your .env has valid API keys."
    info "Try running manually: cd $RELAY_DIR && npm start"
    exit 1
  fi
}

# ── Env file helpers ────────────────────────────────────────────────────────

set_env_value() {
  local file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    # Replace existing line (works on both macOS and Linux sed)
    if [[ "$OSTYPE" == darwin* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
  else
    echo "${key}=${value}" >> "$file"
  fi
}

prompt_env_value() {
  local file="$1" key="$2" prompt_text="$3"
  local current_value
  current_value=$(grep "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2- || echo "")

  # Skip if already set to something real
  if [ -n "$current_value" ] && [ "$current_value" != "sk-..." ] && [ "$current_value" != "" ]; then
    return
  fi

  printf "  \033[1;36m%s\033[0m: " "$prompt_text"
  local input
  read -r input
  if [ -n "$input" ]; then
    set_env_value "$file" "$key" "$input"
    ok "Set $key"
  fi
}

# ── Main ────────────────────────────────────────────────────────────────────

main() {
  echo ""
  printf "\033[1;35m  VoiceClaw Relay Server Installer\033[0m\n"
  echo "  ================================="
  echo ""

  check_prerequisites
  echo ""
  setup_repo
  echo ""
  install_deps
  echo ""
  setup_env
  echo ""
  build_relay
  echo ""
  start_and_verify
  echo ""
  ok "Installation complete!"
}

main
