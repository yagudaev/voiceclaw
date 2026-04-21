# Mobile app notes

## Variants

Three build variants driven by `APP_VARIANT`:

| Variant       | Bundle id                         | Display name       | Scheme             |
| ------------- | --------------------------------- | ------------------ | ------------------ |
| `development` | `com.yagudaev.voiceclaw.dev`      | VoiceClaw (Dev)    | `voiceclaw-dev`    |
| `staging`     | `com.yagudaev.voiceclaw.staging`  | VoiceClaw (Stg)    | `voiceclaw-staging`|
| `production`  | `com.yagudaev.voiceclaw`          | VoiceClaw          | `voiceclaw`        |

`buildNumber` is set automatically from `git rev-list --count HEAD` in
`app.config.ts` — each commit bumps the iOS build number, so you never
need to edit it by hand. App Store Connect rejects duplicate build
numbers, so always **commit first, then build**.

## TestFlight releases

Use the package scripts, not Xcode:

```bash
# Staging: pre-flight → build IPA → altool validate → eas submit
yarn release:ios:staging

# Production (App Store / TestFlight prod)
yarn release:ios:production
```

`release:ios:<variant>` runs `scripts/release-to-testflight.sh`, which
checks the tree is clean, on `main`, and in sync with `origin/main`
before chaining `build:ios:<variant>` + `submit:ios:<variant>`. The
`/deploy-mobile` slash command is a thin wrapper around that same
entry point. For ad-hoc IPAs on a feature branch, use
`yarn build:ios:<variant>` directly (no pre-flight, no submit).

Under the hood (`scripts/build-ios.sh`):

1. `expo prebuild --clean` with the right `APP_VARIANT`
2. `xcodebuild -resolvePackageDependencies` (primes SPM checkouts)
3. Symlink `ArchiveIntermediates/SourcePackages` → DerivedData
   SourcePackages (works around the Cmlx/swift-numerics archive bug)
4. `xcodebuild archive` → `build/VoiceClaw.xcarchive`
5. `xcodebuild -exportArchive` → `build/export/*.ipa` (uses
   `method: app-store-connect` — `debugging` produces Ad Hoc IPAs
   which ASC rejects as "Invalid Provisioning Profile")
6. `xcrun altool --validate-app` — runs Apple's upload-time checks
   locally so missing purpose strings / signing issues fail here
   instead of 5-10 min after `eas submit`
7. `eas submit --profile <variant> --platform ios --path build/export/*.ipa`

Signing uses Automatic with `DEVELOPMENT_TEAM=HN6T5KD4ND`. App Store
Connect auth uses the API key at `~/.appstore/AuthKey_SG645CPQP8.p8`
(configured in `eas.json`).

Apple emails the build-processed confirmation within a few minutes of
submit; the build then shows up in TestFlight → iOS builds.

### Things that have bitten us

- **Privacy strings**: `NSMicrophoneUsageDescription`,
  `NSSpeechRecognitionUsageDescription`, `NSLocalNetworkUsageDescription`,
  and — because bundled SDKs reference the APIs even though we don't
  call them — `NSPhotoLibraryUsageDescription` and
  `NSCameraUsageDescription` must all be in Info.plist or App Store
  Connect rejects the upload with error 90683 "Missing purpose string
  in Info.plist" *after* `eas submit` reports success (the error only
  surfaces during Apple's post-upload processing). They live in
  `app.config.ts` under `ios.infoPlist` and are written by prebuild.
  The `xcrun altool --validate-app` step in `scripts/build-ios.sh`
  catches this pre-submit.
- **Duplicate build number**: always commit before `yarn release:ios:*`
  so `git rev-list --count HEAD` produces a fresh number.
- **Never edit `ios/` directly**: `prebuild --clean` wipes it. Changes
  go in `app.config.ts` or Expo config plugins under `plugins/`.
- **SPM module map missing on archive** (`swift-numerics`, `Cmlx`, or
  any Swift package): shows up as
  `error: module map file '...swift-numerics/.../module.modulemap' not found`
  → `** ARCHIVE FAILED **`. Xcode's archive build references SPM
  checkouts at `ArchiveIntermediates/SourcePackages/...` but SPM
  actually places them at `DerivedData/<proj>/SourcePackages/...`.
  `scripts/build-ios.sh` creates the missing symlink automatically
  before archive. Manual form:
  ```bash
  DD=~/Library/Developer/Xcode/DerivedData/VoiceClaw-<hash>
  ln -sfn ../../../SourcePackages \
    "$DD/Build/Intermediates.noindex/ArchiveIntermediates/SourcePackages"
  ```
  A symlink at `ArchiveIntermediates/VoiceClaw/SourcePackages` (one
  level deeper) gets wiped by xcodebuild on archive start; the sibling
  location `ArchiveIntermediates/SourcePackages` survives.
- **EAS submit prompts for Apple ID** even though `eas.json` has the
  ASC API key: happens when `ascAppId` is missing from the submit
  profile. EAS then tries to look up the app via the ASC API; if the
  key isn't scoped to that app or the listing fails, it falls back to
  interactive Apple ID login. Either run `yarn submit:ios:*`
  interactively (so you can type the Apple ID + 2FA) or add
  `ascAppId` to each profile in `eas.json` (found in App Store Connect
  → Apps → VoiceClaw → App Information → Apple ID).

## Dev builds on a real device

```bash
# First time or after native changes
APP_VARIANT=development npx expo prebuild --clean

# Install + launch on the paired iPhone (UDID in feedback_testing.md)
APP_VARIANT=development npx expo run:ios --device "<UDID>"
```

`expo run:ios` skips prebuild when `ios/` already exists, so if you
change `app.config.ts` (e.g. Info.plist keys), run the explicit
`prebuild --clean` first or the change will not land in the binary.

## Relay connectivity on iOS

The Realtime mode connects to a self-hosted relay server, typically
over Tailscale (`ws://100.x.x.x:8080/ws`). Three iOS-specific things
matter:

1. `NSAllowsArbitraryLoads: true` — needed for cleartext `ws://`.
2. `NSLocalNetworkUsageDescription` — without this key, iOS silently
   blocks any connection to private IP ranges (including Tailscale
   CGNAT 100.64/10). The first connection prompts for Local Network
   permission; the user must tap Allow.
3. **iCloud Private Relay intercepts cleartext HTTP from apps** and
   cannot reach Tailscale addresses, but it does not touch `ws://`.
   So the in-app "Test connection" probe uses WebSocket (the real
   transport) instead of HTTP GET `/health`. If you need HTTP to work
   from the app over Tailscale, either disable iCloud Private Relay,
   serve the relay over `https://`, or use a MagicDNS hostname.

## Voice mode

Mobile is realtime-only. The Vapi and Custom-pipeline settings UI has
been removed; the underlying code paths in `index.tsx` still exist but
are unreachable through the UI. If `voice_mode` in SQLite is `vapi` or
`custom` (from a previous version), Settings migrates it to `realtime`
on load.

Default model: `gemini-3.1-flash-live-preview`. GPT Realtime entries
are shown disabled ("Coming Soon") to mirror the desktop.
