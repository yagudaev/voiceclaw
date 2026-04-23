---
title: Tracing UI — full spec
description: Custom observability UI for VoiceClaw voice / video sessions. Modeled on Vapi's call-log view, built on top of OTel + a local collector.
---

## Goals

A **per-session debugging UI** for voice + video conversations that covers what Langfuse's generic trace view misses: audio/video playback aligned with spans, cost breakdown by model type (realtime vs. brain), latency summary per turn, foldable swim-lane timeline, context-token breakdown (system prompt vs. tools vs. memories), and cache-hit visualization.

Modeled on [Vapi's call-details view](https://vapi.ai) — a single "sessions" navigation (no separate traces tab), per-session tabs for transcripts, logs, cost, latency, messages, structured outputs, and latency summary. Each user has a list of their sessions.

Keeps Langfuse fully functional as the **generic trace store**; this UI is a **focused, voice-AI-specific lens** on the same data, plus media that Langfuse doesn't natively store well.

## Non-goals

- Replacing Langfuse. Its Sessions + Traces views stay.
- Multi-tenant SaaS. This is internal to the VoiceClaw team and whoever runs the relay.
- General OTel observability UI. Scoped to voice/video AI session shape.

---

## Architecture

```
┌─────────────────┐          ┌─────────────────┐
│ voiceclaw-relay │          │ openclaw-gateway│
└────────┬────────┘          └────────┬────────┘
         │ OTLP-HTTP                  │ OTLP-HTTP
         │   (dual export)            │   (dual export)
         │                            │
    ┌────┴──┐                    ┌────┴──┐
    │       │                    │       │
    ▼       ▼                    ▼       ▼
 ┌────────┐ ┌─────────────────────────────────┐
 │Langfuse│ │    tracing-collector (Node)     │
 │  Cloud │ │  OTLP-HTTP receiver, :4318      │
 └────────┘ │  Writes SQLite (WAL), fans SSE  │
            │  to connected UI clients (v2)   │
            └─────────────────┬───────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  tracing-ui      │
                    │  Next.js 15 App  │
                    │  SQLite reads    │
                    └──────────────────┘
```

**Decision**: dual-write from the service SDKs (each service has two OTLP exporters — one to Langfuse's OTLP endpoint, one to our local collector). Not a fanout topology where the collector forwards to Langfuse, because:

- Langfuse continues to receive data even if our collector is down.
- Services have one less runtime dependency on our own infra.
- Cost: each service has two `BatchSpanProcessor` queues. Small memory overhead (~kb per queue at our scale), negligible CPU.

Codex-recommended alternative (collector fanout) is noted in the v3 / cleanup section if batch-queue duplication becomes visible in practice.

---

## Data model — SQLite

All tables use `INTEGER PRIMARY KEY AUTOINCREMENT` internal ids and a stable `*_id` string from OTel. Indexed by `trace_id`, `session_id`, `start_time`.

```sql
-- One row per OTel trace (== one voice turn for relay-originated, one HTTP
-- request for openclaw-originated).
CREATE TABLE traces (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id      TEXT NOT NULL UNIQUE,
  session_id    TEXT,
  user_id       TEXT,
  name          TEXT,            -- "voice-turn" | "memory.save-transcript" | …
  start_time_ns INTEGER,
  end_time_ns   INTEGER,
  input_json    TEXT,
  output_json   TEXT,
  metadata_json TEXT,
  status        TEXT             -- ok | error
);
CREATE INDEX traces_session ON traces(session_id, start_time_ns);
CREATE INDEX traces_user    ON traces(user_id, start_time_ns);

-- One row per observation/span.
CREATE TABLE observations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  span_id           TEXT NOT NULL UNIQUE,
  trace_id          TEXT NOT NULL,
  parent_span_id    TEXT,
  name              TEXT,
  kind              TEXT,        -- server | client | internal | …
  observation_type  TEXT,        -- GENERATION | TOOL | SPAN | …
  service_name      TEXT,        -- voiceclaw-relay | openclaw-gateway
  start_time_ns     INTEGER,
  end_time_ns       INTEGER,
  duration_ms       INTEGER,
  status_code       TEXT,
  status_message    TEXT,
  attributes_json   TEXT,
  events_json       TEXT,
  model             TEXT,
  -- Usage / cost fields are promoted from gen_ai.usage.* attrs for fast
  -- dashboard aggregation. Raw values still live in attributes_json.
  tokens_input      INTEGER,
  tokens_output     INTEGER,
  tokens_cached     INTEGER,
  cost_usd          REAL
);
CREATE INDEX obs_trace   ON observations(trace_id, start_time_ns);
CREATE INDEX obs_parent  ON observations(parent_span_id);
CREATE INDEX obs_service ON observations(service_name, start_time_ns);

-- Derived view for session metadata — built on each ingest tick so queries
-- don't recompute from scratch.
CREATE TABLE sessions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id     TEXT NOT NULL UNIQUE,
  user_id        TEXT,
  started_at_ns  INTEGER,
  last_activity  INTEGER,
  turn_count     INTEGER,
  total_cost_usd REAL,
  total_tokens   INTEGER,
  duration_ms    INTEGER
);
CREATE INDEX sessions_user ON sessions(user_id, last_activity DESC);

-- Media files captured by the relay during calls. File path relative to
-- VOICECLAW_MEDIA_DIR (default `~/.voiceclaw/recordings/`). `langfuse_media_id`
-- is set once the file has been uploaded to Langfuse Media.
CREATE TABLE media (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id           TEXT NOT NULL,
  span_id            TEXT,
  session_id         TEXT,
  kind               TEXT NOT NULL,   -- audio.in | audio.out | video.in
  codec              TEXT,            -- pcm16 | jpeg | mp4
  sample_rate_hz     INTEGER,
  bytes              INTEGER,
  duration_ms        INTEGER,
  start_offset_ms    INTEGER,         -- offset from session start
  file_path          TEXT,            -- local disk relative path
  langfuse_media_id  TEXT,
  created_at         INTEGER
);
CREATE INDEX media_session ON media(session_id, kind, start_offset_ms);
```

### Decoding from OTLP

The collector uses `@opentelemetry/otlp-transformer` to decode incoming OTLP-HTTP protobuf payloads. Each `ResourceSpans → ScopeSpans → Span` row becomes an `observations` row; a trace row is synthesized on the first span of a new `trace_id` and updated as more spans arrive for the same trace.

Session/user info flows via the Langfuse conventions already present in relay-emitted spans:

- `session.id` resource attribute (from `propagateAttributes` in `@langfuse/tracing`)
- `user.id` resource attribute
- `langfuse.observation.*` for input/output/model/usage_details

Where a span carries `gen_ai.usage.input_tokens` + `gen_ai.usage.output_tokens` (or `langfuse.observation.usage_details`), the collector promotes those into the `tokens_input`/`tokens_output`/`tokens_cached` columns and resolves `cost_usd` via the models.dev pricing lookup (below).

---

## Pricing (models.dev integration)

`models.dev` exposes a public JSON catalog — see [`https://models.dev/api/models`](https://models.dev/api/models) — with per-model input/output token costs. The collector:

1. Fetches the catalog once at startup, persists to `pricing_cache.json` alongside the SQLite DB.
2. Refreshes nightly via a cron tick.
3. Exposes `SELECT cost_usd` as a **derived** column populated by the ingest path: `cost_usd = (input_tokens / 1e6) * input_price + (output_tokens / 1e6) * output_price`.
4. Distinguishes cached-input tokens (reduced rate on Anthropic / OpenAI) where models.dev provides the cache-read price.

Known gaps models.dev doesn't cover: Gemini Live audio tokens, OpenAI Realtime audio tokens. For those, the collector reads `gen_ai.usage.input_audio_tokens` / `output_audio_tokens` and falls back to a hardcoded-but-overrideable `MEDIA_COSTS` table shipped with the collector. Easy to amend.

---

## Media pipeline

Every realtime call's audio (and optionally video) is captured at the relay and dual-persisted:

1. **Local disk** — `VOICECLAW_MEDIA_DIR` (default `~/.voiceclaw/recordings/`). Rotating per-session subdir. PCM16 audio written as `.wav` with a single header prepend; video frames as `.jpg` per frame with timestamps; or aggregated to an `.mp4` via `ffmpeg` on session end.
2. **Langfuse Media** — uploaded via Langfuse's media-upload API as the session ends (off-critical-path, best-effort). `langfuse_media_id` back-filled onto the `media` row.

Capture is **off by default** (privacy — voice / video contain PII). Toggled on by setting `VOICECLAW_CAPTURE_MEDIA=1` at the relay. When off, the UI shows a "recording not captured for this session" placeholder.

Memory / disk safety:

- Streamed straight to file (append mode), never buffered in memory past a small fixed-size chunk.
- Backpressure-aware: if disk write stalls, the relay sheds media chunks (dropping the oldest) before stalling the call's audio pipeline.
- Rotation: files > `VOICECLAW_MEDIA_MAX_MB` (default 100MB) rotate within a session.
- Retention: a cleanup job purges files older than `VOICECLAW_MEDIA_TTL_DAYS` (default 7) on a daily tick.
- S3 mode: when `VOICECLAW_MEDIA_S3_BUCKET` is set, local disk is treated as a staging area; files upload to S3 on finalize and the local copy is deleted. Supports any S3-compatible endpoint (MinIO for dev parity).

Raw PCM16 is preserved alongside any downmix; playback prefers the aggregated mix.

---

## v1 features

### Navigation

- `/` — redirects to `/sessions`.
- `/sessions` — sessions list (table). Columns: time, user, duration, turn count, total cost, avg turn latency, error badge. Filters: user, date range, min cost, errored-only. Row click → session detail.
- `/sessions/[sessionId]` — session detail (layout below).
- `/users/[userId]` — user detail: table of sessions, aggregates.
- `/users` — users list (top users by activity + cost).
- `/dashboard` — aggregate KPIs (below).

### Session detail layout

Modeled after Vapi. Left column (call summary + waveform timeline) + right column (tabs).

**Left column:**
- Call metadata: user, session id, duration, turn count, total cost, ended reason.
- Call waveform with the audio input / output tracks stacked (WaveSurfer.js), seekable. Tool-use moments marked on the waveform as colored bubbles per tool.
- Playback controls: play/pause, scrub, 1x/1.25x/1.5x/2x. Current-time readout; shift-click to set a loop.
- Download button for raw audio.

**Right column tabs:**

1. **Transcript** — alternating user / assistant bubbles with timestamps relative to session start. **System prompt shown as a special bubble at the top** (collapsible). Each bubble clickable to jump the waveform head.
2. **Logs** — filterable log table. Sources: relay log lines, openclaw gateway log lines, claude-cli raw stream events (optional toggle). Columns: time, level, category (call/voice/transcriber/llm/tool/brain), raw data. Export-to-JSONL.
3. **Messages** — full OTel messages array passed into the realtime model each turn: system + tools + prior user/assistant + current. Useful for "why did the model do X".
4. **Call cost** — pie chart (Chart.js) of cost by category:
   - Realtime (Gemini Live / OpenAI Realtime): voice input tokens, voice output tokens, transcript tokens.
   - Brain (claude-cli haiku): input tokens (cached + fresh), output tokens.
   - Breakdown with $ values and %. Click a slice → filters the logs to that category.
5. **Latency summary** — aggregate + per-turn. Avg / P50 / P95. Per-turn breakdown: Endpointing, Voice (TTS), Transcriber (STT), LLM (realtime), Brain (async), Total. Stacked bar chart per turn.
6. **Swim lanes (foldable)** — the trace tree. Each lane is a service (`voiceclaw-relay` / `openclaw-gateway`) with spans rendered as horizontal bars. Nested tool spans collapse under their parent. Fold/unfold per lane.
7. **Context breakdown** (responds to user's recent request) — stacked bar + per-segment breakdown of **what's using the token budget** for each brain call:
   - System prompt
   - Tool definitions
   - Memory injections (MEMORY.md, IDENTITY.md, SOUL.md content sizes)
   - Conversation history
   - Current user message
   - Tool-call JSON-args from prior turns
   
   Per-segment: chars + tokens (estimated via `tiktoken` or provider-reported when available). **Cache utilization** overlay: bar colored by "fresh tokens (paid full)" vs. "cache-read tokens (paid 10% per Anthropic pricing)". Green = cache-hit, orange = miss. Separate summary gauge showing % of context served from cache across the session.
8. **Structured outputs** — if the turn produced tool_result JSON, show structured diff.
9. **Media** — audio/video inline (if captured). Scrub-synchronized to the transcript.

### Dashboard view (`/dashboard`)

Top-row KPI cards:
- Cost today (split: realtime / brain).
- Call volume today + avg duration.
- Avg turn latency P50 / P95.
- Active users today.

Charts:
- Cost per day (stacked by backend).
- Call volume per day.
- Top 10 most-expensive sessions (last 7 days).
- Top 5 slowest turns (last 7 days).
- Errored sessions (last 7 days).
- Models used breakdown (pie: claude-haiku / gemini-live / etc.).

---

## v2 features

### Live streaming

The collector holds an SSE endpoint at `/stream/sessions/:sessionId` that pushes newly-arrived spans for that session to connected UI clients. The UI session-detail page subscribes when the session is "active" (last activity < 2 min ago), and:

- Appends new transcript bubbles as `transcript.delta` spans land.
- Animates new spans into the swim-lane timeline as they complete.
- Updates latency + cost cards in real time.

### Media live playback

For active sessions, the UI streams audio via range-request from the local file-in-progress (Node serves `Range: bytes=…` reads from the still-appending file). Refreshes the waveform every few seconds.

---

## Context token breakdown — implementation note

Relay side:
- Relay composes system instructions via `buildInstructions(config)`. The resulting string is already captured on `voice-turn` spans (PR #169).
- Tool schemas sent to Gemini/OpenAI Realtime live in a JSON blob — also captured as a span attribute.

Brain side:
- openclaw's cli_input event carries `systemPrompt` + `prompt`. The UI parses the resolved prompt to identify injected sections:
  - `<workspace-bootstrap>…</workspace-bootstrap>` block for MEMORY.md / IDENTITY.md / SOUL.md.
  - `<system>…</system>` for openclaw's appended rules.
  - User message at the tail.
- Tool-result tokens summed from prior `tool_result` events.

Token counts:
- Provider-reported where available (`gen_ai.usage.*`). Anthropic separates `cache_read_input_tokens` and `cache_creation_input_tokens` — we use those verbatim for the "cache utilization" breakdown.
- For sections without provider counts, estimate with `@anthropic-ai/tokenizer` / `tiktoken` locally. Flagged as estimated in the UI.

---

## Tech stack

- **tracing-collector**: Node 22+, TypeScript, pure stdlib `http` + `@opentelemetry/otlp-transformer`, `better-sqlite3` (WAL mode, prepared statements, bounded write queue). No web framework needed — just POST `/v1/traces` and GET `/stream/…` for SSE. ~400 LOC target.
- **tracing-ui**: Next.js 15 App Router, TypeScript. Tailwind (to keep consistency with voiceclaw's desktop/website tooling). `better-sqlite3` on the server via API routes; the SQLite file is shared with the collector (WAL, so concurrent readers + one writer are safe). Chart.js for cost/latency plots. WaveSurfer.js for audio. D3 for swim-lane timeline.
- **Models.dev** fetched once at collector startup + nightly refresh, cached to `pricing_cache.json` next to the SQLite file.

Yarn workspace scripts at repo root:

```
"dev:tracing"            : "concurrently yarn dev:tracing-collector yarn dev:tracing-ui"
"dev:tracing-collector"  : "cd tracing-collector && yarn dev"
"dev:tracing-ui"         : "cd tracing-ui && yarn dev"
"build:tracing-ui"       : "cd tracing-ui && yarn build"
"build:tracing-collector": "cd tracing-collector && yarn build"
```

---

## Auth (v1, minimum viable)

- Localhost-only binding by default. No auth when bound to `127.0.0.1`.
- When bound to `0.0.0.0` (for VPS deploy), require a `TRACING_UI_AUTH_TOKEN` env. Every API route + every UI route checks it via a `Bearer` header (UI stores in `localStorage` on first entry).
- No per-user accounts in v1. Everyone with the token sees everything.

---

## Deployment

Single VPS. Three always-on processes (PM2 or systemd):

1. `relay-server` (existing)
2. `tracing-collector` (new)
3. `tracing-ui` (Next.js server)

SQLite file lives at `~/.voiceclaw/tracing.db` (configurable via `VOICECLAW_TRACING_DB`). Backed up nightly with `sqlite3 .backup`.

Ports:

- Collector: 4318 (OTLP-HTTP convention)
- UI: 4319
- `nginx` in front for TLS + basic auth (prod).

---

## File layout (in voiceclaw repo)

```
tracing-collector/
  package.json
  tsconfig.json
  src/
    index.ts          # http entrypoint
    otlp.ts           # protobuf decode + span extraction
    db.ts             # sqlite schema + writes
    pricing.ts        # models.dev fetch + cost calc
    sse.ts            # SSE broadcast for v2
    media.ts          # media upload endpoint for v2

tracing-ui/
  package.json
  tsconfig.json
  next.config.ts
  src/
    app/
      page.tsx                # / redirects to /sessions
      sessions/page.tsx       # list
      sessions/[id]/page.tsx  # detail with tabs
      users/page.tsx
      users/[id]/page.tsx
      dashboard/page.tsx
      api/
        sessions/route.ts
        sessions/[id]/route.ts
        sessions/[id]/stream/route.ts  # SSE for v2
        observations/route.ts
        media/[id]/route.ts
    components/
      SessionList.tsx
      SessionDetail.tsx
      TranscriptView.tsx
      LogsTable.tsx
      CostBreakdown.tsx
      LatencySummary.tsx
      AudioPlayer.tsx
      VideoPlayer.tsx
      SwimLanes.tsx
      ContextBreakdown.tsx
      Dashboard.tsx
    lib/
      db.ts             # server-only SQLite access
      pricing.ts        # client-facing helpers
      otel.ts           # shared types
```

---

## Open questions (for morning)

- **Auth** in v1: localhost-only + shared token acceptable, or do you want per-user now?
- **Video frames**: Gemini Live + OpenAI Realtime accept video. Relay already routes frames. Capture cadence (1/sec? on-change? every N frames?).
- **Models.dev fallback pricing**: when offline or model missing from catalog, do we show "price unknown" or use a hardcoded fallback table?
- **Dashboard time zone**: local device or fixed UTC?
- **Retention**: 30 days for traces, 7 for media. OK?
- **Collector fanout vs. dual-write**: Codex recommended collector-fanout. Currently doing SDK dual-write. Stays unless we observe queue pressure.

---

## Phase plan

- **v1 (this PR)**: collector + Next.js app scaffold, sessions list, session detail with transcript + logs + cost + latency tabs, dashboard. Media capture stubbed behind a feature flag; UI shows "not captured".
- **v2 (follow-up)**: live SSE streaming, media capture pipeline (local + Langfuse Media), audio playback with waveform, context breakdown tab, video frames.
- **v3 (later)**: collector-fanout refactor, S3 media, proper auth, multi-tenant if needed.
