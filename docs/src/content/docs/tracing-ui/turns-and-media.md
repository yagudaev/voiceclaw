---
title: Turns tab + media capture
description: Timeline view of per-turn spans, captured audio/video playback, and the vendor-neutral media.* attribute family the relay emits.
---

The **Turns** tab is a per-turn swim-lane view of a session. Left rail lists turns; the middle panel shows a foldable span tree for the selected turn with duration bars; the right panel renders span details (model, tokens, cost, all attributes, events, and tool input/output when present).

URL state (`?turn=<traceId>&step=<spanId>`) lets reviewers deep-link to a specific step.

## Media capture

When `VOICECLAW_MEDIA_CAPTURE=enabled` is set on the relay, each turn's inbound microphone PCM, outbound model audio, and (optional) Gemini Live video frames are teed to disk under:

```
~/.voiceclaw/media/<sessionKey>/
  user-<turnId>.pcm              # mono PCM16 little-endian
  user-<turnId>.pcm.json         # { "sampleRate": 24000, "channels": 1 }
  assistant-<turnId>.pcm
  assistant-<turnId>.pcm.json
  video-<turnId>/0000.jpeg       # one JPEG per frame
  video-<turnId>/timings.json    # { "frames": [{ "offset_ms", "file" }, …] }
```

The relay stamps `media.*` attributes on the `voice-turn` span so the collector can index them. The tracing collector inserts one row per role/modality into the `media` table. The tracing UI's Turns tab pulls those rows and renders a stereo-style audio player (user + assistant on a shared timeline) plus a canvas-based video stepper for screen-share frames.

### Attributes emitted by the relay

Vendor-neutral `media.*` family (no `langfuse.*` prefix):

| Attribute | Meaning |
| --- | --- |
| `media.user_audio.path` | Absolute path to the user PCM file |
| `media.user_audio.duration_ms` | Estimated PCM duration from bytes / sample_rate |
| `media.user_audio.sample_rate` | Hz, usually 24000 |
| `media.user_audio.codec` | Always `pcm_s16le` today |
| `media.user_audio.bytes` | File size in bytes |
| `media.user_audio.provider` | `local` (flat file) or `langfuse` (uploaded) |
| `media.assistant_audio.*` | Same set, for the assistant output track |
| `media.user_video.path` | Path to the JPEG-frame directory |
| `media.user_video.frame_count` | Count of captured frames |
| `media.user_video.duration_ms` | Wall-clock of the turn |

### Media API

`GET /api/media/<sessionId>/<path>` serves bytes from the session's media root. PCM files are re-wrapped into WAV on the fly so browsers can play them natively. Path traversal is blocked: the resolver anchors to `<sessionId>` and rejects any target outside that subtree.

## Langfuse Media upload

Not wired in this PR. The relay records `media.<role>.provider = "local"` for now, and Langfuse Media uploads remain a follow-up — the flat-file capture is enough to unblock reviewers debugging bad turns locally.

## Latency tab changes

The per-turn latency table no longer shows Endpointing / Voice (TTS) / Transcriber (STT) / To-Transport — realtime models (Gemini Live, `gpt-realtime`) don't expose those stages, so every column was empty. Remaining columns:

- **Total** — `voice-turn` span duration
- **TTFT** — Time To First Token; derived from `gen_ai.response.first_token_ns` on the voice-turn span, or the earliest `first_token` / `first_chunk` / `first_audio_frame` event on any child span. Renders `—` when neither is present.
- **Realtime** — Cumulative duration of the realtime model call (formerly labeled "LLM")
- **Brain (async)** — Cumulative duration of `ask_brain` / openclaw spans
- **Other** — Anything else, visible but not miscategorized

## What the UI reads today vs what needs relay changes

- Tool input/output rendering — the detail panel reads `gen_ai.tool.input` / `gen_ai.tool.output` with a fallback to legacy `langfuse.observation.input` / `langfuse.observation.output`. Once the openclaw fork starts emitting the `gen_ai.*` keys, those panels will light up automatically.
- TTFT — currently renders `—` unless the relay emits `gen_ai.response.first_token_ns` or a `first_*` event. Wiring that emission is a follow-up.
