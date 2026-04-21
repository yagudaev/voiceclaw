---
description: Build the iOS mobile app and ship it to TestFlight end-to-end, then verify ASC accepted the build.
argument-hint: "[staging|production]"
allowed-tools: Bash, Read, Glob, Grep
---

Deploy the VoiceClaw mobile app to TestFlight for the requested variant.

**Variant**: `$1` — defaults to `staging` if empty. Must be `staging` or `production`. Reject anything else.

## Pre-flight

Run these checks **before** kicking off the build. Abort with a clear message if any fail — do not proceed.

1. `date` — record the deploy start time.
2. `git rev-parse --abbrev-ref HEAD` must be `main`. TestFlight deploys ship from `main` only.
3. `git status --porcelain` must be empty. No uncommitted changes.
4. `git fetch origin main && git status -sb` — local `main` must be up to date with `origin/main`. If behind, abort and tell the user to pull first.
5. `git rev-list --count HEAD` — echo the commit count so the user sees the iOS `buildNumber` that will be stamped (`count + 50`, per `mobile/app.config.ts`). ASC rejects duplicates, so confirm this is higher than the last submitted build.

## Build + submit

Once pre-flight passes, run the release script **in the background** so we can tail progress without blocking the tool call:

```bash
cd mobile && yarn ios:release:<variant> 2>&1 | tee /tmp/voiceclaw-ios-<variant>-deploy.log
```

- Use `run_in_background: true` for the Bash tool.
- Save the background task ID — you'll poll it with BashOutput.
- The script chains: `expo prebuild --clean` → `xcodebuild archive` → export IPA → `xcrun altool --validate-app` → `eas submit`. Expect 10–20 minutes.

## Monitoring

Poll the background task with BashOutput roughly every 90–180 seconds. On each poll, surface the current phase (prebuild / archive / export / validate / submit) in one short line so the user can see progress. Do **not** spam updates for unchanged state.

Watch for these failure signatures and call them out specifically:

- `module map file '...swift-numerics/.../module.modulemap' not found` → SPM symlink issue, covered by `scripts/build-ios.sh` Step 3. If it still fires, the symlink didn't take — surface the DerivedData path and stop.
- `error: 90683` / "Missing purpose string in Info.plist" — an `infoPlist` key is missing in `mobile/app.config.ts`. Do not retry; report which key.
- `Invalid Provisioning Profile` / Ad Hoc IPA → export method drifted from `app-store-connect` in `scripts/ExportOptions.plist`.
- `Duplicate build number` from ASC → commit count regressed. Stop; the user needs to land another commit on `main`.
- `eas submit` prompting for Apple ID → `ascAppId` missing from the submit profile in `mobile/eas.json`. Only a concern for `production`.

## Success criteria

The deploy is done when the tail of the log shows `eas submit` finishing with an ASC build URL (typically `https://appstoreconnect.apple.com/...`). Report:

- Final IPA path (from `==> Build complete:` line).
- The build number that was submitted.
- The ASC URL if printed.
- Reminder: Apple's post-upload processing takes a few more minutes before TestFlight surfaces the build.

## Non-goals

- Do not edit `ios/` directly — `prebuild --clean` wipes it. All native config goes through `mobile/app.config.ts` or `mobile/plugins/*`.
- Do not retry automatically on build failures. Report and let the user decide.
- Do not run this against a dirty tree or a feature branch — main only.
