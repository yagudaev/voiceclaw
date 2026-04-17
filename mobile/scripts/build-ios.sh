#!/bin/bash
set -euo pipefail

VARIANT="${APP_VARIANT:-production}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="${MOBILE_DIR}/build"
WORKSPACE="${MOBILE_DIR}/ios/VoiceClaw.xcworkspace"
SCHEME="VoiceClaw"
ARCHIVE_PATH="${BUILD_DIR}/VoiceClaw.xcarchive"
EXPORT_DIR="${BUILD_DIR}/export"
EXPORT_PLIST="${MOBILE_DIR}/scripts/ExportOptions.plist"

echo "==> Building VoiceClaw ($VARIANT)"
echo "==> Step 1: Prebuild with APP_VARIANT=$VARIANT"
cd "$MOBILE_DIR"
APP_VARIANT="$VARIANT" npx expo prebuild --clean

echo "==> Step 2: Archive"
mkdir -p "$BUILD_DIR"
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination "generic/platform=iOS" \
  DEVELOPMENT_TEAM=HN6T5KD4ND \
  CODE_SIGN_STYLE=Automatic

echo "==> Step 3: Export IPA"
rm -rf "$EXPORT_DIR"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -quiet

IPA_PATH=$(find "$EXPORT_DIR" -name "*.ipa" -print -quit)
echo "==> Build complete: $IPA_PATH"
