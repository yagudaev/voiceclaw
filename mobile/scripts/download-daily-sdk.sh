#!/bin/bash
# Downloads the Daily.co iOS SDK framework needed by the Vapi module
# Run this before building: ./scripts/download-daily-sdk.sh
set -euo pipefail

DAILY_VERSION="0.37.0"
FRAMEWORKS_DIR="modules/expo-vapi/ios/Frameworks"
DOWNLOAD_URL="https://sdk-downloads.daily.co/daily-client-ios-${DAILY_VERSION}.zip"

if [ -d "${FRAMEWORKS_DIR}/Daily.xcframework" ]; then
  echo "Daily.xcframework already exists, skipping download"
  exit 0
fi

echo "Downloading Daily.co iOS SDK v${DAILY_VERSION}..."
curl -fsSL -o /tmp/daily-sdk.zip "${DOWNLOAD_URL}"

echo "Extracting to ${FRAMEWORKS_DIR}..."
mkdir -p "${FRAMEWORKS_DIR}"
unzip -o /tmp/daily-sdk.zip -d "${FRAMEWORKS_DIR}" > /dev/null

rm /tmp/daily-sdk.zip

if [ ! -d "${FRAMEWORKS_DIR}/Daily.xcframework" ]; then
  echo "!! Download/extract finished but ${FRAMEWORKS_DIR}/Daily.xcframework is missing" >&2
  exit 1
fi

echo "Done — Daily.xcframework ready"
