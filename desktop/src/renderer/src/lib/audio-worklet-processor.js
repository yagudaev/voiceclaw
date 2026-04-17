// AudioWorklet processor for microphone capture.
// Runs on a dedicated audio thread — receives raw Float32 samples,
// converts to PCM16, and posts fixed-size frames back to the main thread.

const FRAME_SIZE = 2400 // 100ms at 24 kHz

class MicCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = new Float32Array(0)
    this._muted = false

    this.port.onmessage = (e) => {
      if (e.data.type === 'mute') {
        this._muted = e.data.value
      }
    }
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0] || input[0].length === 0) return true

    const samples = input[0]

    // Compute RMS for level meter (always, even when muted)
    let sum = 0
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
    const rms = Math.sqrt(sum / samples.length)
    this.port.postMessage({ type: 'rms', value: rms })

    if (this._muted) return true

    // Accumulate samples into the buffer
    const merged = new Float32Array(this._buffer.length + samples.length)
    merged.set(this._buffer)
    merged.set(samples, this._buffer.length)
    this._buffer = merged

    // Emit full frames of PCM16 data
    while (this._buffer.length >= FRAME_SIZE) {
      const frame = this._buffer.slice(0, FRAME_SIZE)
      this._buffer = this._buffer.slice(FRAME_SIZE)

      const pcm16 = new Int16Array(FRAME_SIZE)
      for (let i = 0; i < FRAME_SIZE; i++) {
        const s = Math.max(-1, Math.min(1, frame[i]))
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }

      this.port.postMessage(
        { type: 'audio', pcm16: pcm16.buffer },
        [pcm16.buffer]
      )
    }

    return true
  }
}

registerProcessor('mic-capture-processor', MicCaptureProcessor)
