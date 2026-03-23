export type TranscriptEvent = {
  role: 'user' | 'assistant'
  text: string
  type: 'partial' | 'final'
}

export type SpeechEvent = {
  role: 'user' | 'assistant'
}

export type FunctionCallEvent = {
  name: string
  parameters: Record<string, unknown>
}

export type ErrorEvent = {
  message: string
}

export type CallResult = {
  callId: string
  status: string
}

export type ExpoVapiModuleEvents = {
  onCallStart: () => void
  onCallEnd: () => void
  onTranscript: (event: TranscriptEvent) => void
  onSpeechStart: (event: SpeechEvent) => void
  onSpeechEnd: (event: SpeechEvent) => void
  onFunctionCall: (event: FunctionCallEvent) => void
  onError: (event: ErrorEvent) => void
}
