import AVFoundation

/// Callback interface for AudioCoordinator events sent back to the Expo module.
protocol AudioCoordinatorDelegate: AnyObject {
    func audioCoordinatorDidReceivePartialTranscript(_ text: String)
    func audioCoordinatorDidReceiveFinalTranscript(_ text: String)
    func audioCoordinatorDidStartTTS()
    func audioCoordinatorDidCompleteTTS()
    func audioCoordinatorDidError(_ message: String)
    func audioCoordinatorDidBargeIn()
}

/// Owns the full audio lifecycle: STT, TTS, VAD/barge-in detection.
///
/// Queues speak requests so sentences play one at a time (prevents
/// overlapping audio from providers that don't queue internally).
///
/// When barge-in fires the coordinator atomically stops TTS, stops VAD,
/// starts STT, and emits `onBargeIn` -- no JS bridge round trip required.
class AudioCoordinator {
    weak var delegate: AudioCoordinatorDelegate?

    private(set) var sttProvider: STTProvider?
    private(set) var ttsProvider: TTSProvider?
    private let bargeInDetector = BargeInDetector()
    private var bargeInEnabled = false

    // TTS speak queue — ensures sentences play sequentially
    private var speakQueue: [String] = []
    private var isSpeakingCurrent = false
    // Tracks recently spoken text so providers can use it for prosodic context
    private var spokenHistory = ""

    // MARK: - Provider setup

    func setSTTProvider(_ provider: STTProvider?) {
        sttProvider = provider
    }

    func setTTSProvider(_ provider: TTSProvider?) {
        ttsProvider = provider
    }

    // MARK: - Audio session

    func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth]
            )
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("[AudioCoordinator] Failed to configure audio session: \(error.localizedDescription)")
        }
    }

    // MARK: - STT

    func startListening() {
        configureAudioSession()
        sttProvider?.startListening(
            onPartialResult: { [weak self] text in
                self?.delegate?.audioCoordinatorDidReceivePartialTranscript(text)
            },
            onFinalResult: { [weak self] text in
                self?.delegate?.audioCoordinatorDidReceiveFinalTranscript(text)
            }
        )
    }

    func stopListening() {
        sttProvider?.stopListening()
    }

    // MARK: - TTS

    func speak(text: String) {
        speakQueue.append(text)
        speakNextIfIdle()
    }

    func stopSpeaking() {
        speakQueue.removeAll()
        isSpeakingCurrent = false
        spokenHistory = ""
        ttsProvider?.stop()
    }

    // MARK: - Barge-in

    func setBargeInEnabled(_ enabled: Bool) {
        bargeInEnabled = enabled
        if enabled {
            startBargeInMonitoring()
        } else {
            bargeInDetector.stopMonitoring()
        }
    }

    // MARK: - Simulate (testing support)

    func simulateFinalTranscript(_ text: String) {
        print("[AudioCoordinator] simulateFinalTranscript: \(text.prefix(50))")
        sttProvider?.stopListening()
        delegate?.audioCoordinatorDidReceiveFinalTranscript(text)
    }
}

// MARK: - TTS Queue

private extension AudioCoordinator {
    func speakNextIfIdle() {
        guard !isSpeakingCurrent, !speakQueue.isEmpty else { return }

        let text = speakQueue.removeFirst()
        let previousText = spokenHistory.isEmpty ? nil : spokenHistory
        isSpeakingCurrent = true

        ttsProvider?.speak(
            text: text,
            previousText: previousText,
            onStart: { [weak self] in
                guard let self = self else { return }
                self.delegate?.audioCoordinatorDidStartTTS()
                if self.bargeInEnabled {
                    self.startBargeInMonitoring()
                }
            },
            onComplete: { [weak self] in
                guard let self = self else { return }
                self.spokenHistory += (self.spokenHistory.isEmpty ? "" : " ") + text
                self.isSpeakingCurrent = false
                self.delegate?.audioCoordinatorDidCompleteTTS()
                self.speakNextIfIdle()
            },
            onError: { [weak self] message in
                guard let self = self else { return }
                self.isSpeakingCurrent = false
                self.delegate?.audioCoordinatorDidError(message)
                self.speakNextIfIdle()
            }
        )
    }
}

// MARK: - Barge-in

private extension AudioCoordinator {
    func startBargeInMonitoring() {
        bargeInDetector.startMonitoring { [weak self] in
            guard let self = self else { return }
            self.handleBargeIn()
        }
    }

    /// Atomic barge-in: stop TTS -> stop VAD -> start STT -> emit event.
    /// All happens on the main thread with no bridge round trip.
    func handleBargeIn() {
        print("[AudioCoordinator] Barge-in — atomic: stopTTS -> stopVAD -> startSTT -> emit")

        // 1. Clear queue, history, and stop current playback
        speakQueue.removeAll()
        isSpeakingCurrent = false
        spokenHistory = ""
        ttsProvider?.stop()

        // 2. Stop VAD monitoring
        bargeInDetector.stopMonitoring()

        // 3. Start STT to capture the user's speech
        startListening()

        // 4. Notify JS so it can cancel LLM stream and update UI
        delegate?.audioCoordinatorDidBargeIn()
    }
}
