# VoiceClaw Architecture

## System Overview

```mermaid
graph TB
    subgraph clients["Client Applications"]
        mobile["📱 Mobile App<br/>(Expo/React Native)<br/>iOS & Android"]
        desktop["🖥️ Desktop App<br/>(Electron)<br/>macOS"]
    end

    subgraph relay["🔗 Relay Server<br/>(Node.js/TypeScript)"]
        ws["WebSocket Manager<br/>(Session Handler)"]
        auth["Auth & Validation"]
        tools["Tool System<br/>(brain, search, etc)"]
        db["SQLite Database<br/>(conversations, messages)"]
    end

    subgraph ai["AI & External Services"]
        gemini["🔮 Gemini Live API<br/>(WebSocket)"]
        brain["🧠 OpenCLAW Brain<br/>(localhost:18789)"]
        search["🔍 Search Tools"]
    end

    subgraph infrastructure["Infrastructure"]
        langfuse["📊 Langfuse<br/>(Observability)"]
        otel["📈 OpenTelemetry<br/>(Tracing)"]
        logs["📝 Logging System"]
    end

    %% Client to Relay
    mobile -->|"SSE/WebSocket<br/>Audio + Text"| ws
    desktop -->|"WebSocket<br/>Audio + Text + Screen"| ws

    %% Relay internal
    ws --> auth
    ws --> tools
    ws --> db

    %% Relay to AI
    tools -->|"HTTP SSE"| brain
    ws -->|"WebSocket<br/>Audio/Video/Control"| gemini

    %% Relay to Infrastructure
    tools --> langfuse
    ws --> otel
    ws --> logs
    gemini -.->|"Turn state"| otel

    %% Styling
    classDef client fill:#e1f5ff,stroke:#01579b,stroke-width:2px,color:#000
    classDef relay fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000
    classDef ai fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
    classDef infra fill:#f1f8e9,stroke:#33691e,stroke-width:2px,color:#000

    class mobile,desktop client
    class ws,auth,tools,db relay
    class gemini,brain,search ai
    class langfuse,otel,logs infra
```

---

## Voice Interaction Flow (Turn-Based)

```mermaid
sequenceDiagram
    participant User
    participant Mobile/Desktop as Mobile/Desktop App
    participant Relay as Relay Server
    participant Gemini as Gemini Live API
    participant Brain as OpenCLAW Brain

    User->>Mobile/Desktop: Tap Mic / Start Speaking
    activate Mobile/Desktop
    Mobile/Desktop->>Mobile/Desktop: Capture Audio<br/>(24kHz, 16-bit)
    Mobile/Desktop->>Relay: WebSocket: audioChunk<br/>(base64, 100ms frames)
    deactivate Mobile/Desktop

    activate Relay
    Relay->>Relay: State: LISTENING
    Relay->>Relay: Buffer & Validate Audio
    Relay->>Relay: State: PROCESSING
    deactivate Relay

    activate Gemini
    Relay->>Gemini: WebSocket: clientContent<br/>(audio + recentTranscript)
    Gemini->>Gemini: VAD + ASR Pipeline<br/>(Speech → Text)
    Gemini->>Relay: serverContent: inputTranscription<br/>(streaming user transcript)
    deactivate Gemini

    activate Relay
    Relay->>Brain: HTTP SSE: askBrain<br/>(user transcript + context)
    Brain->>Brain: Process Query<br/>(LLM inference)
    Brain->>Relay: SSE chunks: response text
    Relay->>Relay: Buffer Response
    deactivate Relay

    activate Gemini
    Relay->>Gemini: WebSocket: clientContent<br/>(assistant response text)
    Gemini->>Gemini: TTS Pipeline<br/>(Text → Audio)
    Gemini->>Relay: serverContent: outputAudio<br/>(PCM audio chunks)
    Gemini->>Relay: modelTurn: complete
    deactivate Gemini

    activate Relay
    Relay->>Relay: State: SPEAKING
    Relay->>Mobile/Desktop: WebSocket: audioChunk<br/>(response audio)
    deactivate Relay

    activate Mobile/Desktop
    Mobile/Desktop->>Mobile/Desktop: Decode Audio<br/>(PCM → WAV)
    Mobile/Desktop->>Mobile/Desktop: Play Audio<br/>(Web Audio API)
    Mobile/Desktop->>User: 🔊 User hears response
    deactivate Mobile/Desktop

    activate Relay
    Relay->>Relay: State: LISTENING<br/>(Ready for next turn)
    Relay->>Brain: POST /conversations<br/>(Save transcript + summary)
    deactivate Relay
```

---

## Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> AUTH: User connects<br/>WebSocket + Token

    AUTH --> IDLE: ✅ Token valid,<br/>session created

    IDLE --> LISTENING: User taps mic<br/>Audio starts flowing

    LISTENING --> PROCESSING: User stops speaking<br/>VAD detects silence

    PROCESSING --> SPEAKING: Gemini responses<br/>ready for TTS

    SPEAKING --> LISTENING: Response audio<br/>fully transmitted

    PROCESSING --> ERROR: Timeout > 120s<br/>Brain agent hung<br/>or network error

    SPEAKING --> ERROR: Gemini WebSocket<br/>close code 1006/1011<br/>transient fault

    LISTENING --> ERROR: Microphone permission<br/>denied or unavailable

    ERROR --> RECONNECT: Attempt transparent<br/>reconnection<br/>(max 2 retries)

    RECONNECT --> LISTENING: ✅ Reconnected,<br/>session resumed

    RECONNECT --> AUTH: ❌ Reconnect failed,<br/>restart session

    LISTENING --> IDLE: User closes app<br/>or logs out

    IDLE --> [*]: Session ended,<br/>data persisted
```

---

## Relay Server: Request Handling Pipeline

```mermaid
graph LR
    subgraph input["📥 Input"]
        A["WebSocket<br/>Message"]
    end

    subgraph validate["✅ Validation"]
        B["Parse JSON"]
        C["Verify Token"]
        D["Rate Limit"]
    end

    subgraph route["🔀 Routing"]
        E{Message Type?}
        F["audioChunk<br/>→ Gemini"]
        G["toolCall<br/>→ Brain/Search"]
        H["clientContent<br/>→ Store DB"]
    end

    subgraph process["⚙️ Processing"]
        I["Encode/Decode"]
        J["Buffer Mgmt"]
        K["Error Handling"]
    end

    subgraph output["📤 Output"]
        L["WebSocket<br/>Response"]
        M["Database<br/>Write"]
        N["Observability<br/>Events"]
    end

    A --> B --> C --> D --> E
    E -->|Audio| F
    E -->|Tool| G
    E -->|Status| H

    F --> I --> J --> K --> L
    G --> I --> J --> K --> L
    H --> M
    K --> N

    style input fill:#e3f2fd
    style validate fill:#f3e5f5
    style route fill:#fff3e0
    style process fill:#f1f8e9
    style output fill:#fce4ec
```

---

## Gemini Live API Integration Details

```mermaid
graph TB
    subgraph relay["Relay Server"]
        control["Control Layer<br/>(setupComplete, clientContent)"]
        audio["Audio Layer<br/>(48kHz → 24kHz)"]
        video["Video Layer<br/>(JPEG frames)"]
    end

    subgraph gemini["Gemini Live WebSocket<br/>wss://generativelanguage.googleapis.com/ws/"]
        setup["Setup Phase<br/>(1) auth token<br/>(2) model config<br/>(3) system prompt"]
        asr["ASR Pipeline<br/>User Audio → Transcript"]
        gen["Generation Pipeline<br/>Context → Response"]
        tts["TTS Pipeline<br/>Response Text → Audio"]
    end

    subgraph recovery["Recovery Mechanisms"]
        reconnect["Transparent Reconnect<br/>Close codes: 1001,1006,1007,1011,1012,1013"]
        resume["Session Resume<br/>Handle-based checkpoint"]
        poison["Poisoned Handle Detection<br/>ASR alive + Gen stuck<br/>→ Fresh session"]
    end

    control -->|"auth + setupComplete"| setup
    audio -->|"audioContent"| asr
    video -->|"screenContent"| gen
    asr -->|"inputTranscription"| gen
    gen -->|"text + constraints"| tts
    tts -->|"outputAudio"| audio

    gen -->|"watchdog_timeout"| recovery
    asr -->|"POST_RESUME_GENERATION_TIMEOUT"| poison
    control -->|"goAway detected"| reconnect

    style relay fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style gemini fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style recovery fill:#ffebee,stroke:#c62828,stroke-width:2px
```

---

## Audio Pipeline: Desktop App (Electron)

```mermaid
graph LR
    subgraph capture["🎤 Capture"]
        A["Navigator.mediaDevices<br/>.getUserMedia"]
        B["AudioContext"]
        C["ScriptProcessor<br/>or AudioWorklet"]
    end

    subgraph process["⚙️ Processing"]
        D["High-Pass Filter<br/>(80 Hz)"]
        E["Notch Filter<br/>(60 Hz)"]
        F["RMS Computation<br/>for Level Meter"]
    end

    subgraph encode["📦 Encode"]
        G["Float32 → PCM<br/>(-32768 to 32767)"]
        H["Base64 Encode"]
        I["100ms Frame<br/>≈ 2400 samples"]
    end

    subgraph send["📤 Send"]
        J["WebSocket<br/>audioChunk"]
        K["to Relay Server"]
    end

    A --> B --> C --> D --> E --> F --> G --> H --> I --> J --> K

    subgraph playback["🔊 Playback"]
        L["Base64 Decode"]
        M["PCM → Float32"]
        N["Web Audio Playback<br/>Gain + Pan nodes"]
        O["Speaker Output"]
    end

    K -.->|"response audio<br/>from relay"| L --> M --> N --> O

    style capture fill:#e3f2fd,stroke:#01579b
    style process fill:#f1f8e9,stroke:#33691e
    style encode fill:#fff3e0,stroke:#e65100
    style send fill:#f3e5f5,stroke:#4a148c
    style playback fill:#fce4ec,stroke:#880e4f
```

---

## Mobile App (Expo/React Native) Architecture

```mermaid
graph TB
    subgraph ui["🎨 UI Layer"]
        nav["Expo Router<br/>Navigation"]
        screen["Chat Screen<br/>(Messages + Controls)"]
        modal["Settings Modal<br/>(Device, Voice)"]
    end

    subgraph state["📊 State Management"]
        context["React Context<br/>(ConversationContext)"]
        sqlite["SQLite Storage<br/>(expo-sqlite)"]
    end

    subgraph media["📻 Media Layer"]
        mic["Microphone Permission<br/>+ Audio Capture"]
        speaker["Speaker Output<br/>+ Audio Queue"]
        sse["SSE Client<br/>(react-native-sse)"]
    end

    subgraph network["🌐 Network"]
        ws["WebSocket<br/>to Relay"]
        http["HTTP Requests<br/>(Settings, History)"]
    end

    screen --> context
    modal --> context
    context --> sqlite

    screen --> mic
    mic --> sse
    sse --> ws

    speaker --> context
    context --> speaker

    ws --> http
    http --> context

    style ui fill:#e3f2fd,stroke:#01579b,stroke-width:2px
    style state fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    style media fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style network fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

---

## Real-Time Observability: Turn State Tracing

```mermaid
graph LR
    subgraph states["🎯 Turn States"]
        S1["LISTENING<br/>Waiting for audio"]
        S2["PROCESSING<br/>Gemini + Brain work"]
        S3["SPEAKING<br/>Playing response"]
    end

    subgraph events["📡 Trace Events"]
        E1["turn_started"]
        E2["audio_received"]
        E3["transcript_ready"]
        E4["tool_called"]
        E5["response_complete"]
        E6["audio_playing"]
    end

    subgraph metrics["📊 Metrics Captured"]
        M1["latency_listening_ms"]
        M2["latency_processing_ms"]
        M3["latency_speaking_ms"]
        M4["gemini_roundtrip_ms"]
        M5["brain_latency_ms"]
        M6["audio_buffer_size"]
    end

    S1 -->|"user speaks"| E2
    S1 -->|"silence detected"| S2
    S2 -->|"transcript ready"| E3
    S2 -->|"tool invoked"| E4
    S2 -->|"response text ready"| S3
    S3 -->|"audio complete"| E6
    S3 -->|"user interrupts"| S1

    E1 --> M1
    E3 --> M2
    E6 --> M3
    E4 --> M5

    all["All events logged to Langfuse<br/>+ OpenTelemetry"]

    E1 --> all
    E2 --> all
    E3 --> all
    E4 --> all
    E5 --> all
    E6 --> all

    style states fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style events fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style metrics fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style all fill:#ffe0b2,stroke:#e65100,stroke-width:2px
```

---

## Error Recovery: Poisoned Handle Detection

```mermaid
graph TD
    A["Session Active<br/>ASR + Generation Pipelines"]

    B["Gemini sends<br/>goAway signal"]

    C["Relay initiates<br/>resumption with handle"]

    D{Check Post-Resume<br/>State}

    E["inputTranscription received<br/>ASR pipeline alive"]

    F{Generation<br/>Pipeline Output?}

    G["❌ NO output for 8s<br/>Poisoned handle detected"]

    H["✅ YES output received<br/>Normal recovery"]

    I["🔄 Force Fresh Session<br/>no handle parameter"]

    J["Resume Normal<br/>Operation"]

    K["Connection re-established<br/>Session continues"]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F -->|No| G
    F -->|Yes| H
    G --> I
    H --> J
    I --> K
    J --> K

    style A fill:#e8f5e9
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#fce4ec
    style E fill:#e3f2fd
    style F fill:#fce4ec
    style G fill:#ffebee,stroke:#c62828,stroke-width:2px
    style H fill:#e8f5e9
    style I fill:#ffccbc,stroke:#d84315,stroke-width:2px
    style J fill:#e8f5e9
    style K fill:#a5d6a7,stroke:#1b5e20,stroke-width:2px
```

---

## Data Flow: Message Persistence

```mermaid
graph LR
    subgraph session["Active Session"]
        A["User Audio<br/>Input"]
        B["Gemini ASR<br/>Transcript"]
        C["Brain Response<br/>Text"]
        D["Gemini TTS<br/>Output Audio"]
    end

    subgraph relay["Relay Server<br/>Memory"]
        E["Transcript Buffer<br/>role + text"]
        F["Summary Builder<br/>Turn-based"]
    end

    subgraph db["SQLite Database"]
        G["conversations<br/>table"]
        H["messages<br/>table"]
        I["conversation_summaries<br/>table"]
    end

    A --> E
    B --> E
    C --> E
    D --> E

    E --> F
    F -.->|"on disconnect"| H
    F -.->|"periodic"| I

    H --> G
    I --> G

    style session fill:#e3f2fd,stroke:#01579b
    style relay fill:#f3e5f5,stroke:#4a148c
    style db fill:#fff3e0,stroke:#e65100

    note["📝 Key Detail: Multiple summaries<br/>per conversation allowed<br/>for historical tracking"]
```

---

## Performance Targets & Latency Budgets

```mermaid
gantt
    title Voice Interaction Latency Budget (Ideal <2s total)
    dateFormat YYYY-MM-DD

    section Desktop Capture
    Audio capture to buffer :a1, 2026-01-01, 50ms
    Encode base64 :a2, after a1, 20ms
    WebSocket send :a3, after a2, 10ms

    section Relay Processing
    Parse & validate :b1, after a3, 30ms
    Forward to Gemini :b2, after b1, 10ms

    section Gemini ASR
    Audio buffering :c1, after b2, 100ms
    Speech recognition :c2, after c1, 300ms
    Send transcript :c3, after c2, 20ms

    section Brain Processing
    Relay receives transcript :d1, after c3, 10ms
    Ask brain agent :d2, after d1, 20ms
    Brain inference :d3, after d2, 800ms
    Response text ready :d4, after d3, 20ms

    section Gemini TTS
    Text to audio synthesis :e1, after d4, 200ms
    Audio ready :e2, after e1, 20ms

    section Client Playback
    Relay sends audio :f1, after e2, 10ms
    Receive & decode :f2, after f1, 30ms
    Play audio :f3, after f2, 100ms
```

**Latency Breakdown:**
- **Ideal total**: ~1.6 seconds (user hears response)
- **Critical path**: ASR (300ms) + Brain (800ms) + TTS (200ms)
- **Tail latency** (p95): ~2.5s (network jitter + GC pauses)
- **Unacceptable** (>5s): Triggers "thinking" UI state

---

## Technology Stack Summary

| Component | Technology | Why |
|-----------|-----------|-----|
| **Relay Server** | Node.js + TypeScript + Express 5.1 | Fast async I/O, WebSocket-native |
| **Mobile** | Expo SDK 55 + React Native | iOS/Android code sharing, quick iteration |
| **Desktop** | Electron 41.2.1 + Vite + React 19 | Native app feel, access to microphone/screen |
| **Audio API** | Web Audio API (desktop), media-recorder-api (mobile) | Low-latency, cross-platform |
| **Database** | SQLite (desktop) + SQLite (mobile via expo-sqlite) | Local persistence, no network dependency |
| **AI Models** | Gemini 3.1 Flash Live + OpenCLAW Brain | Real-time voice, custom logic |
| **Observability** | Langfuse + OpenTelemetry | Turn-state tracing, performance monitoring |
| **Audio Filtering** | biquadjs (high-pass, notch) | Client-side noise reduction |

---

**Last Updated**: 2026-04-20
**Architecture Owner**: Michael Yagudaev
