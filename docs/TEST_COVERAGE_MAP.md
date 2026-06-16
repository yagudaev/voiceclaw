# VoiceClaw Test Coverage Map

This document maps each testing strategy to the architecture components it validates.

---

## Unit Tests → Components

```mermaid
graph TB
    subgraph ut["🧪 Unit Tests"]
        auth["auth.ts<br/>Token validation"]
        audio["AudioEngine<br/>Capture & playback"]
        screen["ScreenCapture<br/>IPC abstraction"]
        filter["Audio Filters<br/>High-pass/Notch"]
    end

    subgraph comp["🏗️ Components"]
        relay["Relay Server<br/>Auth layer"]
        desktop["Desktop App<br/>Audio pipeline"]
        desktop2["Desktop App<br/>Screen sharing"]
        dsp["Audio DSP<br/>Processing"]
    end

    auth -->|"validates token"| relay
    audio -->|"captures mic"| desktop
    screen -->|"requests frames"| desktop2
    filter -->|"removes noise"| dsp

    style ut fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style comp fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

---

## Integration Tests → Adapters & Services

```mermaid
graph TB
    subgraph it["🔗 Integration Tests"]
        brain["Brain Tool SSE<br/>Timeout handling"]
        gemini["Gemini Adapter<br/>WebSocket mock"]
        session["Session Manager<br/>Transcript persistence"]
        db["Database<br/>Message storage"]
    end

    subgraph services["🛠️ Services"]
        brainAgent["OpenCLAW Brain<br/>120s timeout"]
        geminiWs["Gemini Live WS<br/>Reconnection logic"]
        relay["Relay Server<br/>Session handling"]
        sqlite["SQLite<br/>Conversations table"]
    end

    brain -->|"tests askBrain"| brainAgent
    gemini -->|"mocks WebSocket"| geminiWs
    session -->|"validates cleanup"| relay
    db -->|"validates writes"| sqlite

    style it fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style services fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

---

## E2E Tests → Complete Flows

```mermaid
graph TB
    subgraph e2e["🎬 E2E Tests"]
        voice["Complete Voice Flow<br/>Mic → Relay → Gemini → Speaker"]
        reconnect["Gemini Reconnection<br/>Auto-resume on close"]
        music["Music + Ducking<br/>Background audio + speech"]
        error["Error Recovery<br/>Timeout → retry"]
    end

    subgraph flows["🔀 User Flows"]
        f1["User speaks → hears response"]
        f2["Network drop → auto-reconnect"]
        f3["Music playing → ducked during speech"]
        f4["Brain hangs → graceful timeout"]
    end

    voice -->|"validates"| f1
    reconnect -->|"validates"| f2
    music -->|"validates"| f3
    error -->|"validates"| f4

    style e2e fill:#e3f2fd,stroke:#01579b,stroke-width:2px
    style flows fill:#fce4ec,stroke:#880e4f,stroke-width:2px
```

---

## Test Coverage by Architecture Layer

```mermaid
graph LR
    subgraph layers["🏢 Architecture Layers"]
        UI["UI Layer"]
        STATE["State Mgmt"]
        NET["Network"]
        PROCESS["Processing"]
        DB["Database"]
    end

    subgraph coverage["Test Coverage"]
        U1["Component tests<br/>Chat screen interactions"]
        S1["Context tests<br/>State mutations"]
        N1["WebSocket mock tests<br/>Message flow"]
        P1["Audio filter tests<br/>Signal processing"]
        D1["Integration tests<br/>Persistence"]
    end

    UI -.-> U1
    STATE -.-> S1
    NET -.-> N1
    PROCESS -.-> P1
    DB -.-> D1

    U1 -->|"React Testing Lib"| UI
    S1 -->|"Jest mocks"| STATE
    N1 -->|"jest-mock-extended"| NET
    P1 -->|"FFT analysis"| PROCESS
    D1 -->|"Supertest"| DB

    style layers fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style coverage fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

---

## Audio Quality Testing Pipeline

```mermaid
graph TB
    subgraph input["📥 Test Inputs"]
        clean["Clean speech<br/>(female/male)"]
        noisy["Noisy speech<br/>(background)"]
        music["Music + speech<br/>(ducking test)"]
    end

    subgraph tests["🧪 Quality Tests"]
        snr["SNR Analysis<br/>(Signal-to-Noise)"]
        pesq["PESQ Scoring<br/>(Intelligibility)"]
        latency["Latency Measurement<br/>(End-to-end)"]
        jitter["Jitter Analysis<br/>(Consistency)"]
    end

    subgraph validation["✅ Validation"]
        v1["SNR > 40dB"]
        v2["PESQ > 3.5"]
        v3["Latency < 100ms avg"]
        v4["Jitter < 10ms"]
    end

    clean --> snr
    noisy --> snr
    music --> pesq

    snr --> v1
    pesq --> v2
    latency --> v3
    jitter --> v4

    music --> latency
    clean --> jitter

    style input fill:#e3f2fd,stroke:#01579b
    style tests fill:#fff3e0,stroke:#e65100
    style validation fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
```

---

## Testing Critical Paths

### Path 1: User Speaks → Response Heard
```mermaid
graph LR
    A["🎤 Mic Input"] -->|Unit: AudioEngine| B["Audio Captured"]
    B -->|Unit: Filters| C["Audio Cleaned"]
    C -->|Int: WebSocket Mock| D["Relay Received"]
    D -->|Int: Gemini Mock| E["ASR Complete"]
    E -->|Int: Brain Mock| F["Response Ready"]
    F -->|Int: TTS Mock| G["Audio Synthesized"]
    G -->|Unit: Playback| H["🔊 Speaker Output"]

    style A fill:#e3f2fd
    style H fill:#e3f2fd
    style B fill:#fff3e0
    style C fill:#fff3e0
    style D fill:#f3e5f5
    style E fill:#f3e5f5
    style F fill:#f3e5f5
    style G fill:#f3e5f5
```

**Tests covering this path:**
- `AudioEngine.test.ts` — ✅ Capture RMS, filter output
- `audio-quality.test.ts` — ✅ PESQ scoring
- `brain.test.ts` — ✅ SSE stream parsing
- `gemini.test.ts` — ✅ WebSocket sequencing
- `e2e/voice-interaction.spec.ts` — ✅ Full flow (Playwright)

---

### Path 2: Network Drop → Reconnect
```mermaid
graph LR
    A["📡 Active Session"] -->|Gemini detects| B["WebSocket Close<br/>code 1006"]
    B -->|Relay handles| C["Transparent Reconnect<br/>attempt 1"]
    C -->|Gemini responds| D{Handle Valid?}
    D -->|No| E["Poisoned Handle<br/>Detected"]
    E -->|Fresh Session| F["Reconnect attempt 2"]
    F -->|Success| G["✅ Session Resumed"]

    D -->|Yes| G

    style A fill:#e8f5e9
    style B fill:#ffebee,stroke:#c62828,stroke-width:2px
    style C fill:#fff3e0
    style E fill:#ffccbc,stroke:#d84315,stroke-width:2px
    style F fill:#fff3e0
    style G fill:#a5d6a7,stroke:#1b5e20,stroke-width:2px
```

**Tests covering this path:**
- `gemini.test.ts` — ✅ WebSocket close handling
- `gemini.test.ts` — ✅ Poisoned handle detection (POST_RESUME_GENERATION_TIMEOUT)
- `e2e/voice-interaction.spec.ts` — ✅ Manual connection drop + auto-resume

---

### Path 3: Music Ducking During Speech
```mermaid
graph LR
    A["🎵 Background Music"] -->|Background| B["Constant -20dB"]
    C["🎤 User Speech"] -->|VAD Trigger| D["Ducking Active"]
    B --> E["Music Level Reduced"]
    D --> E
    E -->|Mix| F["(-6dB during speech)"]
    F -->|Smooth Envelope| G["No Clicks/Artifacts"]

    style A fill:#fff3e0
    style C fill:#fff3e0
    style B fill:#fff3e0
    style D fill:#f3e5f5
    style E fill:#e8f5e9
    style F fill:#e8f5e9
    style G fill:#a5d6a7,stroke:#1b5e20,stroke-width:2px
```

**Tests covering this path:**
- `audio-ducking.test.ts` — ✅ RMS reduction measurement
- `audio-ducking.test.ts` — ✅ Smooth attack/release (click detection)
- `audio-quality.test.ts` — ✅ Simultaneous playback latency
- `e2e/voice-interaction.spec.ts` — ✅ Background audio ducking (with injected music)

---

### Path 4: Brain Agent Timeout
```mermaid
graph LR
    A["Query Sent"] -->|askBrain| B["SSE Stream Opens"]
    B -->|Wait| C["⏱️ 120s timeout"]
    C -->|No Data| D["readCount=0"]
    D -->|Controller abort| E["🔴 Error: local 120s timeout"]
    E -->|Relay handles| F["Display error to user<br/>Suggest retry"]
    F -->|User retries| G["New session<br/>Fresh attempt"]

    style A fill:#fff3e0
    style B fill:#fff3e0
    style C fill:#ffebee,stroke:#c62828,stroke-width:1px
    style D fill:#ffebee,stroke:#c62828,stroke-width:1px
    style E fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style F fill:#fff3e0
    style G fill:#a5d6a7,stroke:#1b5e20,stroke-width:2px
```

**Tests covering this path:**
- `brain.test.ts` — ✅ SSE timeout on no data
- `brain.test.ts` — ✅ Malformed SSE frame recovery
- `session.test.ts` — ✅ Error state cleanup
- `turn-states.test.ts` — ✅ Latency timing verification

---

## Test-to-Component Traceability Matrix

| Component | Unit | Integration | E2E | Performance | Coverage |
|-----------|------|-------------|-----|-------------|----------|
| **Relay Server** |
| auth.ts | ✅ auth.test.ts | — | — | — | 100% |
| brain.ts | — | ✅ brain.test.ts | ✅ e2e | ✅ latency.test | 90% |
| gemini.ts | — | ✅ gemini.test.ts | ✅ e2e | ✅ benchmark | 85% |
| session.ts | — | ✅ session.test.ts | ✅ e2e | — | 80% |
| **Desktop App** |
| AudioEngine | ✅ audio-engine.test | — | ✅ e2e | ✅ latency | 95% |
| Filters | ✅ filter.test.ts | — | ✅ e2e | ✅ audio-quality | 100% |
| ScreenCapture | ✅ screen.test.ts | — | — | — | 100% |
| **Mobile App** |
| ChatPage | ✅ ChatPage.test | — | ✅ e2e | — | 85% |
| useRealtime | — | ✅ websocket.test | ✅ e2e | ✅ jitter | 75% |

---

## Test Execution Timeline

```mermaid
gantt
    title CI/CD Test Pipeline (GitHub Actions)
    dateFormat HH:mm

    section Lint & Type
    ESLint relay-server :lint1, 00:00, 30s
    TypeScript check relay :tsc1, 00:30, 1m
    ESLint desktop :lint2, after tsc1, 20s
    TypeScript check desktop :tsc2, after lint2, 1m

    section Unit Tests
    Relay unit tests :unit1, after tsc2, 2m
    Desktop unit tests :unit2, after unit1, 90s
    Mobile unit tests :unit3, after unit2, 1m

    section Integration Tests
    Relay integration :int1, after unit3, 3m
    Audio quality :int2, after int1, 2m

    section E2E Tests
    Voice interaction E2E :e2e1, after int2, 5m
    Reconnection E2E :e2e2, after e2e1, 3m

    section Report
    Coverage upload :report, after e2e2, 30s
    Benchmark comment :bench, after report, 20s

    milestone Goal: 15min max, after bench, 0m
```

**Total CI time target**: <15 minutes

---

## Coverage Goals by Phase

### Phase 1: Foundation (Week 1-2)
```
Relay-Server:     40% (auth, basic routing)
Desktop:          35% (AudioEngine, filters)
Mobile:           20% (UI components only)
Overall:          35%
```

### Phase 2: Integration (Week 3-4)
```
Relay-Server:     65% (Gemini adapter, session)
Desktop:          60% (all audio paths)
Mobile:           50% (WebSocket, state)
Overall:          60%
```

### Phase 3: Quality (Week 5-6)
```
Relay-Server:     80% (error paths, recovery)
Desktop:          85% (E2E paths tested)
Mobile:           75% (complete flows)
Overall:          80%
```

### Phase 4: Optimization (Week 7+)
```
Relay-Server:     90% (stress tests added)
Desktop:          95% (performance profiling)
Mobile:           90% (device-specific tests)
Overall:          92%
```

---

## How to Read This Map

1. **Find your component** in the Component sections
2. **Identify the tests** that cover it
3. **Check the critical path** that uses that component
4. **Run the specific test suite** for local iteration
5. **Verify CI coverage** in the matrix

**Example**: Testing audio ducking?
- Look at "Path 3: Music Ducking During Speech"
- Find the 4 test files that cover it
- Run `npm test -- audio-ducking.test.ts` locally
- Check coverage matrix for "Filters" row

---

**Last Updated**: 2026-04-20
**Test Architect**: Michael Yagudaev
