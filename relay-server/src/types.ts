// Relay protocol types — normalized event set that hides provider differences

// Client → Relay events
export type ClientEvent =
  | SessionConfigEvent
  | AudioAppendEvent
  | AudioCommitEvent
  | ResponseCreateEvent
  | ResponseCancelEvent
  | ToolResultEvent

export interface SessionConfigEvent {
  type: "session.config"
  provider: "openai" | "gemini"
  voice: string
  model?: string
  brainAgent: "kira" | "none"
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

export interface ErrorEvent {
  type: "error"
  message: string
  code: number
}
