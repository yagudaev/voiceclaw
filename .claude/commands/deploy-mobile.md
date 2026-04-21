---
description: Release the VoiceClaw iOS app to TestFlight via mobile/scripts/release-to-testflight.sh.
argument-hint: "[staging|production]"
allowed-tools: Bash, Read
---

Release the VoiceClaw iOS app to TestFlight.

**Variant**: `$1` — defaults to `staging` when empty. Pass `staging` or `production`.

The real work lives in `mobile/scripts/release-to-testflight.sh` (invoked via `yarn release:ios:<variant>`). Your job is to run it, watch the output, and report results. Do **not** duplicate any of its pre-flight checks or build logic in tool calls — let the script fail and surface its exit code.

## Run it

Kick off the yarn script in the background so you can poll progress:

```bash
cd mobile && yarn release:ios:${1:-staging}
```

- Set `run_in_background: true` on the Bash tool call.
- The script tees to `/tmp/voiceclaw-ios-<variant>-release.log`.
- Save the background task ID for polling.

## Monitor

Poll the background task with BashOutput every 90–180 seconds. On each poll, emit a single short status line for the user — current phase (prebuild / archive / export / validate / submit / done) — only when it changes. Do not narrate every compile line.

If the script exits non-zero, stop and report the exit code plus the last ~40 lines of the log. Specifically watch for:

- `module map file '...swift-numerics/.../module.modulemap' not found` — SPM symlink issue; `build-ios.sh` Step 3 should handle it. If it fires anyway, the symlink didn't take.
- `error: 90683` / "Missing purpose string in Info.plist" — a key missing in `mobile/app.config.ts` → `ios.infoPlist`.
- `Invalid Provisioning Profile` — export method drifted off `app-store-connect` in `scripts/ExportOptions.plist`.
- `Duplicate build number` from ASC — commit count regressed; the user needs a new commit on `main`.
- `eas submit` prompting for Apple ID — `ascAppId` missing from the `production` submit profile in `mobile/eas.json`.

Do not retry on failure. Report and hand back.

## Report

On success, extract from the log and report:

- The IPA path (`==> Build complete: …` line from `build-ios.sh`).
- The build number the script printed in pre-flight.
- The ASC URL from `eas submit` output, if present.
- Remind the user: Apple's post-upload processing takes a few minutes before the build appears in TestFlight.
