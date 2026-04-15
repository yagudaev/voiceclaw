#!/usr/bin/env bash
# openclaw-trace.sh
#
# Commands and notes for wiring openclaw's brain-agent endpoint into the same
# Langfuse trace as the voiceclaw voice-turn that called it.
#
# The voiceclaw side (this repo) sends a W3C `traceparent` header with every
# ask_brain request. The openclaw side parses that header and nests a child
# `ask_brain` agent observation under the parent trace — producing one unified
# Langfuse trace that spans:
#     voice-turn (relay) → ask_brain (tool span) → ask_brain (openclaw agent)
#
# The openclaw changes live OUTSIDE this repo (~/code/openclaw). They are
# tracked here so the wiring can be reproduced on another machine.
#
# Usage: run individual commands by copy/paste. This file is notes-first — do
# not execute it wholesale.

set -euo pipefail

OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/code/openclaw}"

# ---------------------------------------------------------------------------
# 1. Install the tracing deps in openclaw (workspace root).
# ---------------------------------------------------------------------------
install_deps() {
  cd "$OPENCLAW_DIR"
  pnpm add -w \
    @opentelemetry/api \
    @opentelemetry/sdk-node \
    @langfuse/otel \
    @langfuse/tracing
}

# ---------------------------------------------------------------------------
# 2. Files added/modified in openclaw:
#
#   NEW:     src/gateway/langfuse-tracing.ts
#            - initLangfuseTracing():  OTel SDK + LangfuseSpanProcessor, soft-
#              disabled when LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY unset.
#            - startAskBrainObservation({ traceparent, sessionKey, runId,
#              input }): parses W3C traceparent into a SpanContext, starts a
#              Langfuse `agent` observation parented to it (or root trace if
#              missing). Returns { end(output, error?) }.
#            - parseTraceparent(value): W3C `<ver>-<trace>-<span>-<flags>`
#              → { traceId, spanId, traceFlags, isRemote: true }.
#
#   EDIT:    src/gateway/server.impl.ts
#            - Imports { initLangfuseTracing } and calls it in
#              startGatewayServer() right after setGatewaySigusr1RestartPolicy.
#
#   EDIT:    src/gateway/openai-http.ts
#            - Imports { startAskBrainObservation }.
#            - Reads `traceparent` header.
#            - Wraps the agentCommand() call (both streaming and non-streaming
#              paths) with the observation. Streaming path accumulates
#              assistantText deltas and closes the span in every exit path
#              (lifecycle end/error, client close, try/catch/finally).
#            - Adds a readHeader(req, name) helper at the bottom of the file.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# 3. Env vars for the local openclaw gateway process.
#    Use the SAME Langfuse project as voiceclaw/relay-server so both traces
#    land in the same place. The voice-turn parent lives there already.
# ---------------------------------------------------------------------------
#   export LANGFUSE_PUBLIC_KEY=pk-lf-...
#   export LANGFUSE_SECRET_KEY=sk-lf-...
#   export LANGFUSE_BASE_URL=https://us.cloud.langfuse.com   # optional, default EU
#   export NODE_ENV=development                              # shows in env facet

# ---------------------------------------------------------------------------
# 4. Build & run the patched openclaw locally.
#    The globally-installed `openclaw` (via `npm i -g openclaw`) is NOT the
#    one you want — use pnpm dev so your edits are live.
# ---------------------------------------------------------------------------
build_openclaw() {
  cd "$OPENCLAW_DIR"
  pnpm build
}

run_openclaw_gateway() {
  cd "$OPENCLAW_DIR"
  # Must match voiceclaw's OPENCLAW_GATEWAY_URL (default http://localhost:18789)
  pkill -9 -f openclaw-gateway 2>/dev/null || true
  pnpm openclaw gateway run --bind loopback --port 18789 --force
}

# ---------------------------------------------------------------------------
# 5. Sanity check: fire a manual request with a traceparent and confirm the
#    nested span appears in Langfuse.
# ---------------------------------------------------------------------------
probe_ask_brain() {
  local token="${OPENCLAW_GATEWAY_AUTH_TOKEN:?set OPENCLAW_GATEWAY_AUTH_TOKEN}"
  # Synthetic traceparent — pick any 32-hex trace id, 16-hex span id.
  local traceparent="00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
  curl -sS -N http://localhost:18789/v1/chat/completions \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -H "traceparent: ${traceparent}" \
    -H "x-openclaw-session-key: probe:ask_brain" \
    -d '{
      "model": "openclaw",
      "stream": true,
      "messages": [{ "role": "user", "content": "ping — respond with pong" }]
    }'
}

# ---------------------------------------------------------------------------
# 6. Rollback if needed.
# ---------------------------------------------------------------------------
rollback_openclaw() {
  cd "$OPENCLAW_DIR"
  git restore src/gateway/server.impl.ts src/gateway/openai-http.ts
  rm -f src/gateway/langfuse-tracing.ts
  pnpm remove -w @opentelemetry/api @opentelemetry/sdk-node @langfuse/otel @langfuse/tracing
}

echo "openclaw-trace.sh — reference script. Inspect before running any function."
