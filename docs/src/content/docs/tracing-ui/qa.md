---
title: Tracing QA — procedures + findings
description: How to verify the tracing UI + tracing capture pipeline end-to-end after merges that touch the relay, collector, or UI
---

This page captures the QA procedure that runs after any batch of PRs touching
the tracing stack (relay-server, tracing-collector, tracing-ui), plus the
findings from the Apr 23 2026 run after the NAN-649..NAN-655 merges.

## Stack under test

- `relay-server` — emits OTel spans + writes captured media to
  `~/.voiceclaw/media/<sessionKey>/`
- `tracing-collector` — OTLP HTTP receiver on `:4318`; persists to
  `~/.voiceclaw/tracing.db` (SQLite)
- `tracing-ui` — Next.js app on `:4319`; reads the SQLite + serves media via
  `/api/media/<sessionId>/[...path]`

## How to start the stack

```bash
# Terminal 1 — relay (tsx watch; picks up source edits live)
cd relay-server
set -a && . ./.env && set +a
VOICECLAW_MEDIA_CAPTURE=enabled yarn dev

# Terminal 2 — collector + UI (concurrently)
yarn dev:tracing
```

Verify all three ports:

```bash
lsof -iTCP -sTCP:LISTEN -P | grep -E ':8080|:4318|:4319'
```

Relay should log `[tracing] enabled (langfuse+collector)`. If it logs
`[langfuse] tracing enabled ...` (older format), the relay is running from a
stale `dist/` build via `yarn start` — kill it and re-run `yarn dev`.

## Synthetic drivers (no real voice call needed)

Two tests exercise the full pipeline without a desktop client:

```bash
# Usage attrs → OTel exporter → collector → SQLite
cd relay-server
TRACING_UI_COLLECTOR_URL=http://127.0.0.1:4318/v1/traces \
  npx tsx test/test-usage-collector-e2e.ts

# Session-level WAV stitch + peaks.json + thumbnails.json
npx tsx test/test-session-media-stitch.ts
```

Both are stand-alone — no extra setup. The first writes a span to the
collector that you can then inspect in the UI at
`http://localhost:4319/sessions/usage-e2e-<timestamp>`.

## UI smoke (Playwright or manual)

For each tab, confirm:

1. **Sessions list** — `/sessions` loads, shows rows, no console errors.
2. **Transcript** — turns render; `Session media` timeline renders with empty
   states for sessions that predate the stitcher (shows "No audio captured for
   this session." / "No video thumbnails captured." instead of crashing).
3. **Turns** — 3-pane layout (rail | timeline + media | detail panel).
   Exactly ONE `voice-turn` row per turn (no duplicate synthetic row). Click
   a turn → detail panel updates.
4. **Logs** — row expand shows `Fields` | `JSON` tabs. Type into
   `Filter Fields...` — rows filter as you type, matches on key AND value.
5. **Cost** — donut + breakdown table. For sessions with `gen_ai.usage.*` the
   amber banner is absent and Realtime bucket shows non-zero tokens.
6. **Latency** — category bar + per-turn table. TTFT column populates for
   sessions post-PR #178.
7. **Context** — token breakdown per observation.

## Cross-surface invariants to check

- **Sidebar Cost == Cost tab total.** Previously the sidebar summed
  `observation.cost_usd` (usually null for realtime spans) while CostTab
  derives from `gen_ai.usage.*` via the shared pricing catalog. Both now
  route through `@/lib/session-cost.computeSessionTotalCost`.
- **Sidebar Tokens == Cost tab total tokens.**
- **MediaTimeline duration == page sidebar Duration**, modulo rounding.

## Apr 23 2026 findings

Ran the above after merging NAN-649 / NAN-650 / NAN-651 / NAN-652 / NAN-655.

### Fixed in this PR

- **CI: docs deploy** broke because `docs/` is listed in root `yarn`
  workspaces, so `cd docs && npm install` walked up and choked on the
  desktop workspace's `vite@8` vs `electron-vite@5`'s peer constraint.
  Switched the workflow to `yarn install --immutable` + `yarn build:docs` so
  the whole monorepo installs under its usual per-workspace hoisting
  limits, no conflict.
- **Sidebar Cost mismatch** — shared via a new `lib/session-cost.ts`
  helper; `page.tsx` and `CostTab` both call `computeSessionTotalCost()` and
  `costForObservation()`.
- **No end-to-end coverage for session-media stitch** — added
  `test/test-session-media-stitch.ts` which drives 4 fake turns of PCM +
  video through `MediaCapture`, calls `finalizeSession()`, and asserts
  the emitted `session/user.wav` + `assistant.wav` + `peaks.json` +
  `thumbnails.json` have the right shape (WAV headers present, peaks
  normalized 0..1 with real signal, thumbnails capped at 20 and monotonic
  by `timeMs`).

### Verified working

- NAN-650 gen_ai.usage.* stamping — e2e test lands the attrs in SQLite,
  CostTab renders `$0.0003` for the test session.
- NAN-651 AttributesTabs — Fields/JSON tabs render on Logs expansions.
  Filter input is reactive and matches on key + value (contains).
- NAN-649 MediaTimeline — renders on Transcript + Turns tabs. Gracefully
  degrades on pre-stitcher sessions (clear empty states, no 500s).
- Empty-first-span fix (PR #179) — Turns tab shows a single
  `voice-turn` row per turn, detail panel opens on the real observation
  with populated attributes.

### Known gaps (out of scope here — follow-ups tracked)

- Pre-PR-#177 sessions have no media capture on disk, so MediaTimeline shows
  all three empty states. Expected.
- Pre-PR-#178 sessions have no `voice.latency.*` → Latency tab shows "—" in
  TTFT / Endpointing. Expected.
- Pre-NAN-650 sessions have no `gen_ai.usage.*` → CostTab shows the amber
  banner. Expected.
- Collector's `cost_usd` column is still unpopulated; CostTab + sidebar
  both derive from the shared pricing catalog via `gen_ai.usage.*` tokens.
  Tracked for a collector-side pricing pass.

## Running the whole thing in one shot

```bash
# Typecheck everything
yarn workspaces foreach -A run tsc --noEmit 2>/dev/null \
  || (yarn workspace voiceclaw-tracing-ui tsc --noEmit \
      && yarn workspace voiceclaw-tracing-collector tsc --noEmit \
      && (cd relay-server && yarn tsc --noEmit))

# Synthetic drivers
(cd relay-server \
  && TRACING_UI_COLLECTOR_URL=http://127.0.0.1:4318/v1/traces \
     npx tsx test/test-usage-collector-e2e.ts \
  && npx tsx test/test-session-media-stitch.ts)

# Manual: open http://localhost:4319/sessions and click through a recent row
```

If all three green, the tracing stack is healthy end-to-end without a real
voice call.
