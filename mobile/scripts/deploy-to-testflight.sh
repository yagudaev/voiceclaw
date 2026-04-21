#!/bin/bash
# Deploy the VoiceClaw iOS app to TestFlight end-to-end.
#
# Usage: ./scripts/deploy-to-testflight.sh [staging|production]
#        APP_VARIANT defaults to staging when not provided.
#
# Runs pre-flight (branch/tree/remote state), then chains the existing
# build-ios.sh + eas submit flow, tee-ing a full log to /tmp so an
# automation wrapper can tail progress.
set -euo pipefail

VARIANT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$(dirname "$MOBILE_DIR")"
LOG_FILE="/tmp/voiceclaw-ios-${VARIANT}-deploy.log"
BUILD_NUMBER_OFFSET=50

if [[ "$VARIANT" != "staging" && "$VARIANT" != "production" ]]; then
  echo "!! Invalid variant: '$VARIANT'. Must be 'staging' or 'production'." >&2
  exit 2
fi

echo "==> VoiceClaw iOS deploy: variant=$VARIANT"
echo "==> Started at $(date)"
echo "==> Log: $LOG_FILE"

cd "$REPO_DIR"

echo "==> Pre-flight: branch"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "!! Must be on 'main' to deploy (current: $BRANCH)." >&2
  exit 3
fi

echo "==> Pre-flight: working tree"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "!! Working tree is dirty. Commit or stash before deploying." >&2
  git status --short >&2
  exit 4
fi

echo "==> Pre-flight: fetch + compare with origin/main"
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [[ "$LOCAL" != "$REMOTE" ]]; then
  AHEAD=$(git rev-list --count origin/main..HEAD)
  BEHIND=$(git rev-list --count HEAD..origin/main)
  echo "!! Local main is not in sync with origin/main (ahead $AHEAD, behind $BEHIND). Push or pull first." >&2
  exit 5
fi

COMMIT_COUNT=$(git rev-list --count HEAD)
BUILD_NUMBER=$((COMMIT_COUNT + BUILD_NUMBER_OFFSET))
echo "==> Pre-flight OK. Commit $LOCAL, buildNumber $BUILD_NUMBER (count $COMMIT_COUNT + offset $BUILD_NUMBER_OFFSET)."

cd "$MOBILE_DIR"

echo "==> Running yarn release:ios:$VARIANT (this takes 10-20 min)"
# tee so the caller can tail the log file in parallel; pipefail keeps the
# exit status from yarn rather than tee.
set -o pipefail
yarn "release:ios:$VARIANT" 2>&1 | tee "$LOG_FILE"

echo "==> Deploy finished at $(date)"
echo "==> Build $BUILD_NUMBER submitted to $VARIANT TestFlight."
echo "==> Apple's post-upload processing takes a few minutes before the build appears in TestFlight."
