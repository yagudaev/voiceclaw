# VoiceClaw Comprehensive Testing Strategy

**Date**: April 20, 2026
**Scope**: Relay-Server, Mobile (Expo), Desktop (Electron)
**Status**: Pre-implementation (no tests currently configured)

---

## 1. Current State Assessment

### Testing Infrastructure
- ❌ **Relay-Server**: No test framework configured (no Jest, Vitest, or Mocha setup)
- ❌ **Mobile**: No React Native Testing Library or Jest setup for Expo
- ❌ **Desktop**: No Electron testing framework configured
- ⚠️ **Critical Gap**: Real-time audio/voice interaction features are entirely untested

### Existing Code Patterns Ready for Testing
| Component | Type | Ready | Notes |
|-----------|------|-------|-------|
| `relay-server/src/auth.ts` | Utility | ✅ Pure function, no dependencies | Easy to unit test |
| `relay-server/src/tools/brain.ts` | Service | ⚠️ Has timeout logic | Requires mocking fetch/SSE |
| `relay-server/src/adapters/gemini.ts` | Adapter | 🔴 Complex WebSocket stateful | Hardest to test, needs mocking |
| `desktop/src/renderer/src/lib/audio-engine.ts` | Engine | ⚠️ Web Audio API | Needs DOM/Web Audio mock |
| `desktop/src/renderer/src/lib/screen-capture.ts` | Utility | ✅ Electron IPC abstraction | Can mock IPC |
| `mobile/app/(tabs)/index.tsx` | Component | ⚠️ React Native | Needs @react-native-testing-library |

---

## 2. Recommended Testing Frameworks

### Relay-Server
```bash
# Install testing dependencies
npm install --save-dev \
  jest \
  @types/jest \
  ts-jest \
  jest-mock-extended \
  supertest
```

**jest.config.js**:
```js
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}
```

### Desktop (Electron)
```bash
npm install --save-dev \
  jest \
  @types/jest \
  ts-jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom
```

### Mobile (Expo/React Native)
```bash
npx expo install \
  --save-dev \
  @testing-library/react-native \
  @testing-library/jest-native \
  jest-expo \
  @react-native-async-storage/async-storage \
  jest-mock-extended
```

---

## 3. Component-Level Testing Strategy

### 3.1 Relay-Server Tests

#### Auth Module (`src/auth.ts`)
**Type**: Unit Test
**Framework**: Jest
**File**: `src/auth.test.ts`

```typescript
describe('validateBrainGatewayToken', () => {
  it('returns true when gateway responds with JSON', async () => {
    // Mock fetch to return valid /v1/models response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
      })
    )

    const result = await validateBrainGatewayToken(
      'http://localhost:18789',
      'valid-token'
    )

    expect(result).toBe(true)
  })

  it('returns false on network error', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('ECONNREFUSED')))

    const result = await validateBrainGatewayToken(
      'http://localhost:18789',
      'token'
    )

    expect(result).toBe(false)
  })

  it('returns false when response is HTML (unconfigured gateway)', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
      })
    )

    const result = await validateBrainGatewayToken(
      'http://localhost:18789',
      'token'
    )

    expect(result).toBe(false)
  })
})
```

#### Brain Tool (`src/tools/brain.ts`)
**Type**: Integration Test (with SSE mock)
**Framework**: Jest
**File**: `src/tools/brain.test.ts`

```typescript
describe('askBrain SSE Streaming', () => {
  it('parses SSE stream chunks correctly', async () => {
    // Create a mock ReadableStream that emulates SSE chunks
    const mockStream = createMockReadableStream([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ])

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        body: mockStream,
      })
    )

    const response = await askBrain('test question')
    expect(response).toContain('Hello world')
  })

  it('aborts after 120 seconds of no data (readCount=0)', async () => {
    // Simulate a hanging SSE stream
    const mockStream = new Promise((resolve) => {
      setTimeout(() => resolve(null), 130_000) // Never resolves in time
    })

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        body: mockStream,
      })
    )

    await expect(askBrain('test')).rejects.toThrow('local 120s timeout')
  })

  it('handles malformed SSE frames gracefully', async () => {
    // Test recovery from bad JSON in SSE chunk
    const mockStream = createMockReadableStream([
      'data: {invalid json}\n\n',
      'data: {"choices":[{"delta":{"content":"Recovered"}}]}\n\n',
    ])

    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, body: mockStream })
    )

    const response = await askBrain('test')
    expect(response).toContain('Recovered')
  })
})
```

#### Gemini Adapter (`src/adapters/gemini.ts`)
**Type**: Integration Test (WebSocket mock)
**Framework**: Jest + `jest-mock-extended`
**File**: `src/adapters/gemini.test.ts`

```typescript
describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter
  let mockWebSocket: jest.Mocked<WebSocket>

  beforeEach(() => {
    jest.useFakeTimers()
    mockWebSocket = createMockWebSocket()
    // Mock WebSocket constructor
    ;(global as any).WebSocket = jest.fn(() => mockWebSocket)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('establishes Gemini Live connection with auth', async () => {
    adapter = new GeminiAdapter()
    const sendToClient = jest.fn()

    await adapter.connect('test-api-key', sendToClient)

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('setupComplete')
    )
  })

  it('detects poisoned handle (generation pipeline stuck after resume)', async () => {
    adapter = new GeminiAdapter()
    const sendToClient = jest.fn()

    await adapter.connect('test-api-key', sendToClient)

    // Simulate ASR alive but generation stuck
    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        serverContent: { modelTurn: { partsCase: 'empty' } },
        inputTranscription: 'hello',
      }),
    } as any)

    // Advance timers past POST_RESUME_GENERATION_TIMEOUT_MS (8s)
    jest.advanceTimersByTime(9000)

    // Should have detected poisoned handle and reconnected
    expect(mockWebSocket.close).toHaveBeenCalled()
  })

  it('buffers audio during reconnect window', async () => {
    adapter = new GeminiAdapter()

    // Simulate reconnect scenario
    adapter.sendAudio(Buffer.from([...Array(24000).keys()]))
    adapter.sendAudio(Buffer.from([...Array(24000).keys()]))

    // Should queue up to MAX_PENDING_AUDIO (50) chunks
    expect(adapter.getPendingAudioCount()).toBeLessThanOrEqual(50)
  })
})
```

#### Session Management (`src/session.ts`)
**Type**: Integration Test
**File**: `src/session.test.ts`

```typescript
describe('RelaySession', () => {
  it('initializes with WebSocket connection', () => {
    const mockWs = createMockWebSocket()
    const session = new RelaySession(mockWs)

    expect(session.isActive()).toBe(true)
  })

  it('syncs transcript to database on adapter disconnect', async () => {
    const mockDb = jest.fn()
    const session = new RelaySession(mockWs)

    // Simulate conversation
    session.appendMessage('user', 'Hello')
    session.appendMessage('assistant', 'Hi there!')

    // Disconnect should trigger transcript sync
    await session.cleanup()

    expect(mockDb).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO messages'),
      expect.arrayContaining(['user', 'Hello', 'assistant', 'Hi there!'])
    )
  })
})
```

---

### 3.2 Desktop App Tests

#### Audio Engine (`src/renderer/src/lib/audio-engine.ts`)
**Type**: Unit Test (with Web Audio mock)
**Framework**: Jest + jsdom
**File**: `src/renderer/src/lib/audio-engine.test.ts`

```typescript
describe('AudioEngine', () => {
  let audioEngine: AudioEngine

  beforeEach(() => {
    audioEngine = new AudioEngine()
    // Mock Web Audio API
    const mockAudioContext = createMockAudioContext()
    window.AudioContext = jest.fn(() => mockAudioContext) as any
  })

  afterEach(() => {
    audioEngine.destroy()
  })

  it('captures microphone audio at 24kHz sample rate', async () => {
    const audioData: string[] = []

    await audioEngine.startCapture((base64) => {
      audioData.push(base64)
    })

    // Simulate 100ms of audio data
    const mockAudioBuffer = new Float32Array(2400)
    // Fill with sine wave
    for (let i = 0; i < 2400; i++) {
      mockAudioBuffer[i] = Math.sin((i / 2400) * Math.PI * 2) * 0.5
    }

    // Trigger processor
    audioEngine['processor']?.onaudioprocess?.({
      inputBuffer: { getChannelData: () => mockAudioBuffer },
    } as any)

    expect(audioData.length).toBeGreaterThan(0)
  })

  it('computes RMS level correctly', async () => {
    await audioEngine.startCapture(() => {})

    // Inject test signal with known RMS
    const testSignal = new Float32Array(2400).fill(0.5)

    audioEngine['processor']?.onaudioprocess?.({
      inputBuffer: { getChannelData: () => testSignal },
    } as any)

    const rms = audioEngine.getInputLevel()
    expect(rms).toBeCloseTo(0.5, 2) // Within 0.01
  })

  it('respects mute state', async () => {
    const audioData: string[] = []
    await audioEngine.startCapture((base64) => audioData.push(base64))

    audioEngine.setMuted(true)

    // Inject audio while muted
    const testSignal = new Float32Array(2400)
    audioEngine['processor']?.onaudioprocess?.({
      inputBuffer: { getChannelData: () => testSignal },
    } as any)

    // Should still compute RMS but not emit data
    expect(audioData.length).toBe(0)
    expect(audioEngine.getInputLevel()).toBeGreaterThan(0)
  })

  it('plays queued audio in sequence', async () => {
    const mockSource = { start: jest.fn(), stop: jest.fn(), onended: null }

    audioEngine.playAudio('base64encodedaudio1')
    audioEngine.playAudio('base64encodedaudio2')

    // Trigger first playback end
    mockSource.onended?.()

    // Should start second audio
    expect(mockSource.start).toHaveBeenCalledTimes(2)
  })
})
```

#### Screen Capture (`src/renderer/src/lib/screen-capture.ts`)
**Type**: Unit Test (IPC mock)
**File**: `src/renderer/src/lib/screen-capture.test.ts`

```typescript
describe('Screen Capture', () => {
  it('requests screen capture via IPC', async () => {
    const mockIpc = {
      invoke: jest.fn(() =>
        Promise.resolve({
          dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
          timestamp: Date.now(),
        })
      ),
    }

    const jpeg = await captureScreen(mockIpc)

    expect(mockIpc.invoke).toHaveBeenCalledWith('capture-screen')
    expect(jpeg).toMatch(/^data:image\/jpeg/)
  })

  it('handles capture errors gracefully', async () => {
    const mockIpc = {
      invoke: jest.fn(() =>
        Promise.reject(new Error('User denied permission'))
      ),
    }

    await expect(captureScreen(mockIpc)).rejects.toThrow('User denied')
  })
})
```

---

### 3.3 Mobile App Tests

#### Chat Page Component (`app/(tabs)/index.tsx`)
**Type**: Component Test
**Framework**: React Native Testing Library
**File**: `app/(tabs)/index.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import ChatPage from './index'

describe('ChatPage', () => {
  it('renders chat interface with message input', () => {
    render(<ChatPage />)

    expect(screen.getByPlaceholderText(/Say something/i)).toBeTruthy()
  })

  it('sends audio via WebSocket on mic button press', async () => {
    const mockWs = createMockWebSocket()
    jest.spyOn(global, 'WebSocket').mockReturnValue(mockWs)

    render(<ChatPage />)

    const micButton = screen.getByRole('button', { name: /mic/i })
    fireEvent.press(micButton)

    await waitFor(() => {
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('audio')
      )
    })
  })

  it('displays assistant responses in real-time', async () => {
    const mockWs = createMockWebSocket()
    jest.spyOn(global, 'WebSocket').mockReturnValue(mockWs)

    const { getByText } = render(<ChatPage />)

    // Simulate SSE chunks from server
    mockWs.onmessage?.({
      data: 'data: {"delta":"Hello"}\n\n',
    } as any)

    await waitFor(() => {
      expect(getByText(/Hello/)).toBeTruthy()
    })
  })
})
```

---

## 4. Integration Testing Strategy

### 4.1 E2E Voice Interaction Flow

**Test Scenario**: User speaks → Audio captured → Relayed to Gemini → Response played back

**Tools**: Playwright (cross-platform) or Cypress (web only)

```bash
npm install --save-dev \
  @playwright/test \
  playwright-mock-audio \
  audio-context-mock
```

**File**: `tests/e2e/voice-interaction.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Voice Interaction E2E', () => {
  test('complete voice query → response flow', async ({ page, context }) => {
    // Mock microphone with test audio
    const mockAudio = await generateTestAudio(
      'What is the weather today?',
      24000 // 24kHz as per SAMPLE_RATE
    )

    await page.goto('http://localhost:3000')

    // Inject mock microphone
    await context.grantPermissions(['microphone'])
    await injectMockMediaStream(page, mockAudio)

    // Click mic button
    await page.click('button:has-text("Start Listening")')

    // Wait for relay connection
    await expect(page.locator('[data-status="connected"]')).toBeVisible()

    // Simulate network latency with Gemini
    await page.waitForTimeout(2000)

    // Response should appear
    await expect(page.locator('[data-speaker="assistant"]')).toContainText(
      /weather|forecast|today/i
    )

    // Audio should be playing
    const audioElement = await page.$('audio[autoplay]')
    expect(audioElement).toBeTruthy()
  })

  test('handles Gemini reconnection gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Simulate Gemini WebSocket close
    await page.evaluate(() => {
      const ws = (window as any).__geminiWs
      if (ws) ws.close()
    })

    // Should reconnect automatically
    await expect(page.locator('[data-status="reconnecting"]')).toBeVisible()
    await expect(page.locator('[data-status="connected"]')).toBeVisible({
      timeout: 5000,
    })
  })

  test('audio quality remains acceptable during simultaneous playback', async ({
    page,
  }) => {
    // Background music playing via relay
    await injectBackgroundAudio(page, 'ambient-music.mp3')

    // User speaks (should duck background)
    const userAudio = await generateTestAudio('Hello', 24000)
    await injectMicrophoneAudio(page, userAudio)

    // Measure audio levels
    const levels = await page.evaluate(() => {
      return (window as any).__audioLevels
    })

    // Background should have ducked (RMS reduced by at least 3dB)
    expect(levels.backgroundReduction).toBeGreaterThan(3)
  })
})
```

### 4.2 Audio Quality Benchmarking

**File**: `tests/performance/audio-quality.test.ts`

```typescript
describe('Audio Quality Metrics', () => {
  it('measures latency from capture to relay transmission', async () => {
    const timings: number[] = []

    for (let i = 0; i < 100; i++) {
      const startTime = performance.now()

      // Capture 100ms of audio
      const audio = await captureAudio(100)

      // Encode and send to relay
      await relayServer.sendAudio(audio)

      timings.push(performance.now() - startTime)
    }

    const avgLatency = timings.reduce((a, b) => a + b) / timings.length
    const maxLatency = Math.max(...timings)

    // Desktop should be <50ms avg, <100ms max
    expect(avgLatency).toBeLessThan(50)
    expect(maxLatency).toBeLessThan(100)
  })

  it('measures SNR (Signal-to-Noise Ratio) for captured audio', async () => {
    // Capture clean speech
    const cleanAudio = await captureAudio(2000, {
      noiseFloor: -80, // dB
    })

    // Analyze frequencies
    const spectrum = performFFT(cleanAudio)
    const speechBand = spectrum.slice(85, 255) // Human voice range
    const noiseBand = spectrum.slice(0, 80) // Below speech

    const snr = calculateSNR(speechBand, noiseBand)

    // Should achieve at least 40dB SNR
    expect(snr).toBeGreaterThan(40)
  })

  it('validates real-time streaming doesn't exceed jitter limits', async () => {
    const chunkTimestamps: number[] = []

    await relayServer.onAudioChunk((chunk, timestamp) => {
      chunkTimestamps.push(timestamp)
    })

    // Capture 10 seconds of streaming audio
    await captureAudio(10000)

    // Calculate inter-arrival times (should be constant ~100ms at 24kHz)
    const jitters = []
    for (let i = 1; i < chunkTimestamps.length; i++) {
      const delta = chunkTimestamps[i] - chunkTimestamps[i - 1]
      jitters.push(Math.abs(delta - 100)) // Expected: 100ms per frame
    }

    const maxJitter = Math.max(...jitters)

    // Jitter should be <10% of frame time
    expect(maxJitter).toBeLessThan(10) // <10ms jitter
  })
})
```

---

## 5. Real-Time Observability Testing

### 5.1 Turn-State Tracing

**Goal**: Verify that turn state transitions (LISTENING → PROCESSING → SPEAKING) are properly traced via Langfuse

**File**: `tests/observability/turn-states.test.ts`

```typescript
describe('Turn State Observability', () => {
  it('traces complete turn lifecycle', async () => {
    const traces: any[] = []

    jest.spyOn(langfuse, 'trace').mockImplementation((event) => {
      traces.push(event)
    })

    // Start session
    const session = await relayServer.createSession()

    // Send audio (LISTENING → PROCESSING)
    await session.sendAudio(testAudioBuffer)

    // Wait for Gemini response (PROCESSING → SPEAKING)
    await session.waitForResponse(5000)

    // Verify trace events in order
    expect(traces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ state: 'LISTENING' }),
        expect.objectContaining({ state: 'PROCESSING' }),
        expect.objectContaining({ state: 'SPEAKING' }),
      ])
    )
  })

  it('records tool invocations in turn context', async () => {
    const traces: any[] = []
    jest.spyOn(langfuse, 'trace').mockImplementation((e) => traces.push(e))

    // Initiate conversation that triggers tool call
    const session = await relayServer.createSession()
    await session.sendText('What is the weather?')

    await session.waitForCompletion()

    // Should have tool_call trace
    expect(traces).toContainEqual(
      expect.objectContaining({
        type: 'tool_call',
        toolName: expect.any(String),
      })
    )
  })

  it('measures latency within each turn phase', async () => {
    const timings: Record<string, number> = {}

    const session = await relayServer.createSession()
    const startTime = performance.now()

    // Timestamp each phase
    session.on('stateChange', (newState) => {
      timings[newState] = performance.now() - startTime
    })

    await session.sendAudio(testAudioBuffer)
    await session.waitForResponse()

    // Listening → Processing should be <100ms
    expect(timings.PROCESSING - timings.LISTENING).toBeLessThan(100)

    // Processing → Speaking should be <2s (Gemini latency)
    expect(timings.SPEAKING - timings.PROCESSING).toBeLessThan(2000)
  })
})
```

---

## 6. Audio Filtering & Music Ducking Tests

### 6.1 High-Pass Filter (Speech Enhancement)

**Goal**: Verify high-pass filter removes rumble while preserving speech intelligibility

```typescript
describe('High-Pass Filter (80Hz)', () => {
  it('attenuates frequencies below 80Hz', async () => {
    const filter = createHighPassFilter(80, 24000)

    // Test 1kHz tone (should pass)
    const highFreq = generateTone(1000, 24000, 1) // 1 second
    const filtered = filter.process(highFreq)

    const [passedEnergy] = analyzeFrequency(filtered, 1000)
    expect(passedEnergy).toBeGreaterThan(0.95) // 95% or more

    // Test 40Hz tone (should be heavily attenuated)
    const lowFreq = generateTone(40, 24000, 1)
    const filtered40 = filter.process(lowFreq)

    const [attenuatedEnergy] = analyzeFrequency(filtered40, 40)
    expect(attenuatedEnergy).toBeLessThan(0.1) // Less than 10%
  })

  it('preserves speech intelligibility', async () => {
    const filter = createHighPassFilter(80, 24000)

    // Load sample speech ("The quick brown fox...")
    const speechAudio = await loadAudio('test-audio/speech.wav')

    // Apply filter
    const filtered = filter.process(speechAudio)

    // Run through PESQ (Perceptual Evaluation of Speech Quality)
    const pesqScore = calculatePESQ(speechAudio, filtered)

    // PESQ > 3.5 indicates good intelligibility preservation
    expect(pesqScore).toBeGreaterThan(3.5)
  })
})
```

### 6.2 Notch Filter (60Hz Hum Removal)

```typescript
describe('Notch Filter (60Hz)', () => {
  it('removes 60Hz mains hum', async () => {
    const filter = createNotchFilter(60, 24000, Q=10)

    // Mix speech with 60Hz hum
    const speech = generateTone(1000, 24000, 1)
    const hum = generateTone(60, 24000, 1)
    const mixed = addAudio(speech, hum, 0.5) // 50% hum

    // Apply notch filter
    const filtered = filter.process(mixed)

    // Measure 60Hz energy before and after
    const [beforeEnergy] = analyzeFrequency(mixed, 60)
    const [afterEnergy] = analyzeFrequency(filtered, 60)

    // Should reduce by at least 20dB
    const reduction = 20 * Math.log10(beforeEnergy / afterEnergy)
    expect(reduction).toBeGreaterThan(20)
  })
})
```

### 6.3 Audio Ducking (Music Volume Reduction)

```typescript
describe('Audio Ducking', () => {
  it('reduces background music when speech is detected', async () => {
    const vad = new VoiceActivityDetector(24000)
    const ducker = new AudioDucker({
      attackTime: 100, // ms
      releaseTime: 500,
      reductionAmount: -6, // dB
    })

    // Background music (constant level)
    const bgMusic = await loadAudio('test-audio/ambient.wav')

    // User speaks (VAD should trigger)
    const speech = await loadAudio('test-audio/speech.wav')
    const mixed = mixAudio([
      { audio: bgMusic, volume: 0.7 },
      { audio: speech, volume: 1.0 },
    ])

    // Apply VAD + ducking
    let duckingActive = false
    const output = mixed.map((sample) => {
      const isSpeech = vad.process(sample)
      duckingActive = isSpeech
      return ducker.process(sample, isSpeech)
    })

    // Measure music level during speech vs silence
    const musicDuringSpeech = analyzeSegment(
      output,
      0,
      3000 // First 3 seconds (speech is here)
    ).rms

    const musicDuringSilence = analyzeSegment(
      output,
      9000,
      12000 // Last 3 seconds (silence)
    ).rms

    // Music should be 6dB quieter during speech
    const reductionDb = 20 * Math.log10(musicDuringSilence / musicDuringSpeech)
    expect(reductionDb).toBeCloseTo(6, 1) // Within 1dB
  })

  it('has smooth attack/release without audible clicks', async () => {
    const ducker = new AudioDucker({
      attackTime: 100,
      releaseTime: 500,
    })

    // Simulate speech onset
    const audio = new Float32Array(2400 * 10) // 10 frames

    // First 3 frames: no speech (normal level)
    for (let i = 0; i < 2400 * 3; i++) {
      audio[i] = 0.3
    }

    // Frame 4-7: speech detected (ducking active)
    for (let i = 2400 * 3; i < 2400 * 7; i++) {
      audio[i] = 0.3
    }

    // Frame 8-10: speech ends (recovery)
    for (let i = 2400 * 7; i < 2400 * 10; i++) {
      audio[i] = 0.3
    }

    // Process with ducking
    const output = new Float32Array(audio.length)
    for (let i = 0; i < audio.length; i++) {
      output[i] = ducker.process(audio[i], i >= 2400 * 3 && i < 2400 * 7)
    }

    // Check for clicks: derivative should be smooth (no jumps >0.05)
    for (let i = 1; i < output.length; i++) {
      const derivative = Math.abs(output[i] - output[i - 1])
      expect(derivative).toBeLessThan(0.05) // No audio clicks
    }
  })
})
```

---

## 7. Testing CI/CD Pipeline

### 7.1 GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  relay-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: relay-server/package-lock.json

      - name: Install dependencies
        working-directory: relay-server
        run: npm ci

      - name: Lint
        working-directory: relay-server
        run: npm run lint

      - name: Type check
        working-directory: relay-server
        run: npm run typecheck

      - name: Unit tests
        working-directory: relay-server
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./relay-server/coverage/lcov.info
          flags: relay-server

  desktop:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: desktop/package-lock.json

      - name: Install dependencies
        working-directory: desktop
        run: npm ci

      - name: Unit tests
        working-directory: desktop
        run: npm test -- --coverage

      - name: E2E tests (playwright)
        working-directory: desktop
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./desktop/coverage/lcov.info
          flags: desktop

  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        working-directory: mobile
        run: npm ci

      - name: Unit tests
        working-directory: mobile
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./mobile/coverage/lcov.info
          flags: mobile

  audio-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: Audio quality benchmarks
        run: npm run test:audio-benchmarks -- --json > benchmark-results.json

      - name: Comment on PR with benchmark results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs')
            const results = JSON.parse(fs.readFileSync('benchmark-results.json'))
            const comment = `## Audio Quality Benchmarks\n\n${formatResults(results)}`
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            })
```

---

## 8. Testing Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Jest for relay-server
- [ ] Write auth.ts unit tests (100% coverage)
- [ ] Set up React Testing Library for desktop
- [ ] Write AudioEngine unit tests

**Goal**: 40% code coverage, critical paths tested

### Phase 2: Integration (Week 3-4)
- [ ] Mock Gemini Live WebSocket, write adapter tests
- [ ] E2E voice interaction flow tests
- [ ] Audio ducking algorithm tests
- [ ] Set up Langfuse tracing verification

**Goal**: 60% code coverage, real-time paths validated

### Phase 3: Quality (Week 5-6)
- [ ] Audio quality benchmarking (latency, SNR, jitter)
- [ ] Performance profiling (CPU/memory under load)
- [ ] Mobile app component tests
- [ ] CI/CD pipeline integration

**Goal**: 75%+ code coverage, performance baselines established

### Phase 4: Optimization (Week 7+)
- [ ] Stress tests (concurrent sessions, network degradation)
- [ ] Audio filtering validation (PESQ scores)
- [ ] Accessibility testing (screen reader support)
- [ ] Device-specific audio calibration tests

**Goal**: 85%+ coverage, production-ready quality

---

## 9. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Code Coverage** | 75%+ | `npm test -- --coverage` reports |
| **Audio Latency** | <100ms avg, <200ms p95 | E2E test timing logs |
| **SNR (Signal-to-Noise)** | >40dB | FFT analysis in audio tests |
| **Reconnect Time** | <2s | Session reconnection tests |
| **Chunk Jitter** | <10ms | Streaming timestamp variance |
| **CI/CD Time** | <5min | Workflow execution duration |
| **Test Flakiness** | <2% | Failure rate across 100 runs |

---

## 10. Known Testing Challenges & Solutions

### Challenge 1: Mocking Gemini Live WebSocket
**Problem**: Complex stateful WebSocket with many edge cases
**Solution**: Create comprehensive mock in `tests/mocks/gemini-ws.ts` that simulates all close codes, reconnection scenarios, and data races

### Challenge 2: Web Audio API Differences Across Devices
**Problem**: iOS Safari, Android Chrome, Desktop all have different capabilities
**Solution**: Device-specific test fixtures + conditional test skipping based on platform

### Challenge 3: SSE Stream Timeouts
**Problem**: 120-second timeout can make tests slow
**Solution**: Use Jest fake timers for timeout tests, real timers only for latency benchmarks

### Challenge 4: Audio Data Validation
**Problem**: Binary audio data is hard to assert on
**Solution**: Spectrum analysis helpers (FFT) to compare frequency content rather than raw samples

---

## Quick Start: Run Tests

```bash
# All tests
npm test

# Relay server only
cd relay-server && npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific test file
npm test -- src/auth.test.ts

# E2E tests
npm run test:e2e

# Audio quality benchmarks
npm run test:audio-benchmarks

# CI/CD simulation
npm run test:ci
```

---

**Last Updated**: 2026-04-20
**Maintained By**: Michael Yagudaev
