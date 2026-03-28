import Foundation
import Speech
import AVFoundation

/// Apple on-device Speech-to-Text provider using SFSpeechRecognizer.
///
/// Latency measurement (native-side, informational):
///   Start  – recognition task created (`listenStartTime`)
///   End    – first partial result received (`hasReceivedFirstResult`)
/// The authoritative STT latency is measured in use-pipeline.ts:
///   Start  – `startListening()` call (mic opens)
///   End    – `onFinalTranscript` event (complete utterance recognised)
class AppleSTTProvider: STTProvider {
    let name = "apple"

    private(set) var isListening = false
    private(set) var latencyMs: Double = 0

    private let speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine: AVAudioEngine?
    private var listenStartTime: CFAbsoluteTime = 0
    private var hasReceivedFirstResult = false
    private var silenceTimer: Timer?
    private var lastPartialText: String = ""
    private let silenceTimeoutSeconds: TimeInterval = 1.5
    private var activeOnPartial: ((String) -> Void)?
    private var activeOnFinal: ((String) -> Void)?

    init(locale: Locale = Locale(identifier: "en-US")) {
        speechRecognizer = SFSpeechRecognizer(locale: locale)
    }

    // MARK: - STTProvider

    func startListening(
        onPartialResult: @escaping (String) -> Void,
        onFinalResult: @escaping (String) -> Void
    ) {
        print("[AppleSTTProvider] startListening called — isListening: \(isListening), audioEngine: \(audioEngine != nil)")
        guard !isListening else { print("[AppleSTTProvider] BLOCKED: already listening"); return }

        requestAuthorizationIfNeeded { [weak self] authorized in
            guard let self = self else { return }

            guard authorized else {
                print("[AppleSTTProvider] Speech recognition authorization denied")
                return
            }

            DispatchQueue.main.async {
                self.activeOnPartial = onPartialResult
                self.activeOnFinal = onFinalResult
                self.beginRecognition(onPartialResult: onPartialResult, onFinalResult: onFinalResult)
            }
        }
    }

    func stopListening() {
        print("[AppleSTTProvider] stopListening called — isListening: \(isListening)")
        guard isListening else { print("[AppleSTTProvider] stopListening: not listening, skipping"); return }

        silenceTimer?.invalidate()
        silenceTimer = nil
        if let engine = audioEngine {
            print("[AppleSTTProvider] stopListening: engine isRunning=\(engine.isRunning)")
            if engine.isRunning {
                engine.stop()
                engine.inputNode.removeTap(onBus: 0)
            }
        }
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        audioEngine = nil
        recognitionRequest = nil
        recognitionTask = nil
        isListening = false
        lastPartialText = ""
        print("[AppleSTTProvider] stopListening complete — cleaned up")
    }

    // MARK: - Helpers

    private func beginRecognition(
        onPartialResult: @escaping (String) -> Void,
        onFinalResult: @escaping (String) -> Void
    ) {
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            print("[AppleSTTProvider] Speech recognizer is unavailable")
            return
        }

        // Clean up any previous session
        print("[AppleSTTProvider] beginRecognition — cleaning up previous session")
        stopListening()

        // Configure audio session BEFORE creating recognition task
        print("[AppleSTTProvider] beginRecognition — configuring audio session")
        configureAudioSession()

        // Create a fresh AVAudioEngine each time — reusing after stop() is unreliable
        print("[AppleSTTProvider] beginRecognition — creating fresh AVAudioEngine")
        let engine = AVAudioEngine()
        audioEngine = engine

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true

        if speechRecognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
            print("[AppleSTTProvider] Using on-device recognition")
        } else {
            print("[AppleSTTProvider] On-device not available, using server")
        }

        recognitionRequest = request
        latencyMs = 0
        hasReceivedFirstResult = false
        listenStartTime = CFAbsoluteTimeGetCurrent()

        recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }

            if let result = result {
                let text = result.bestTranscription.formattedString

                if !self.hasReceivedFirstResult {
                    self.hasReceivedFirstResult = true
                    self.latencyMs = (CFAbsoluteTimeGetCurrent() - self.listenStartTime) * 1000
                }

                if result.isFinal {
                    print("[AppleSTTProvider] Final: \(text.prefix(50))")
                    self.silenceTimer?.invalidate()
                    self.silenceTimer = nil
                    onFinalResult(text)
                    self.lastPartialText = ""
                    self.stopListening()
                } else {
                    print("[AppleSTTProvider] Partial: \(text.prefix(50))")
                    self.lastPartialText = text
                    onPartialResult(text)
                    self.resetSilenceTimer(onFinalResult: onFinalResult)
                }
            }

            if let error = error {
                let nsError = error as NSError
                // Ignore cancellation errors (code 216 = request was canceled)
                if nsError.domain == "kAFAssistantErrorDomain" && nsError.code == 216 {
                    return
                }
                print("[AppleSTTProvider] Recognition error: \(error.localizedDescription)")
                self.stopListening()
            }
        }

        installAudioTap(for: request)

        engine.prepare()

        do {
            try engine.start()
            isListening = true
            print("[AppleSTTProvider] Audio engine started, listening...")
        } catch {
            print("[AppleSTTProvider] Audio engine failed to start: \(error.localizedDescription)")
            stopListening()
        }
    }

    private func requestAuthorizationIfNeeded(completion: @escaping (Bool) -> Void) {
        let status = SFSpeechRecognizer.authorizationStatus()

        switch status {
        case .authorized:
            completion(true)
        case .notDetermined:
            SFSpeechRecognizer.requestAuthorization { newStatus in
                completion(newStatus == .authorized)
            }
        case .denied, .restricted:
            completion(false)
        @unknown default:
            completion(false)
        }
    }

    private func configureAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()
        print("[AppleSTTProvider] Audio session BEFORE config — category: \(audioSession.category.rawValue), mode: \(audioSession.mode.rawValue), sampleRate: \(audioSession.sampleRate), isOtherAudioPlaying: \(audioSession.isOtherAudioPlaying)")
        do {
            try audioSession.setCategory(
                .playAndRecord, mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth]
            )
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            print("[AppleSTTProvider] Audio session configured OK — category: \(audioSession.category.rawValue), mode: \(audioSession.mode.rawValue)")
        } catch {
            print("[AppleSTTProvider] Failed to configure audio session: \(error.localizedDescription)")
        }
    }

    private func resetSilenceTimer(onFinalResult: @escaping (String) -> Void) {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(
            withTimeInterval: silenceTimeoutSeconds,
            repeats: false
        ) { [weak self] _ in
            guard let self = self, self.isListening else { return }
            let text = self.lastPartialText
            guard !text.isEmpty else { return }
            print("[AppleSTTProvider] Silence timeout — emitting final: \(text.prefix(50))")
            self.lastPartialText = ""
            onFinalResult(text)
            self.stopListening()
        }
    }

    private func installAudioTap(for request: SFSpeechAudioBufferRecognitionRequest) {
        guard let audioEngine = audioEngine else { return }
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        guard recordingFormat.sampleRate > 0 else {
            print("[AppleSTTProvider] Invalid audio format — no microphone available")
            return
        }

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }
    }
}
