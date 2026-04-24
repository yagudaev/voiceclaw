---
title: Session media timeline
description: Session-level audio/video artifacts, MediaTimeline playback, and the capture gates involved in tracing UI media.
---

VoiceClaw can capture per-turn audio and video while a relay session is running, then write session-level artifacts at session finalize so the tracing UI can replay the call end-to-end.

## Disk layout

When `VOICECLAW_MEDIA_CAPTURE=enabled`, the relay writes under:

```txt
~/.voiceclaw/media/<sessionKey>/
  user-<turnId>.pcm
  user-<turnId>.pcm.json
  assistant-<turnId>.pcm
  assistant-<turnId>.pcm.json
  video-<turnId>/0000.jpeg
  video-<turnId>/timings.json
  session/
    user.wav
    assistant.wav
    peaks.json
    thumbnails.json
```

The per-turn files are written as the call runs. The `session/` files are written when the relay finalizes the session, after all turns have been closed.

## Session files

`user.wav` is the stitched user microphone track. `assistant.wav` is the stitched model audio track. Both are mono PCM WAV files, usually at 24 kHz.

`peaks.json` is a small waveform manifest:

```ts
{
  user: number[]
  assistant: number[]
  userDurationMs: number
  assistantDurationMs: number
  sampleRate: number
}
```

`thumbnails.json` is a bounded video manifest:

```ts
{
  frames: [{ frameFile: string, timeMs: number }]
}
```

`frameFile` is relative to `<sessionKey>`, so the tracing UI serves it with `GET /api/media/<sessionKey>/<frameFile>`.

## Tracing UI consumption

The collector indexes `media.session_*` attributes into `session_user_audio`, `session_assistant_audio`, `session_peaks`, and `session_thumbnails` rows. `MediaTimeline` reads those rows and drives:

- two synchronized audio elements
- a two-track waveform from `peaks.json`
- a video canvas showing the nearest thumbnail frame
- an iMovie-style thumbnail strip for click-and-drag scrubbing
- transcript and turn markers on the same master time axis

The Transcript tab uses the master playhead to highlight the active `voice-turn` row. Clicking a transcript row seeks the timeline to that turn start. The Turns tab uses the same full-session timeline and highlights the selected turn.

## Capture gates

`VOICECLAW_MEDIA_CAPTURE=enabled` controls local audio/video file capture in the relay.

`OTEL_GENAI_CAPTURE_CONTENT` is separate. It controls whether OpenClaw emits raw tool arguments/results into tracing attributes. It does not enable audio capture, and disabling it does not stop `user.wav`, `assistant.wav`, `peaks.json`, or `thumbnails.json` from being written when relay media capture is enabled.

## What to expect

The current user track may be quieter than the assistant track because iOS captures post-processing mic audio. The media API normalizes user PCM for browser playback when wrapping per-turn PCM files, and the session timeline reads the finalized WAV files. The native mic-tap follow-up is tracked in NAN-652 so future captures can use an un-gated raw microphone path.
