# Linear Ticket Template: VoiceClaw Testing Infrastructure & Strategy

**Title**: Implement comprehensive testing strategy for VoiceClaw (40% → 92% coverage over 7 weeks)

**Description**:

## Summary
Establish testing infrastructure across all three VoiceClaw components (relay-server, mobile, desktop) with a phased approach targeting 92% code coverage. Includes unit tests, integration tests, E2E voice interaction flows, real-time observability validation, and audio quality benchmarking.

**Key Documents**:
- [TESTING_STRATEGY.md](https://github.com/michaelsayman/voiceclaw/blob/main/TESTING_STRATEGY.md) — Comprehensive 500+ line guide with test examples
- [ARCHITECTURE.md](https://github.com/michaelsayman/voiceclaw/blob/main/docs/ARCHITECTURE.md) — System diagrams (9 Mermaid graphs)
- [TEST_COVERAGE_MAP.md](https://github.com/michaelsayman/voiceclaw/blob/main/docs/TEST_COVERAGE_MAP.md) — Traceability matrix & critical paths

---

## Current State
- ❌ Zero test frameworks configured (relay-server, desktop, mobile)
- ⚠️ Critical paths untested: Gemini WebSocket integration, audio filtering, voice interaction E2E
- 🔴 Known issue: Brain agent 120s SSE timeout failing (readCount=0, needs mocking)
- 🔴 Poisoned handle detection untested (ASR alive but generation stuck after reconnect)

---

## Proposed Testing Strategy

### Phase 1: Foundation (Week 1-2) → 40% Coverage
**Goal**: Test critical paths in isolation

#### Relay-Server
- [ ] Jest setup + ts-jest config
- [ ] `auth.ts` unit tests (100% coverage)
  - Valid token validation
  - Network errors
  - HTML response (unconfigured gateway)

#### Desktop
- [ ] Jest + jsdom + Web Audio mock setup
- [ ] `AudioEngine.test.ts` (95% coverage)
  - Microphone capture at 24kHz
  - RMS level computation
  - Mute state
  - Audio queue playback
- [ ] `ScreenCapture.test.ts` (100% coverage)
  - IPC invocation
  - Error handling

#### Mobile
- [ ] React Native Testing Library setup
- [ ] Basic component smoke tests

**Deliverable**: Core functionality validated, framework set up for subsequent phases

---

### Phase 2: Integration (Week 3-4) → 60% Coverage
**Goal**: Test component interactions and external dependencies

#### Brain Tool (`src/tools/brain.ts`)
- [ ] SSE stream parsing (3 tests)
  - Valid streaming chunks
  - 120s timeout on readCount=0
  - Malformed JSON recovery
- [ ] Error states
  - Network errors
  - Non-JSON responses

#### Gemini Adapter (`src/adapters/gemini.ts`)
- [ ] WebSocket mock setup (jest-mock-extended)
- [ ] Connection lifecycle (2 tests)
  - Auth token + setupComplete flow
  - Close code handling (1001, 1006, 1007, 1011)
- [ ] Poisoned handle detection (2 tests)
  - ASR alive, generation stuck → force fresh session
  - Proper timeout (8s POST_RESUME_GENERATION_TIMEOUT_MS)
- [ ] Audio buffering (1 test)
  - Max 50 pending audio chunks during reconnect
  - Stale chunk dropping

#### Session Management
- [ ] Transcript persistence (1 test)
  - Messages saved on disconnect
- [ ] Concurrent sessions (1 test)
  - Multiple parallel connections

#### Audio Filters (biquadjs)
- [ ] High-pass filter (80Hz) (2 tests)
  - Frequency response validation (FFT)
  - Speech intelligibility (PESQ >3.5)
- [ ] Notch filter (60Hz) (1 test)
  - 60Hz attenuation >20dB

**Deliverable**: Real-time paths validated, Gemini integration mocked

---

### Phase 3: Quality & Performance (Week 5-6) → 80% Coverage
**Goal**: Validate end-to-end flows and performance metrics

#### E2E Voice Interaction (Playwright)
- [ ] Complete voice flow (3 tests)
  - User speaks → transcript → brain response → audio playback
  - Latency measurement (<1.6s ideal, <2.5s p95)
  - Error message display
- [ ] Network resilience (2 tests)
  - Gemini reconnection (graceful resume)
  - Poisoned handle recovery (force fresh session)
- [ ] Audio ducking (1 test)
  - Music volume reduced 6dB during speech
  - Smooth attack (<100ms) and release (no clicks)

#### Audio Quality Benchmarking
- [ ] Latency benchmarks (1 test)
  - Capture → buffer: <50ms
  - Relay → Gemini: <10ms
  - Brain inference: <800ms (with 120s timeout fallback)
  - TTS synthesis: <200ms
  - Client playback: <30ms
  - **Target**: <100ms avg, <200ms p95 per stage

- [ ] Signal quality (2 tests)
  - SNR (Signal-to-Noise Ratio): >40dB
    - Clean speech + background noise mix
    - FFT analysis on 1-4kHz band (speech intelligibility)
  - Jitter: <10ms inter-arrival variance
    - 100ms frame timing consistency
  - PESQ (Perceptual Evaluation of Speech Quality): >3.5
    - Before/after filtering comparison

#### Real-Time Observability
- [ ] Turn-state tracing (1 test)
  - LISTENING → PROCESSING → SPEAKING state machine
  - Langfuse event logging (turn_started, audio_received, transcript_ready, tool_called, audio_playing)
  - Latency metrics per state (latency_listening_ms, latency_processing_ms, etc.)

#### Mobile E2E
- [ ] Voice interaction on actual device (2 tests)
  - Expo app → relay connection
  - Message send/receive cycle

**Deliverable**: Performance baselines established, critical paths fully validated

---

### Phase 4: Optimization & Stress (Week 7+) → 92% Coverage
**Goal**: Production readiness and edge case handling

- [ ] Concurrent sessions stress test (5+ simultaneous)
- [ ] Network degradation scenarios (packet loss, latency spikes)
- [ ] Device-specific audio calibration
  - iPhone mic profiles
  - Android mic profiles
  - Desktop microphone variety
- [ ] Long-running session stability (>30min without disconnect)
- [ ] Memory leak detection (heap snapshots before/after 100 turns)

**Deliverable**: Production-ready test suite, performance regression detection

---

## Critical Testing Gaps (Blocking Issues)

### 1. Brain Agent SSE Timeout (120s readCount=0)
**Impact**: askBrain tool consistently fails, breaks entire conversation flow
**Test Coverage Needed**:
- Mock ReadableStream with SSE chunks
- Timeout trigger (no data for 120s)
- Malformed JSON handling

**Status**: Documented in TESTING_STRATEGY.md §3.1

### 2. Poisoned Handle Detection (Gemini Reconnect)
**Impact**: After goAway, ASR pipeline restarts but generation stays stuck
**Test Coverage Needed**:
- Simulate ASR activity (inputTranscription received)
- Generation pipeline stuck (no modelTurn for 8s)
- Force fresh session (no handle parameter)

**Status**: Documented in TESTING_STRATEGY.md §3.1, ARCHITECTURE.md (Error Recovery diagram)

### 3. Audio Ducking Algorithm
**Impact**: Music playback during voice interaction causes distortion
**Test Coverage Needed**:
- VAD (Voice Activity Detection) triggering
- Smooth envelope (attack <100ms, release >500ms)
- 6dB reduction without clicks

**Status**: Documented in TESTING_STRATEGY.md §6.3

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Code Coverage** | 75%+ | `npm test -- --coverage` per component |
| **Audio Latency (avg)** | <100ms | End-to-end from capture to relay |
| **Audio Latency (p95)** | <200ms | 95th percentile over 100 samples |
| **SNR** | >40dB | FFT analysis: speech band / noise floor |
| **PESQ** | >3.5 | Speech intelligibility (before/after filters) |
| **Jitter** | <10ms | Inter-arrival time variance per frame |
| **Reconnect Time** | <2s | Gemini disconnect to resumed state |
| **CI/CD Pipeline** | <5min | Total test execution + coverage upload |
| **Test Flakiness** | <2% | Failure rate across 100 consecutive runs |

---

## Dependencies & Prerequisites

### Frameworks to Install
```bash
# Relay-Server
npm install --save-dev jest @types/jest ts-jest jest-mock-extended supertest

# Desktop
npm install --save-dev jest ts-jest @testing-library/react @testing-library/jest-dom jsdom

# Mobile
npx expo install --save-dev @testing-library/react-native jest-expo @react-native-async-storage/async-storage
```

### External Tools
- **Playwright** (E2E): `npm install --save-dev @playwright/test`
- **FFT Analysis**: Web Audio API (built-in) + custom helpers
- **PESQ Scoring**: Open-source `pesq.js` (npm package available)
- **Langfuse**: Already configured, trace events ready

---

## Timeline & Milestones

```
Week 1-2 (Phase 1)  [████░░░░░░] 40% coverage
  - Mon: Jest setup all 3 components
  - Wed: auth.ts + AudioEngine tests
  - Fri: Framework validated, ready for Phase 2

Week 3-4 (Phase 2)  [████████░░] 60% coverage
  - Mon: Brain tool SSE mocking complete
  - Wed: Gemini adapter WebSocket mock + tests
  - Fri: Audio filters + session tests passing

Week 5-6 (Phase 3)  [██████████] 80% coverage
  - Mon: E2E voice interaction (Playwright)
  - Wed: Audio quality benchmarking suite
  - Fri: Observability tracing validated

Week 7+  (Phase 4)  [████████████] 92% coverage
  - Stress testing
  - Device calibration
  - Production release ready
```

---

## CI/CD Integration (GitHub Actions)

Workflow: `.github/workflows/test.yml`
- **Lint & Type**: 1m (ESLint + TypeScript check)
- **Unit Tests**: 4m (all 3 components in parallel)
- **Integration Tests**: 5m (Gemini mock, SSE, filters)
- **E2E Tests**: 3m (Playwright voice flow)
- **Benchmarks**: 2m (latency + audio quality)
- **Total**: ~15min + coverage upload

Triggers: push to main/develop, all PRs

---

## References

- **Architecture**: `/docs/ARCHITECTURE.md` (9 Mermaid diagrams)
- **Testing Strategy**: `/TESTING_STRATEGY.md` (500+ lines, example test code)
- **Coverage Map**: `/docs/TEST_COVERAGE_MAP.md` (traceability + critical paths)
- **Brain Agent Issue**: Documented in `/TOOL_ERROR_INVESTIGATION_SUMMARY.md` (120s timeout root cause)

---

## Acceptance Criteria

- [ ] All Phase 1 tests passing (40% coverage, auth + audio)
- [ ] All Phase 2 tests passing (60% coverage, Gemini + Brain mocking)
- [ ] All Phase 3 tests passing (80% coverage, E2E + benchmarks)
- [ ] All Phase 4 tests passing (92% coverage, stress + calibration)
- [ ] CI/CD pipeline executes in <5min
- [ ] Documentation updated with test coverage reports
- [ ] Zero flaky tests (>100 consecutive runs, <2% failure rate)
- [ ] Performance baselines established & tracked

---

## Notes

- **Brain Agent Restart**: Before Phase 2, restart OpenCLAW brain agent at localhost:18789 to clear hung SSE state (documented in TOOL_ERROR_INVESTIGATION_SUMMARY.md)
- **Gemini API**: Live preview model (`gemini-3.1-flash-live-preview`) can have transient faults; reconnect logic tested extensively
- **Audio Calibration**: Will require device-specific tuning (iPhone speaker, Android phone, desktop USB mics) in Phase 4
- **Future Work**: Music ducking audio ducking feature depends on VAD implementation (can use existing Gemini VAD or build custom)

---

**Estimated Effort**: 5-6 weeks (40-50 hours)
**Priority**: High (blocks production release, impacts reliability)
**Assignee**: Michael Yagudaev
**Labels**: `testing`, `voiceclaw`, `automation`, `quality-assurance`
