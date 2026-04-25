#!/usr/bin/env bash
# Kill anything listening on the default ports used by `yarn dev`.
# 8080: relay-server, 4318: tracing-collector (OTLP), 4319: tracing-ui, 3000: website (Next.js)
#
# Sends SIGTERM first so the process can flush sockets, write final logs, and
# release file handles. Falls back to SIGKILL only if it's still alive after a
# short grace period.

set -u

PORTS=(8080 4318 4319 3000)
GRACE_SECONDS=2

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti "tcp:${port}" 2>/dev/null || true)
  if [ -z "${pids}" ]; then
    echo "port ${port}: free"
    continue
  fi

  pids_csv=$(echo "${pids}" | tr '\n' ' ')
  echo "port ${port}: SIGTERM → ${pids_csv}"
  # shellcheck disable=SC2086
  kill -TERM ${pids} 2>/dev/null || true

  # Wait for graceful shutdown.
  waited=0
  while [ "${waited}" -lt "${GRACE_SECONDS}" ]; do
    sleep 1
    waited=$((waited + 1))
    still=$(lsof -ti "tcp:${port}" 2>/dev/null || true)
    if [ -z "${still}" ]; then
      break
    fi
  done

  remaining=$(lsof -ti "tcp:${port}" 2>/dev/null || true)
  if [ -n "${remaining}" ]; then
    echo "port ${port}: SIGKILL → $(echo "${remaining}" | tr '\n' ' ')(survived SIGTERM)"
    # shellcheck disable=SC2086
    kill -KILL ${remaining} 2>/dev/null || true
  else
    echo "port ${port}: shut down cleanly"
  fi
done
