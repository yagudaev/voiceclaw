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
# Staging: build IPA locally via xcodebuild, then submit via EAS
yarn ios:release:staging

# Production (App Store / TestFlight prod)
yarn ios:release:production
```

Under the hood (`scripts/build-ios.sh`):

1. `expo prebuild --clean` with the right `APP_VARIANT`
2. `xcodebuild archive` → `build/VoiceClaw.xcarchive`
3. `xcodebuild -exportArchive` → `build/export/*.ipa`
4. `eas submit --profile <variant> --platform ios --path build/export/*.ipa`

Signing uses Automatic with `DEVELOPMENT_TEAM=HN6T5KD4ND`. App Store
Connect auth uses the API key at `~/.appstore/AuthKey_SG645CPQP8.p8`
(configured in `eas.json`).

Apple emails the build-processed confirmation within a few minutes of
submit; the build then shows up in TestFlight → iOS builds.

### Things that have bitten us

- **Privacy strings**: `NSMicrophoneUsageDescription` and
  `NSSpeechRecognitionUsageDescription` must be in the Info.plist or
  App Store Connect rejects the submission. They live in
  `app.config.ts` under `ios.infoPlist` and are written by prebuild.
- **Duplicate build number**: always commit before `yarn ios:release:*`
  so `git rev-list --count HEAD` produces a fresh number.
- **Never edit `ios/` directly**: `prebuild --clean` wipes it. Changes
  go in `app.config.ts` or Expo config plugins under `plugins/`.

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
