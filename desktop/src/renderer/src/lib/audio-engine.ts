// Web Audio API engine for microphone capture and audio playback.
// Port of the pattern from relay-server/src/test-page.ts, adapted
// to support device selection and volume control.

export const SAMPLE_RATE = 24000
const FRAME_SIZE = 2400 // 100ms at 24kHz

export type AudioDevice = {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

export class AudioEngine {
  private audioCtx: AudioContext | null = null
  private micStream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private playbackQueue: Float32Array[] = []
  private activeSource: AudioBufferSourceNode | null = null
  private isPlaying = false
  private muted = false
  private currentRms = 0
  private captureBuffer = new Float32Array(0)

  async startCapture(
    onAudioData: (base64: string) => void,
    deviceId?: string,
  ) {
    this.audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })

    // Gain node for playback volume
    this.gainNode = this.audioCtx.createGain()
    this.gainNode.connect(this.audioCtx.destination)

    const constraints: MediaStreamConstraints = {
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
    }

    this.micStream = await navigator.mediaDevices.getUserMedia(constraints)
    this.source = this.audioCtx.createMediaStreamSource(this.micStream)

    // ScriptProcessorNode for raw PCM access (proven pattern from relay test page)
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)
    this.captureBuffer = new Float32Array(0)

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)

      // Compute RMS for level meter
      let sum = 0
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
      this.currentRms = Math.sqrt(sum / input.length)

      if (this.muted) return

      // Accumulate and emit FRAME_SIZE chunks
      const merged = new Float32Array(this.captureBuffer.length + input.length)
      merged.set(this.captureBuffer)
      merged.set(input, this.captureBuffer.length)
      this.captureBuffer = merged

      while (this.captureBuffer.length >= FRAME_SIZE) {
        const frame = this.captureBuffer.slice(0, FRAME_SIZE)
        this.captureBuffer = this.captureBuffer.slice(FRAME_SIZE)
        onAudioData(float32ToPcm16Base64(frame))
      }
    }

    this.source.connect(this.processor)
    this.processor.connect(this.audioCtx.destination)
  }

  stopCapture() {
    this.processor?.disconnect()
    this.source?.disconnect()
    this.micStream?.getTracks().forEach((t) => t.stop())
    this.processor = null
    this.source = null
    this.micStream = null
    this.captureBuffer = new Float32Array(0)
    this.currentRms = 0
  }

  playAudio(base64: string) {
    if (!this.audioCtx || !this.gainNode) return

    const float32 = pcm16Base64ToFloat32(base64)
    this.playbackQueue.push(float32)
    if (!this.isPlaying) this.drainPlaybackQueue()
  }

  stopPlayback() {
    this.playbackQueue = []
    this.isPlaying = false
    if (this.activeSource) {
      try { this.activeSource.stop() } catch { /* already stopped */ }
      this.activeSource = null
    }
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, volume)
    }
  }

  async setOutputDevice(deviceId: string) {
    if (this.audioCtx && 'setSinkId' in this.audioCtx) {
      await (this.audioCtx as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(
        deviceId,
      )
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted
  }

  getInputLevel(): number {
    return this.currentRms
  }

  destroy() {
    this.stopCapture()
    this.stopPlayback()
    this.audioCtx?.close()
    this.audioCtx = null
    this.gainNode = null
  }

  // --- Private ---

  private drainPlaybackQueue() {
    if (!this.audioCtx || !this.gainNode || this.playbackQueue.length === 0) {
      this.isPlaying = false
      return
    }
    this.isPlaying = true
    const samples = this.playbackQueue.shift()!
    const buffer = this.audioCtx.createBuffer(1, samples.length, SAMPLE_RATE)
    buffer.copyToChannel(samples, 0)
    const source = this.audioCtx.createBufferSource()
    source.buffer = buffer
    source.connect(this.gainNode)
    source.onended = () => {
      if (this.activeSource === source) this.activeSource = null
      this.drainPlaybackQueue()
    }
    this.activeSource = source
    source.start()
  }
}

export async function enumerateAudioDevices(): Promise<AudioDevice[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')
    .map((d) => ({
      deviceId: d.deviceId,
      label: d.label || `${d.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${d.deviceId.slice(0, 8)}`,
      kind: d.kind as 'audioinput' | 'audiooutput',
    }))
}

// --- Encoding helpers ---

function float32ToPcm16Base64(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  const bytes = new Uint8Array(pcm16.buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const pcm16 = new Int16Array(bytes.buffer)
  const float32 = new Float32Array(pcm16.length)
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768
  return float32
}
