export type PartialTranscriptEvent = {
  text: string
}

export type FinalTranscriptEvent = {
  text: string
}

export type LatencyUpdateEvent = {
  sttLatencyMs: number
  llmLatencyMs: number
  ttsLatencyMs: number
}

export type PipelineErrorEvent = {
  message: string
}

export type LatencyStats = {
  sttLatencyMs: number
  llmLatencyMs: number
  ttsLatencyMs: number
}

export type AssistantResponseEvent = {
  text: string
}

export type ExpoCustomPipelineModuleEvents = {
  onPartialTranscript: (event: PartialTranscriptEvent) => void
  onFinalTranscript: (event: FinalTranscriptEvent) => void
  onAssistantResponse: (event: AssistantResponseEvent) => void
  onTTSStart: () => void
  onTTSComplete: () => void
  onLatencyUpdate: (event: LatencyUpdateEvent) => void
  onError: (event: PipelineErrorEvent) => void
}
