// Shared latency-category constants. Lives in its own file (no "use client",
// no "use server") so it can be imported from both the LatencyTab server
// component and the LatencyStackedBar client component without Next.js
// complaining about mixed server/client boundaries.

export type LatencyCategory =
  | "endpointing"
  | "voice"
  | "transcriber"
  | "llm_realtime"
  | "brain"
  | "transport"

export const LATENCY_CATEGORIES: { key: LatencyCategory; label: string; color: string }[] = [
  { key: "endpointing", label: "Endpointing", color: "#fbbf24" },
  { key: "voice", label: "Voice (TTS)", color: "#f472b6" },
  { key: "transcriber", label: "Transcriber (STT)", color: "#34d399" },
  { key: "llm_realtime", label: "LLM (realtime)", color: "#60a5fa" },
  { key: "brain", label: "Brain (async)", color: "#a78bfa" },
  { key: "transport", label: "To-Transport", color: "#71717a" },
]
