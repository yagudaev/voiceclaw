import AVFoundation

class BargeInDetector {
    private var audioEngine: AVAudioEngine?
    private var isMonitoring = false
    private var onBargeIn: (() -> Void)?

    // Tunable thresholds — -18 dB is high enough to avoid TTS echo
    // but low enough to catch normal speech at arm's length
    private let powerThresholdDb: Float = -18.0
    private let sustainedDuration: TimeInterval = 0.2
    private var aboveThresholdSince: CFAbsoluteTime?

    func startMonitoring(onBargeIn: @escaping () -> Void) {
        guard !isMonitoring else { return }

        self.onBargeIn = onBargeIn

        // Ensure audio session has echo cancellation enabled
        configureAudioSession()

        let engine = AVAudioEngine()
        audioEngine = engine

        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        guard format.sampleRate > 0 else {
            print("[BargeInDetector] Invalid audio format — no mic available")
            return
        }

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.processBuffer(buffer)
        }

        engine.prepare()
        do {
            try engine.start()
            isMonitoring = true
            print("[BargeInDetector] Started monitoring (threshold: \(powerThresholdDb) dB, duration: \(sustainedDuration)s)")
        } catch {
            print("[BargeInDetector] Failed to start: \(error.localizedDescription)")
            cleanup()
        }
    }

    func stopMonitoring() {
        guard isMonitoring else { return }
        print("[BargeInDetector] Stopped monitoring")
        cleanup()
    }

    // MARK: - Helpers

    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            // voiceChat mode enables AEC so TTS echo is suppressed
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            print("[BargeInDetector] Audio session configured with AEC (voiceChat mode)")
        } catch {
            print("[BargeInDetector] Failed to configure audio session: \(error.localizedDescription)")
        }
    }

    private func processBuffer(_ buffer: AVAudioPCMBuffer) {
        let db = rmsDb(buffer)

        if db > powerThresholdDb {
            let now = CFAbsoluteTimeGetCurrent()
            if aboveThresholdSince == nil {
                aboveThresholdSince = now
            } else if now - aboveThresholdSince! >= sustainedDuration {
                print("[BargeInDetector] Voice detected (\(String(format: "%.1f", db)) dB) — triggering barge-in")
                DispatchQueue.main.async { [weak self] in
                    self?.stopMonitoring()
                    self?.onBargeIn?()
                }
            }
        } else {
            aboveThresholdSince = nil
        }
    }

    private func rmsDb(_ buffer: AVAudioPCMBuffer) -> Float {
        guard let data = buffer.floatChannelData else { return -100 }
        let samples = data.pointee
        let count = Int(buffer.frameLength)
        guard count > 0 else { return -100 }

        var sum: Float = 0
        for i in 0..<count {
            sum += samples[i] * samples[i]
        }

        let rms = sqrt(sum / Float(count))
        return 20 * log10(max(rms, 1e-10))
    }

    private func cleanup() {
        if let engine = audioEngine, engine.isRunning {
            engine.stop()
            engine.inputNode.removeTap(onBus: 0)
        }
        audioEngine = nil
        isMonitoring = false
        aboveThresholdSince = nil
        onBargeIn = nil
    }
}
