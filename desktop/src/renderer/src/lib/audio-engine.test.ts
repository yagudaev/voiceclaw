import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioEngine, SAMPLE_RATE } from './audio-engine'

type FakeSource = {
  buffer: { duration: number } | null
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  onended: (() => void) | null
}

type FakeGain = { gain: { value: number }, connect: ReturnType<typeof vi.fn> }

type FakeContext = {
  currentTime: number
  destination: object
  createBuffer: (channels: number, length: number, rate: number) => { duration: number, copyToChannel: ReturnType<typeof vi.fn> }
  createBufferSource: () => FakeSource
}

let ctx: FakeContext
let gain: FakeGain
let createdSources: FakeSource[]

beforeEach(() => {
  createdSources = []
  ctx = makeFakeContext()
  gain = { gain: { value: 1 }, connect: vi.fn() }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AudioEngine.playAudio scheduling', () => {
  it('schedules the first chunk at currentTime', () => {
    const engine = makeEngine()
    engine.playAudio(silentBase64Chunk(2400))

    expect(createdSources).toHaveLength(1)
    expect(createdSources[0].start).toHaveBeenCalledTimes(1)
    expect(createdSources[0].start).toHaveBeenCalledWith(0)
  })

  it('schedules contiguous chunks at monotonically increasing start times', () => {
    const engine = makeEngine()
    const chunkLen = 2400
    const chunkDuration = chunkLen / SAMPLE_RATE

    engine.playAudio(silentBase64Chunk(chunkLen))
    engine.playAudio(silentBase64Chunk(chunkLen))
    engine.playAudio(silentBase64Chunk(chunkLen))

    expect(createdSources).toHaveLength(3)
    const startTimes = createdSources.map((s) => s.start.mock.calls[0][0] as number)
    expect(startTimes[0]).toBe(0)
    expect(startTimes[1]).toBeCloseTo(chunkDuration, 9)
    expect(startTimes[2]).toBeCloseTo(2 * chunkDuration, 9)
  })

  it('clamps to currentTime when the schedule has fallen behind', () => {
    const engine = makeEngine()
    const chunkLen = 2400
    engine.playAudio(silentBase64Chunk(chunkLen))

    ctx.currentTime = 5

    engine.playAudio(silentBase64Chunk(chunkLen))

    expect(createdSources).toHaveLength(2)
    expect(createdSources[1].start).toHaveBeenCalledWith(5)
  })
})

describe('AudioEngine.stopPlayback', () => {
  it('stops all live sources and resets the schedule', () => {
    const engine = makeEngine()
    const chunkLen = 2400
    engine.playAudio(silentBase64Chunk(chunkLen))
    engine.playAudio(silentBase64Chunk(chunkLen))

    engine.stopPlayback()

    expect(createdSources[0].stop).toHaveBeenCalledTimes(1)
    expect(createdSources[1].stop).toHaveBeenCalledTimes(1)

    ctx.currentTime = 10
    engine.playAudio(silentBase64Chunk(chunkLen))
    expect(createdSources[2].start).toHaveBeenCalledWith(10)
  })

  it('tolerates already-stopped sources without throwing', () => {
    const engine = makeEngine()
    engine.playAudio(silentBase64Chunk(2400))
    createdSources[0].stop.mockImplementation(() => {
      throw new Error('already stopped')
    })

    expect(() => engine.stopPlayback()).not.toThrow()
  })
})

describe('AudioEngine source lifecycle', () => {
  it('removes a source from the live set when it ends naturally', () => {
    const engine = makeEngine()
    engine.playAudio(silentBase64Chunk(2400))
    engine.playAudio(silentBase64Chunk(2400))

    createdSources[0].onended?.()

    engine.stopPlayback()
    expect(createdSources[0].stop).not.toHaveBeenCalled()
    expect(createdSources[1].stop).toHaveBeenCalledTimes(1)
  })
})

function makeEngine(): AudioEngine {
  const engine = new AudioEngine()
  // playAudio guards with `if (!this.audioCtx || !this.gainNode) return`.
  // Inject mocks directly so we can exercise scheduling without startCapture
  // (which depends on getUserMedia / AudioWorklet that aren't available here).
  Object.assign(engine as unknown as Record<string, unknown>, {
    audioCtx: ctx,
    gainNode: gain,
  })
  return engine
}

function makeFakeContext(): FakeContext {
  return {
    currentTime: 0,
    destination: {},
    createBuffer: (_channels: number, length: number, rate: number) => ({
      duration: length / rate,
      copyToChannel: vi.fn(),
    }),
    createBufferSource: () => {
      const source: FakeSource = {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      }
      createdSources.push(source)
      return source
    },
  }
}

function silentBase64Chunk(samples: number): string {
  const bytes = new Uint8Array(samples * 2)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
