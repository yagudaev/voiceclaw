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
ASC_KEY_PATH="${ASC_API_KEY_PATH:-$HOME/.appstore/AuthKey_SG645CPQP8.p8}"
ASC_KEY_ID="${ASC_API_KEY_ID:-SG645CPQP8}"
ASC_ISSUER_ID="${ASC_API_ISSUER_ID:-69a6de83-015f-47e3-e053-5b8c7c11a4d1}"

echo "==> Building VoiceClaw ($VARIANT)"
echo "==> Step 1: Prebuild with APP_VARIANT=$VARIANT"
cd "$MOBILE_DIR"
APP_VARIANT="$VARIANT" npx expo prebuild --clean

echo "==> Step 2: Resolve SPM packages"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -destination "generic/platform=iOS" \
  -resolvePackageDependencies

echo "==> Step 3: Symlink SourcePackages into ArchiveIntermediates"
# xcodebuild archive references SPM checkouts at
# ArchiveIntermediates/SourcePackages/ but actually places them under
# DerivedData/<proj>/SourcePackages/. Without this symlink, Cmlx and
# swift-numerics fail with "module map file ... not found".
DD_BASE=$(xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -showBuildSettings 2>/dev/null | awk -F' = ' '/ BUILD_DIR =/ {print $2; exit}' | sed 's|/Build/Products$||')
if [ -z "$DD_BASE" ]; then
  echo "!! Could not resolve DerivedData path; archive may fail with SPM module map error" >&2
else
  mkdir -p "$DD_BASE/Build/Intermediates.noindex/ArchiveIntermediates"
  ln -sfn ../../../SourcePackages "$DD_BASE/Build/Intermediates.noindex/ArchiveIntermediates/SourcePackages"
fi

echo "==> Step 4: Archive"
mkdir -p "$BUILD_DIR"
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination "generic/platform=iOS" \
  DEVELOPMENT_TEAM=HN6T5KD4ND \
  CODE_SIGN_STYLE=Automatic

echo "==> Step 5: Export IPA"
rm -rf "$EXPORT_DIR"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -quiet

IPA_PATH=$(find "$EXPORT_DIR" -name "*.ipa" -print -quit)

echo "==> Step 6: Pre-submit validation with Apple"
# altool --validate-app runs ASC's upload-time checks (missing purpose
# strings, bad signing, bundle issues) without actually submitting —
# catches post-upload rejections locally instead of after eas submit.
if [ ! -f "$ASC_KEY_PATH" ]; then
  echo "!! ASC API key not found at $ASC_KEY_PATH — skipping validation" >&2
else
  xcrun altool --validate-app \
    -f "$IPA_PATH" \
    -t ios \
    --apiKey "$ASC_KEY_ID" \
    --apiIssuer "$ASC_ISSUER_ID"
fi

echo "==> Build complete: $IPA_PATH"
