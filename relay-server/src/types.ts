// Relay protocol types — normalized event set that hides provider differences

// Client → Relay events
export type ClientEvent =
  | SessionConfigEvent
  | AudioAppendEvent
  | AudioAppendCaptureOnlyEvent
  | AudioCommitEvent
  | FrameAppendEvent
  | ResponseCreateEvent
  | ResponseCancelEvent
  | ToolResultEvent
  | ClientTimingEvent

export interface SessionConfigEvent {
  type: "session.config"
  provider: "openai" | "gemini" | "xai"
  voice: string
  model?: string
  brainAgent: "enabled" | "none"
  apiKey: string
  // Tavily API key for the web_search tool. When present (either here or via
  // TAVILY_API_KEY env on the relay), web_search is registered as a tool the
  // realtime model can call for fast lookups that don't need the brain agent.
  tavilyApiKey?: string
  sessionKey?: string
  // Stable identifier for the human behind this session (telegram chat id,
  // app user id, etc.). Propagated to Langfuse so traces group per-user.
  userId?: string
  deviceContext?: {
    timezone?: string
    locale?: string
    deviceModel?: string
    location?: string
  }
  watchdog?: "enabled" | "disabled"
  instructionsOverride?: string
  conversationHistory?: { role: "user" | "assistant", text: string }[]
}

export interface AudioAppendEvent {
  type: "audio.append"
  data: string // base64 PCM16
}

export interface AudioAppendCaptureOnlyEvent {
  type: "audio.append_capture_only"
  data: string // base64 PCM16, local recording only; never forwarded upstream
}

export interface AudioCommitEvent {
  type: "audio.commit"
}

export interface FrameAppendEvent {
  type: "frame.append"
  data: string // base64 JPEG
  mimeType?: string // default "image/jpeg"
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
  | LatencyMetricsEvent
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

// Emitted by adapters with per-turn latency measurements observable from the
// provider wire protocol. Consumed internally by the tracer and stamped onto
// the voice-turn span as raw OTel attributes under the vendor-neutral voice.*
// namespace; not forwarded to the mobile client. Boundaries and source-kind
// semantics documented on TurnTracer.attachLatency.
export interface LatencyMetricsEvent {
  type: "latency.metrics"
  // End-of-speech signal → first model audio byte. Covers the provider's VAD
  // endpointing wait plus model TTFT. What the user perceives as "how fast did
  // it reply". Adapters should not emit this when the turn was interrupted or
  // produced no model audio — a missing metric is better than a misleading one.
  endpointMs?: number
  // How end-of-speech was determined: "server_eos" (explicit provider event),
  // "transcription_proxy" (derived from last input-transcription delta — loose),
  // "last_audio_frame" (derived from last upstream audio write — rough fallback).
  endpointSource?: string
  // Last upstream audio frame written → first model byte received. Relay-local,
  // no device clock needed. NOT a pure network RTT: includes provider queueing
  // and any remaining VAD wait before generation starts.
  providerFirstByteMs?: number
  // turn.started → first model audio byte. Our existing turn boundary is "user
  // started talking" (first input-transcription delta or speech_started), so
  // this captures the full wait including endpointing.
  firstAudioFromTurnStartMs?: number
  // turn.started → first model TEXT delta. VoiceClaw accepts text output too
  // (links, structured replies, fallback when the model declines audio); this
  // lets dashboards see both modalities separately.
  firstTextFromTurnStartMs?: number
  // turn.started → first model output byte, regardless of modality. This is
  // the "TTFT" we surface to the UI by default — whichever came first.
  firstOutputFromTurnStartMs?: number
  // Which modality won the race to first-output. "audio" | "text".
  firstOutputModality?: string
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
