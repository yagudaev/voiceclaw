#!/usr/bin/env bash
# Kill anything listening on the default ports used by `yarn dev`.
# 8080: relay-server, 4318: tracing-collector (OTLP), 4319: tracing-ui, 3000: website (Next.js)

set -u

PORTS=(8080 4318 4319 3000)

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti "tcp:${port}" 2>/dev/null || true)
  if [ -n "${pids}" ]; then
    echo "killing port ${port} (pids: $(echo "${pids}" | tr '\n' ' '))"
    # shellcheck disable=SC2086
    kill -9 ${pids} 2>/dev/null || true
  else
    echo "port ${port}: free"
  fi
done
