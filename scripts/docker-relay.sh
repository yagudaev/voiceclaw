#!/usr/bin/env bash
set -euo pipefail

# ── docker-relay.sh ──────────────────────────────────────────────────────────
# Build, run, and test the VoiceClaw relay server in Docker.
#
# Usage:
#   ./scripts/docker-relay.sh build          Build the Docker image
#   ./scripts/docker-relay.sh start          Start the container (detached)
#   ./scripts/docker-relay.sh stop           Stop and remove the container
#   ./scripts/docker-relay.sh restart        Stop then start
#   ./scripts/docker-relay.sh test           Health-check a running container
#   ./scripts/docker-relay.sh logs           Tail container logs
#   ./scripts/docker-relay.sh status         Show container status
# ─────────────────────────────────────────────────────────────────────────────

IMAGE_NAME="voiceclaw-relay"
CONTAINER_NAME="voiceclaw-relay"
PORT="${PORT:-8080}"

# Resolve paths relative to the repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RELAY_DIR="$REPO_ROOT/relay-server"
ENV_FILE="$RELAY_DIR/.env"

# ── Helpers ──────────────────────────────────────────────────────────────────

info()  { printf "\033[1;34m[info]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[ok]\033[0m    %s\n" "$*"; }
warn()  { printf "\033[1;33m[warn]\033[0m  %s\n" "$*"; }
error() { printf "\033[1;31m[error]\033[0m %s\n" "$*" >&2; }
die()   { error "$*"; exit 1; }

require_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker is not installed or not in PATH"
}

require_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    warn "No .env file found at $ENV_FILE"
    warn "Copy the example and fill in your keys:"
    warn "  cp $RELAY_DIR/.env.example $ENV_FILE"
    die "Missing .env file"
  fi
}

container_running() {
  docker ps --filter "name=$CONTAINER_NAME" --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"
}

# ── Commands ─────────────────────────────────────────────────────────────────

cmd_build() {
  require_docker
  info "Building Docker image: $IMAGE_NAME"
  docker build -t "$IMAGE_NAME" "$RELAY_DIR"
  ok "Image built: $IMAGE_NAME"
}

cmd_start() {
  require_docker
  require_env_file

  if container_running; then
    warn "Container $CONTAINER_NAME is already running"
    return 0
  fi

  # Remove stopped container with the same name if it exists
  docker rm "$CONTAINER_NAME" 2>/dev/null || true

  info "Starting container: $CONTAINER_NAME (port $PORT)"
  docker run -d \
    --name "$CONTAINER_NAME" \
    --env-file "$ENV_FILE" \
    -e NODE_ENV=production \
    -p "${PORT}:8080" \
    --restart unless-stopped \
    "$IMAGE_NAME"

  info "Waiting for health check..."
  if wait_for_health; then
    ok "Container is healthy and running on port $PORT"
  else
    error "Container failed health check"
    info "Showing recent logs:"
    docker logs --tail 30 "$CONTAINER_NAME"
    exit 1
  fi
}

cmd_stop() {
  require_docker

  if container_running; then
    info "Stopping container: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME" >/dev/null
    docker rm "$CONTAINER_NAME" >/dev/null
    ok "Container stopped and removed"
  else
    warn "Container $CONTAINER_NAME is not running"
    # Clean up stopped container if it exists
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
  fi
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_test() {
  require_docker

  if ! container_running; then
    die "Container $CONTAINER_NAME is not running. Start it first with: $0 start"
  fi

  info "Testing health endpoint..."
  local response
  response=$(curl -sf "http://localhost:${PORT}/health" 2>&1) || {
    error "Health check failed"
    exit 1
  }

  if echo "$response" | grep -q '"ok"'; then
    ok "Health check passed: $response"
  else
    error "Unexpected health response: $response"
    exit 1
  fi

  info "Testing WebSocket endpoint availability..."
  # A quick check that the WS upgrade path responds (will get a 400 since it's not a WS request)
  local ws_status
  ws_status=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/ws" 2>&1) || true
  # ws endpoint returns an upgrade-required or similar non-200 for plain HTTP, which is expected
  info "WebSocket endpoint responded with HTTP $ws_status (non-200 is expected for plain HTTP)"

  ok "All tests passed"
}

cmd_logs() {
  require_docker
  docker logs -f "$CONTAINER_NAME"
}

cmd_status() {
  require_docker

  if container_running; then
    ok "Container $CONTAINER_NAME is running"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Status}}\t{{.Ports}}"
  else
    warn "Container $CONTAINER_NAME is not running"
  fi
}

# ── Health check with retry ──────────────────────────────────────────────────

wait_for_health() {
  local retries=20
  local delay=1

  for ((i = 1; i <= retries; i++)); do
    if curl -sf "http://localhost:${PORT}/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

# ── Main ─────────────────────────────────────────────────────────────────────

usage() {
  printf "Usage: %s <command>\n\n" "$(basename "$0")"
  printf "Commands:\n"
  printf "  build     Build the Docker image\n"
  printf "  start     Start the container (detached)\n"
  printf "  stop      Stop and remove the container\n"
  printf "  restart   Stop then start\n"
  printf "  test      Health-check a running container\n"
  printf "  logs      Tail container logs\n"
  printf "  status    Show container status\n"
}

main() {
  if [ $# -eq 0 ]; then
    usage
    exit 1
  fi

  case "${1}" in
    build)   cmd_build   ;;
    start)   cmd_start   ;;
    stop)    cmd_stop     ;;
    restart) cmd_restart  ;;
    test)    cmd_test     ;;
    logs)    cmd_logs     ;;
    status)  cmd_status   ;;
    -h|--help|help) usage ;;
    *) error "Unknown command: $1"; usage; exit 1 ;;
  esac
}

main "$@"
