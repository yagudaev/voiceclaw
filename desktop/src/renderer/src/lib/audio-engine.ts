export const SAMPLE_RATE = 24000
const FRAME_SIZE = 2400

export type AudioDevice = {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

export class AudioEngine {
  private audioCtx: AudioContext | null = null
  private micStream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private liveSources: Set<AudioBufferSourceNode> = new Set()
  private nextStartTime = 0
  private muted = false
  private currentRms = 0
  private outputVolume = 1
  private outputMuted = false

  private outputAnalyser: AnalyserNode | null = null
  private outputAnalyserBuf: Float32Array | null = null

  private workletNode: AudioWorkletNode | null = null

  private processor: ScriptProcessorNode | null = null
  private captureBuffer = new Float32Array(0)

  async startCapture(
    onAudioData: (base64: string) => void,
    deviceId?: string,
  ) {
    this.audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })

    this.gainNode = this.audioCtx.createGain()
    this.gainNode.connect(this.audioCtx.destination)
    this.applyOutputGain()

    // Tap the gain post-volume so the level meter reflects what the user hears.
    this.outputAnalyser = this.audioCtx.createAnalyser()
    this.outputAnalyser.fftSize = 512
    this.outputAnalyserBuf = new Float32Array(this.outputAnalyser.fftSize)
    this.gainNode.connect(this.outputAnalyser)

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

    const useWorklet = await tryRegisterWorklet(this.audioCtx)

    if (useWorklet) {
      this.startWorkletCapture(onAudioData)
    } else {
      this.startScriptProcessorCapture(onAudioData)
    }
  }

  stopCapture() {
    this.workletNode?.port.close()
    this.workletNode?.disconnect()
    this.workletNode = null

    this.processor?.disconnect()
    this.processor = null

    this.source?.disconnect()
    this.source = null

    this.micStream?.getTracks().forEach((t) => t.stop())
    this.micStream = null

    this.captureBuffer = new Float32Array(0)
    this.currentRms = 0
  }

  playAudio(base64: string) {
    if (!this.audioCtx || !this.gainNode) return

    const samples = pcm16Base64ToFloat32(base64)
    if (samples.length === 0) return

    const buffer = this.audioCtx.createBuffer(1, samples.length, SAMPLE_RATE)
    buffer.copyToChannel(samples, 0)

    const source = this.audioCtx.createBufferSource()
    source.buffer = buffer
    source.connect(this.gainNode)

    const startAt = Math.max(this.audioCtx.currentTime, this.nextStartTime)
    source.start(startAt)
    this.nextStartTime = startAt + buffer.duration

    this.liveSources.add(source)
    source.onended = () => {
      this.liveSources.delete(source)
    }
  }

  stopPlayback() {
    this.nextStartTime = 0
    for (const source of this.liveSources) {
      try { source.stop() } catch { /* already stopped */ }
    }
    this.liveSources.clear()
  }

  setVolume(volume: number) {
    this.outputVolume = Math.max(0, volume)
    this.applyOutputGain()
  }

  setOutputMuted(muted: boolean) {
    this.outputMuted = muted
    this.applyOutputGain()
  }

  getOutputVolume(): number {
    return this.outputVolume
  }

  isOutputMuted(): boolean {
    return this.outputMuted
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
    this.workletNode?.port.postMessage({ type: 'mute', value: muted })
  }

  getInputLevel(): number {
    return this.currentRms
  }

  getOutputLevel(): number {
    if (!this.outputAnalyser || !this.outputAnalyserBuf) return 0
    this.outputAnalyser.getFloatTimeDomainData(this.outputAnalyserBuf)
    let sum = 0
    for (let i = 0; i < this.outputAnalyserBuf.length; i++) {
      const v = this.outputAnalyserBuf[i]
      sum += v * v
    }
    return Math.sqrt(sum / this.outputAnalyserBuf.length)
  }

  destroy() {
    this.stopCapture()
    this.stopPlayback()
    this.outputAnalyser?.disconnect()
    this.outputAnalyser = null
    this.outputAnalyserBuf = null
    this.audioCtx?.close()
    this.audioCtx = null
    this.gainNode = null
  }

  private startWorkletCapture(onAudioData: (base64: string) => void) {
    if (!this.audioCtx || !this.source) return

    this.workletNode = new AudioWorkletNode(this.audioCtx, 'mic-capture-processor')

    this.workletNode.port.onmessage = (e) => {
      const { type } = e.data
      if (type === 'rms') {
        this.currentRms = e.data.value
      } else if (type === 'audio') {
        const pcm16 = new Int16Array(e.data.pcm16)
        onAudioData(int16ToBase64(pcm16))
      }
    }

    this.workletNode.port.postMessage({ type: 'mute', value: this.muted })

    this.source.connect(this.workletNode)
    // Worklet must be connected to destination (even silently) so the graph keeps pulling.
    this.workletNode.connect(this.audioCtx.destination)
  }

  private startScriptProcessorCapture(onAudioData: (base64: string) => void) {
    if (!this.audioCtx || !this.source) return

    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)
    this.captureBuffer = new Float32Array(0)

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)

      let sum = 0
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
      this.currentRms = Math.sqrt(sum / input.length)

      if (this.muted) return

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

  private applyOutputGain() {
    if (!this.gainNode) return
    this.gainNode.gain.value = this.outputMuted ? 0 : this.outputVolume
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

async function tryRegisterWorklet(ctx: AudioContext): Promise<boolean> {
  try {
    const workletUrl = new URL('./audio-worklet-processor.js', import.meta.url)
    await ctx.audioWorklet.addModule(workletUrl)
    return true
  } catch (err) {
    console.warn('AudioWorklet registration failed, falling back to ScriptProcessorNode:', err)
    return false
  }
}

function int16ToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16ToBase64(pcm16)
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
