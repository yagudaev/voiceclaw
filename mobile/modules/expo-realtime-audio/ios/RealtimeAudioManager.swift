import AVFoundation

/// Manages microphone capture and audio playback for realtime STS sessions.
/// Captures at device sample rate, downsamples to 24kHz PCM16 mono for OpenAI Realtime API.
/// Plays back 24kHz PCM16 mono audio received from the relay server.
///
/// Echo cancellation strategy:
/// - AVAudioSession .videoChat mode — hardware AEC with moderate speaker AGC
/// - Float32 format + AVAudioUnitEQ (+12dB) compensates for volume reduction
/// - Energy threshold gate: during playback, only forward audio above a threshold
///   (real speech is louder than echo bouncing off the speaker)
/// - Sends silence frames during gated periods to keep the stream alive
class RealtimeAudioManager {
    private let targetSampleRate: Double = 24000
    private let chunkDurationMs: Double = 100 // Send audio in 100ms chunks

    // Echo gate: RMS threshold during playback. Speech is typically 0.05-0.3,
    // speaker echo with .default mode is typically 0.01-0.05. Tune as needed.
    private var echoGateEnabled: Bool = true
    private var echoGateThreshold: Float = 0.06

    // Debug: emit RMS metrics to JS when enabled
    private var debugMetricsEnabled: Bool = false

    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var eqNode: AVAudioUnitEQ?
    private var isCapturing = false
    private var playbackBufferCount: Int = 0
    private var lastPlaybackTime: CFAbsoluteTime = 0
    private var softwareGain: Float = 1.0

    private let onAudioCaptured: (String) -> Void
    private let onError: (String) -> Void
    private let onLog: (String) -> Void
    private let onRmsMetrics: (Float, Bool, Bool, Float, String) -> Void

    // Playback format: 24kHz Float32 mono (AVAudioEngine works best with Float32)
    private let playbackFormat: AVAudioFormat

    init(
        onAudioCaptured: @escaping (String) -> Void,
        onError: @escaping (String) -> Void,
        onLog: @escaping (String) -> Void,
        onRmsMetrics: @escaping (Float, Bool, Bool, Float, String) -> Void
    ) {
        self.onAudioCaptured = onAudioCaptured
        self.onError = onError
        self.onLog = onLog
        self.onRmsMetrics = onRmsMetrics
        self.playbackFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: 24000,
            channels: 1,
            interleaved: false
        )!
    }

    func startCapture() throws {
        guard !isCapturing else { return }

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .videoChat, options: [.allowBluetooth])
        try session.setActive(true)

        // AEC without .voiceChat's aggressive speaker AGC
        if #available(iOS 18.2, *) {
            try session.setPrefersEchoCancelledInput(true)
            self.onLog("[RealtimeAudioManager] setPrefersEchoCancelledInput: true")
        }

        self.onLog("[RealtimeAudioManager] System volume: \(session.outputVolume), route: \(session.currentRoute.outputs.map { $0.portName })")

        let engine = AVAudioEngine()
        let inputNode = engine.inputNode
        let playerNode = AVAudioPlayerNode()

        // EQ node for reliable gain boost (+12dB)
        let eq = AVAudioUnitEQ(numberOfBands: 0)
        eq.globalGain = 12 // +12 dB — the only reliable amplification in AVAudioEngine

        engine.attach(playerNode)
        engine.attach(eq)
        engine.connect(playerNode, to: eq, format: playbackFormat)
        engine.connect(eq, to: engine.mainMixerNode, format: playbackFormat)

        let inputFormat = inputNode.outputFormat(forBus: 0)
        let inputSampleRate = inputFormat.sampleRate
        self.onLog("[RealtimeAudioManager] Input format: sampleRate=\(inputSampleRate) channels=\(inputFormat.channelCount)")

        guard inputSampleRate > 0 else {
            throw NSError(domain: "RealtimeAudioManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid input sample rate: \(inputSampleRate)"])
        }

        let downsampleRatio = inputSampleRate / targetSampleRate
        let samplesPerChunk = Int(targetSampleRate * chunkDurationMs / 1000) // 2400 samples per 100ms

        // Pre-computed silence chunk to send when echo gate is active
        let silenceData = Data(count: samplesPerChunk * MemoryLayout<Int16>.size)
        let silenceBase64 = silenceData.base64EncodedString()

        // Buffer for accumulating downsampled audio
        var accumulatedSamples: [Int16] = []
        accumulatedSamples.reserveCapacity(samplesPerChunk * 2)

        var tapCallCount = 0
        var gatedCount = 0
        inputNode.installTap(onBus: 0, bufferSize: AVAudioFrameCount(inputSampleRate * chunkDurationMs / 1000), format: inputFormat) { [weak self] buffer, _ in
            guard let self = self, self.isCapturing else { return }
            guard let channelData = buffer.floatChannelData?[0] else { return }

            let frameCount = Int(buffer.frameLength)

            // Calculate RMS energy of this buffer
            var sumSquares: Float = 0
            for j in 0..<frameCount { sumSquares += channelData[j] * channelData[j] }
            let rms = sqrt(sumSquares / Float(frameCount))

            let playbackActive = self.isPlaybackActive
            let gateEnabled = self.echoGateEnabled
            let threshold = self.echoGateThreshold
            let gated = gateEnabled && playbackActive && rms < threshold

            tapCallCount += 1
            if tapCallCount <= 5 {
                self.onLog("[RealtimeAudioManager] Tap #\(tapCallCount): frames=\(frameCount) rms=\(String(format: "%.4f", rms)) playback=\(playbackActive) gateEnabled=\(gateEnabled)")
            }

            // Emit RMS metrics for debug overlay
            if self.debugMetricsEnabled {
                let route = AVAudioSession.sharedInstance().currentRoute.outputs.first?.portName ?? "unknown"
                self.onRmsMetrics(rms, playbackActive, gated, threshold, route)
            }

            // Echo gate: during active playback, only forward audio above threshold
            if gated {
                gatedCount += 1
                if gatedCount <= 3 {
                    self.onLog("[RealtimeAudioManager] Echo gate: rms=\(String(format: "%.4f", rms)) < \(threshold), sending silence")
                }
                // Send silence to keep the audio stream alive
                self.onAudioCaptured(silenceBase64)
                return
            }

            // Downsample to 24kHz and convert to Int16
            var i: Double = 0
            while Int(i) < frameCount {
                let idx = Int(i)
                let sample = channelData[idx]
                let clamped = max(-1.0, min(1.0, sample))
                let int16Val = Int16(clamped * 32767.0)
                accumulatedSamples.append(int16Val)

                if accumulatedSamples.count >= samplesPerChunk {
                    let data = accumulatedSamples.withUnsafeBufferPointer { ptr in
                        Data(buffer: ptr)
                    }
                    let base64 = data.base64EncodedString()
                    self.onAudioCaptured(base64)
                    accumulatedSamples.removeAll(keepingCapacity: true)
                }

                i += downsampleRatio
            }
        }

        // Handle audio session interruptions
        NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self = self else { return }
            guard let info = notification.userInfo,
                  let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }

            if type == .ended {
                self.onLog("[RealtimeAudioManager] Audio session interruption ended, restarting engine")
                try? self.audioEngine?.start()
            }
        }

        try engine.start()
        playerNode.play()

        self.audioEngine = engine
        self.playerNode = playerNode
        self.eqNode = eq
        self.isCapturing = true

        self.onLog("[RealtimeAudioManager] Capture started at \(inputSampleRate)Hz, downsampling to \(targetSampleRate)Hz, echoGate=\(echoGateThreshold), eqGain=\(eq.globalGain)dB")
    }

    func stopCapture() {
        guard isCapturing else { return }
        isCapturing = false

        NotificationCenter.default.removeObserver(self, name: AVAudioSession.interruptionNotification, object: nil)
        audioEngine?.inputNode.removeTap(onBus: 0)
        playerNode?.stop()
        audioEngine?.stop()
        audioEngine = nil
        playerNode = nil
        eqNode = nil

        self.onLog("[RealtimeAudioManager] Capture stopped")
    }

    func playAudio(base64Data: String) {
        guard let data = Data(base64Encoded: base64Data) else {
            onError("Invalid base64 audio data")
            return
        }
        guard let playerNode = self.playerNode, let engine = self.audioEngine else { return }
        guard engine.isRunning else { return }

        let sampleCount = data.count / MemoryLayout<Int16>.size

        guard let buffer = AVAudioPCMBuffer(pcmFormat: playbackFormat, frameCapacity: AVAudioFrameCount(sampleCount)) else {
            return
        }
        buffer.frameLength = AVAudioFrameCount(sampleCount)

        // Convert incoming PCM16 to Float32 with software gain
        data.withUnsafeBytes { rawPtr in
            guard let src = rawPtr.baseAddress?.assumingMemoryBound(to: Int16.self) else { return }
            guard let dst = buffer.floatChannelData?[0] else { return }
            let gain = self.softwareGain
            for i in 0..<sampleCount {
                var sample = Float(src[i]) / 32768.0
                if gain != 1.0 {
                    sample *= gain
                }
                dst[i] = max(-1.0, min(1.0, sample))
            }
        }

        playbackBufferCount += 1
        lastPlaybackTime = CFAbsoluteTimeGetCurrent()

        playerNode.scheduleBuffer(buffer) { [weak self] in
            self?.playbackBufferCount -= 1
        }
    }

    /// True if audio is actively being played back through the speaker
    private var isPlaybackActive: Bool {
        // Active if buffers are queued OR we received audio very recently (within 200ms)
        if playbackBufferCount > 0 { return true }
        let elapsed = CFAbsoluteTimeGetCurrent() - lastPlaybackTime
        return elapsed < 0.2
    }

    func stopPlayback() {
        playerNode?.stop()
        playerNode?.play() // Restart player node for future audio (stop clears scheduled buffers)
        playbackBufferCount = 0
    }

    func setVolume(_ volume: Float) {
        softwareGain = volume
    }

    func setEchoGateEnabled(_ enabled: Bool) {
        echoGateEnabled = enabled
        onLog("[RealtimeAudioManager] Echo gate \(enabled ? "enabled" : "disabled")")
    }

    func setEchoGateThreshold(_ threshold: Float) {
        echoGateThreshold = threshold
        onLog("[RealtimeAudioManager] Echo gate threshold set to \(String(format: "%.4f", threshold))")
    }

    func setDebugMetricsEnabled(_ enabled: Bool) {
        debugMetricsEnabled = enabled
    }
}
