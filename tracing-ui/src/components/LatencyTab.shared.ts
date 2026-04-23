// Shared latency-category constants. Lives in its own file (no "use client",
// no "use server") so it can be imported from both the LatencyTab server
// component and the LatencyStackedBar client component without Next.js
// complaining about mixed server/client boundaries.
//
// Categories reflect what we actually measure for realtime voice models:
// a single Realtime generation (Gemini Live / gpt-realtime) and the async
// Brain (Claude via openclaw) hop. No separate STT/TTS/endpointing stages —
// realtime models don't expose them. Anything else falls into "other" so
// unknown spans stay visible without being mis-labeled.

export type LatencyCategory = "endpointing" | "realtime" | "transport" | "brain" | "other"

export const LATENCY_CATEGORIES: { key: LatencyCategory; label: string; color: string }[] = [
  { key: "endpointing", label: "Endpointing", color: "#f59e0b" },
  { key: "realtime", label: "Realtime", color: "#60a5fa" },
  { key: "transport", label: "Transport", color: "#34d399" },
  { key: "brain", label: "Brain (async)", color: "#a78bfa" },
  { key: "other", label: "Other", color: "#71717a" },
]
