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
/// When barge-in fires the coordinator atomically stops TTS, stops VAD,
/// starts STT, and emits `onBargeIn` -- no JS bridge round trip required.
class AudioCoordinator {
    weak var delegate: AudioCoordinatorDelegate?

    private(set) var sttProvider: STTProvider?
    private(set) var ttsProvider: TTSProvider?
    private let bargeInDetector = BargeInDetector()
    private var bargeInEnabled = false

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
            print("[AudioCoordinator] Audio session configured (voiceChat mode)")
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
        ttsProvider?.speak(
            text: text,
            onStart: { [weak self] in
                guard let self = self else { return }
                self.delegate?.audioCoordinatorDidStartTTS()
                // Auto-start VAD when TTS begins (if barge-in is enabled)
                if self.bargeInEnabled {
                    self.startBargeInMonitoring()
                }
            },
            onComplete: { [weak self] in
                self?.delegate?.audioCoordinatorDidCompleteTTS()
            },
            onError: { [weak self] message in
                self?.delegate?.audioCoordinatorDidError(message)
            }
        )
    }

    func stopSpeaking() {
        ttsProvider?.stop()
    }

    // MARK: - Barge-in

    func setBargeInEnabled(_ enabled: Bool) {
        bargeInEnabled = enabled
        if !enabled {
            bargeInDetector.stopMonitoring()
        }
        print("[AudioCoordinator] bargeInEnabled = \(enabled)")
    }

    // MARK: - Simulate (testing support)

    func simulateFinalTranscript(_ text: String) {
        print("[AudioCoordinator] simulateFinalTranscript: \(text.prefix(50))")
        sttProvider?.stopListening()
        delegate?.audioCoordinatorDidReceiveFinalTranscript(text)
    }
}

// MARK: - Helpers

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
        print("[AudioCoordinator] Barge-in detected — atomic: stopTTS -> stopVAD -> startSTT -> emit")

        // 1. Stop TTS playback immediately
        ttsProvider?.stop()

        // 2. Stop VAD monitoring (detector already stopped itself, but be safe)
        bargeInDetector.stopMonitoring()

        // 3. Start STT to capture the user's speech
        startListening()

        // 4. Notify JS so it can cancel LLM stream and update UI
        delegate?.audioCoordinatorDidBargeIn()
    }
}
