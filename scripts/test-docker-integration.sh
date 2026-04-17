#!/usr/bin/env bash
set -euo pipefail

# ── Full-Stack Docker Integration Test ──────────────────────────────────────
# Tests the relay server in complete isolation using Docker.
#
# What it tests:
#   1. Docker image builds successfully
#   2. Container starts and passes health check
#   3. HTTP health endpoint returns {"status":"ok"}
#   4. WebSocket endpoint accepts connections and handles session.config
#
# Usage:
#   ./scripts/test-docker-integration.sh
#
# Environment variables:
#   GEMINI_API_KEY    — if set, uses it in the test container
#   RELAY_API_KEY     — if set, uses it for auth (test script will use it too)
#   TEST_PORT         — port to expose (default: 18080, avoids conflicts)
#   KEEP_CONTAINER    — set to "true" to skip cleanup (for debugging)
# ────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RELAY_DIR="$REPO_ROOT/relay-server"

IMAGE_NAME="voiceclaw-relay-test"
CONTAINER_NAME="voiceclaw-relay-integration-test"
TEST_PORT="${TEST_PORT:-18080}"
KEEP_CONTAINER="${KEEP_CONTAINER:-false}"

PASSED=0
FAILED=0
TOTAL=0

# ── Color helpers ───────────────────────────────────────────────────────────

info()  { printf "\033[1;34m[info]\033[0m  %s\n" "$*" ; }
ok()    { printf "\033[1;32m[pass]\033[0m  %s\n" "$*" ; }
fail()  { printf "\033[1;31m[FAIL]\033[0m  %s\n" "$*" >&2 ; }
warn()  { printf "\033[1;33m[warn]\033[0m  %s\n" "$*" ; }
die()   { printf "\033[1;31m[error]\033[0m %s\n" "$*" >&2 ; exit 1 ; }

header() {
  echo ""
  printf "\033[1;35m── %s ──\033[0m\n" "$*"
}

# ── Test tracking ───────────────────────────────────────────────────────────

assert_pass() {
  TOTAL=$((TOTAL + 1))
  PASSED=$((PASSED + 1))
  ok "$1"
}

assert_fail() {
  TOTAL=$((TOTAL + 1))
  FAILED=$((FAILED + 1))
  fail "$1"
}

# ── Cleanup ─────────────────────────────────────────────────────────────────

cleanup() {
  if [ "$KEEP_CONTAINER" = "true" ]; then
    warn "KEEP_CONTAINER=true — skipping cleanup"
    warn "Container: $CONTAINER_NAME"
    warn "Clean up manually: docker rm -f $CONTAINER_NAME"
    return
  fi

  info "Cleaning up..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT

# ── Prerequisites ───────────────────────────────────────────────────────────

check_prerequisites() {
  if ! command -v docker >/dev/null 2>&1; then
    die "Docker is not installed or not in PATH"
  fi

  if ! docker info >/dev/null 2>&1; then
    die "Docker daemon is not running"
  fi

  if ! command -v curl >/dev/null 2>&1; then
    die "curl is required but not installed"
  fi

  if ! command -v node >/dev/null 2>&1; then
    die "node is required for WebSocket tests"
  fi
}

# ── Create test .env ────────────────────────────────────────────────────────

create_test_env() {
  local env_file="$REPO_ROOT/.test-env"

  # Minimal config — the server will start without valid provider keys;
  # it only needs them when a session tries to connect to Gemini/OpenAI.
  cat > "$env_file" <<EOF
GEMINI_API_KEY=${GEMINI_API_KEY:-test-dummy-key}
OPENAI_API_KEY=${OPENAI_API_KEY:-test-dummy-key}
RELAY_API_KEY=${RELAY_API_KEY:-integration-test-key}
NODE_ENV=production
PORT=8080
EOF

  echo "$env_file"
}

# ── Wait for health ────────────────────────────────────────────────────────

wait_for_health() {
  local retries=30
  local delay=1

  for ((i = 1; i <= retries; i++)); do
    if curl -sf "http://localhost:${TEST_PORT}/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

# ── Tests ───────────────────────────────────────────────────────────────────

test_docker_build() {
  header "Test 1: Docker image build"

  info "Building Docker image: $IMAGE_NAME"
  if docker build -t "$IMAGE_NAME" "$RELAY_DIR" >/dev/null 2>&1; then
    assert_pass "Docker image built successfully"
  else
    # Retry with output for debugging
    info "Build failed — retrying with output..."
    docker build -t "$IMAGE_NAME" "$RELAY_DIR"
    assert_fail "Docker image build failed"
    return 1
  fi
}

test_container_start() {
  header "Test 2: Container starts and passes health check"

  local env_file
  env_file=$(create_test_env)

  # Remove any previous test container
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

  info "Starting container on port $TEST_PORT..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    --env-file "$env_file" \
    -p "${TEST_PORT}:8080" \
    "$IMAGE_NAME" >/dev/null

  # Clean up the temp env file
  rm -f "$env_file"

  info "Waiting for health check (up to 30s)..."
  if wait_for_health; then
    assert_pass "Container started and is healthy"
  else
    assert_fail "Container failed health check"
    info "Container logs:"
    docker logs --tail 30 "$CONTAINER_NAME"
    return 1
  fi
}

test_health_endpoint() {
  header "Test 3: HTTP health endpoint"

  local response
  response=$(curl -sf "http://localhost:${TEST_PORT}/health" 2>&1) || {
    assert_fail "Health endpoint unreachable"
    return 1
  }

  if echo "$response" | grep -q '"ok"'; then
    assert_pass "Health endpoint returned {\"status\":\"ok\"}"
  else
    assert_fail "Unexpected health response: $response"
    return 1
  fi
}

test_websocket_connection() {
  header "Test 4: WebSocket connection"

  local ws_url="ws://localhost:${TEST_PORT}/ws"
  local test_script="$SCRIPT_DIR/test-ws-connection.js"

  if [ ! -f "$test_script" ]; then
    assert_fail "WebSocket test script not found at $test_script"
    return 1
  fi

  # The ws module is inside the relay-server node_modules.
  # Set NODE_PATH so the test script can find it.
  info "Testing WebSocket endpoint at $ws_url..."
  local relay_api_key="${RELAY_API_KEY:-integration-test-key}"
  if NODE_PATH="$RELAY_DIR/node_modules" TEST_API_KEY="$relay_api_key" \
     node "$test_script" "$ws_url" 2>&1; then
    assert_pass "WebSocket connection test passed"
  else
    assert_fail "WebSocket connection test failed"
    return 1
  fi
}

test_http_on_ws_path() {
  header "Test 5: WebSocket path rejects plain HTTP"

  local http_status
  http_status=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${TEST_PORT}/ws" 2>&1) || true

  # The WS endpoint should not return 200 for plain HTTP requests
  if [ "$http_status" != "200" ]; then
    assert_pass "WebSocket path correctly rejects plain HTTP (status=$http_status)"
  else
    assert_fail "WebSocket path unexpectedly returned 200 for plain HTTP"
    return 1
  fi
}

# ── Report ──────────────────────────────────────────────────────────────────

print_report() {
  header "Results"

  echo ""
  if [ "$FAILED" -eq 0 ]; then
    printf "  \033[1;32m%d/%d tests passed\033[0m\n" "$PASSED" "$TOTAL"
    echo ""
    ok "All integration tests passed!"
  else
    printf "  \033[1;31m%d/%d tests passed (%d failed)\033[0m\n" "$PASSED" "$TOTAL" "$FAILED"
    echo ""
    fail "Some tests failed. See output above for details."
  fi
  echo ""
}

# ── Main ────────────────────────────────────────────────────────────────────

main() {
  echo ""
  printf "\033[1;35m  VoiceClaw Integration Test Suite\033[0m\n"
  echo "  ================================="
  echo ""

  check_prerequisites

  # Install ws in relay-server if not present (needed for WS test script)
  if [ ! -d "$RELAY_DIR/node_modules/ws" ]; then
    info "Installing relay-server dependencies (needed for WS test)..."
    (cd "$RELAY_DIR" && npm install --omit=dev) >/dev/null 2>&1
  fi

  test_docker_build || true
  test_container_start || true
  test_health_endpoint || true
  test_websocket_connection || true
  test_http_on_ws_path || true

  print_report

  exit "$FAILED"
}

main
