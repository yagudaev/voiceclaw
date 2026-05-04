export type VoicePreviewClip = {
  audio: HTMLAudioElement
  // Releases any blob: URL backing this clip. Callers MUST invoke `revoke`
  // once playback is finished or the clip is replaced — otherwise PCM
  // previews leak renderer memory across clicks.
  revoke: () => void
}

export function decodeVoicePreviewAudio(base64: string, mimeType: string): VoicePreviewClip {
  if (mimeType.startsWith('audio/L16') || mimeType.startsWith('audio/pcm')) {
    const sampleRate = parsePcmSampleRate(mimeType) ?? 24000
    const wav = pcmToWav(base64, sampleRate)
    const blob = new Blob([wav], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    return { audio: new Audio(url), revoke: () => URL.revokeObjectURL(url) }
  }
  // data: URLs are owned by the engine and don't need revocation.
  return { audio: new Audio(`data:${mimeType};base64,${base64}`), revoke: () => {} }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePcmSampleRate(mimeType: string): number | null {
  const match = mimeType.match(/rate=(\d+)/i)
  return match ? Number(match[1]) : null
}

function pcmToWav(base64: string, sampleRate: number): ArrayBuffer {
  const binary = atob(base64)
  const pcm = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) pcm[i] = binary.charCodeAt(i)

  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = pcm.length
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  new Uint8Array(buffer, 44).set(pcm)
  return buffer
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}
