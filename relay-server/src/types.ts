// Relay protocol types — normalized event set that hides provider differences

// Client → Relay events
export type ClientEvent =
  | SessionConfigEvent
  | AudioAppendEvent
  | AudioCommitEvent
  | ResponseCreateEvent
  | ResponseCancelEvent
  | ToolResultEvent
  | ClientTimingEvent

export interface SessionConfigEvent {
  type: "session.config"
  provider: "openai" | "gemini"
  voice: string
  model?: string
  brainAgent: "enabled" | "none"
  apiKey: string
  sessionKey?: string
  openclawGatewayUrl?: string
  openclawAuthToken?: string
  deviceContext?: {
    timezone?: string
    locale?: string
    deviceModel?: string
    location?: string
  }
  instructionsOverride?: string
  conversationHistory?: { role: "user" | "assistant", text: string }[]
}

export interface AudioAppendEvent {
  type: "audio.append"
  data: string // base64 PCM16
}

export interface AudioCommitEvent {
  type: "audio.commit"
}

export interface ResponseCreateEvent {
  type: "response.create"
}

export interface ResponseCancelEvent {
  type: "response.cancel"
}

export interface ToolResultEvent {
  type: "tool.result"
  callId: string
  output: string
}

// Emitted by the mobile client to attribute latency across the pipeline
// (e.g., mic-open → first-audio-chunk, turn-started → first-tts-sample).
// Relay attaches these to the Langfuse generation span identified by turnId.
// turnId is issued by the relay in TurnStartedEvent; echoing it back avoids
// attributing a late-arriving timing to the wrong turn.
export interface ClientTimingEvent {
  type: "client.timing"
  phase: string
  ms: number
  turnId?: string
}

// Relay → Client events
export type RelayEvent =
  | SessionReadyEvent
  | AudioDeltaEvent
  | TranscriptDeltaEvent
  | TranscriptDoneEvent
  | ToolCallEvent
  | ToolProgressEvent
  | TurnStartedEvent
  | TurnEndedEvent
  | SessionEndedEvent
  | SessionRotatingEvent
  | SessionRotatedEvent
  | UsageMetricsEvent
  | ToolCancelledEvent
  | ErrorEvent

export interface SessionReadyEvent {
  type: "session.ready"
  sessionId: string
}

export interface AudioDeltaEvent {
  type: "audio.delta"
  data: string // base64 PCM16
}

export interface TranscriptDeltaEvent {
  type: "transcript.delta"
  text: string
  role: "user" | "assistant"
}

export interface TranscriptDoneEvent {
  type: "transcript.done"
  text: string
  role: "user" | "assistant"
}

export interface ToolCallEvent {
  type: "tool.call"
  callId: string
  name: string
  arguments: string
}

export interface ToolProgressEvent {
  type: "tool.progress"
  callId: string
  summary: string
}

export interface TurnStartedEvent {
  type: "turn.started"
  turnId?: string
}

export interface TurnEndedEvent {
  type: "turn.ended"
}

export interface SessionEndedEvent {
  type: "session.ended"
  summary: string
  durationSec: number
  turnCount: number
}

export interface SessionRotatingEvent {
  type: "session.rotating"
}

export interface SessionRotatedEvent {
  type: "session.rotated"
  sessionId: string
}

// Emitted by adapters with per-turn token/audio usage. Consumed internally
// by the tracer to attribute cost on Langfuse generations; not forwarded to
// the mobile client.
export interface UsageMetricsEvent {
  type: "usage.metrics"
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  inputAudioTokens?: number
  outputAudioTokens?: number
}

// Adapter signals that the upstream model gave up on a tool call
// (e.g., Gemini toolCallCancellation). Session uses this to abort the matching
// in-flight server-side fetch so the gateway slot is released, then forwards
// the event to the client so it can update UI (drop speculative prefixes,
// clear spinners, etc.).
export interface ToolCancelledEvent {
  type: "tool.cancelled"
  callIds: string[]
}

export interface ErrorEvent {
  type: "error"
  message: string
  code: number
}
