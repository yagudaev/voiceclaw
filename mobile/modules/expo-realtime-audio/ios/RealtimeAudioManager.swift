import AVFoundation

/// Manages microphone capture and audio playback for realtime STS sessions.
/// Captures at device sample rate, downsamples to 24kHz PCM16 mono for OpenAI Realtime API.
/// Plays back 24kHz PCM16 mono audio received from the relay server.
class RealtimeAudioManager {
    private let targetSampleRate: Double = 24000
    private let chunkDurationMs: Double = 100 // Send audio in 100ms chunks

    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var isCapturing = false
    private var isPlaying = false

    private let onAudioCaptured: (String) -> Void
    private let onError: (String) -> Void

    // Playback format: 24kHz PCM16 mono (matches OpenAI Realtime output)
    private let playbackFormat: AVAudioFormat

    init(onAudioCaptured: @escaping (String) -> Void, onError: @escaping (String) -> Void) {
        self.onAudioCaptured = onAudioCaptured
        self.onError = onError
        self.playbackFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 24000,
            channels: 1,
            interleaved: true
        )!
    }

    func startCapture() throws {
        guard !isCapturing else { return }

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)

        let engine = AVAudioEngine()
        let inputNode = engine.inputNode
        let playerNode = AVAudioPlayerNode()

        engine.attach(playerNode)
        engine.connect(playerNode, to: engine.mainMixerNode, format: playbackFormat)

        let inputFormat = inputNode.outputFormat(forBus: 0)
        let inputSampleRate = inputFormat.sampleRate
        let downsampleRatio = inputSampleRate / targetSampleRate
        let samplesPerChunk = Int(targetSampleRate * chunkDurationMs / 1000) // 2400 samples per 100ms

        // Buffer for accumulating downsampled audio
        var accumulatedSamples: [Int16] = []
        accumulatedSamples.reserveCapacity(samplesPerChunk * 2)

        inputNode.installTap(onBus: 0, bufferSize: AVAudioFrameCount(inputSampleRate * chunkDurationMs / 1000), format: inputFormat) { [weak self] buffer, _ in
            guard let self = self, self.isCapturing else { return }
            guard let channelData = buffer.floatChannelData?[0] else { return }

            let frameCount = Int(buffer.frameLength)

            // Downsample to 24kHz and convert to Int16
            var i: Double = 0
            while Int(i) < frameCount {
                let idx = Int(i)
                let sample = channelData[idx]
                // Clamp and convert float32 → int16
                let clamped = max(-1.0, min(1.0, sample))
                let int16Val = Int16(clamped * 32767.0)
                accumulatedSamples.append(int16Val)

                if accumulatedSamples.count >= samplesPerChunk {
                    // Send chunk as base64
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

        try engine.start()
        playerNode.play()

        self.audioEngine = engine
        self.playerNode = playerNode
        self.isCapturing = true

        print("[RealtimeAudioManager] Capture started at \(inputSampleRate)Hz, downsampling to \(targetSampleRate)Hz")
    }

    func stopCapture() {
        guard isCapturing else { return }
        isCapturing = false

        audioEngine?.inputNode.removeTap(onBus: 0)
        playerNode?.stop()
        audioEngine?.stop()
        audioEngine = nil
        playerNode = nil

        print("[RealtimeAudioManager] Capture stopped")
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

        // Copy PCM16 data into the buffer
        data.withUnsafeBytes { rawPtr in
            guard let src = rawPtr.baseAddress?.assumingMemoryBound(to: Int16.self) else { return }
            guard let dst = buffer.int16ChannelData?[0] else { return }
            dst.update(from: src, count: sampleCount)
        }

        playerNode.scheduleBuffer(buffer)
        isPlaying = true
    }

    func stopPlayback() {
        playerNode?.stop()
        playerNode?.play() // Restart player node for future audio (stop clears scheduled buffers)
        isPlaying = false
    }
}
