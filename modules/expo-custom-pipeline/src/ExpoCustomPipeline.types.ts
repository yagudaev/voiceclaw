export type PartialTranscriptEvent = {
  text: string
}

export type FinalTranscriptEvent = {
  text: string
}

export type PipelineErrorEvent = {
  message: string
}

export type ExpoCustomPipelineModuleEvents = {
  onPartialTranscript: (event: PartialTranscriptEvent) => void
  onFinalTranscript: (event: FinalTranscriptEvent) => void
  onTTSStart: () => void
  onTTSComplete: () => void
  onError: (event: PipelineErrorEvent) => void
}
