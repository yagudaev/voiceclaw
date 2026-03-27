import Foundation
import Speech
import AVFoundation

class AppleSTTProvider: STTProvider {
    let name = "apple"

    private(set) var isListening = false
    private(set) var latencyMs: Double = 0

    private let speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()
    private var listenStartTime: CFAbsoluteTime = 0
    private var hasReceivedFirstResult = false

    init(locale: Locale = Locale(identifier: "en-US")) {
        speechRecognizer = SFSpeechRecognizer(locale: locale)
    }

    // MARK: - STTProvider

    func startListening(
        onPartialResult: @escaping (String) -> Void,
        onFinalResult: @escaping (String) -> Void
    ) {
        guard !isListening else { return }

        requestAuthorizationIfNeeded { [weak self] authorized in
            guard let self = self else { return }

            guard authorized else {
                print("[AppleSTTProvider] Speech recognition authorization denied")
                return
            }

            DispatchQueue.main.async {
                self.beginRecognition(onPartialResult: onPartialResult, onFinalResult: onFinalResult)
            }
        }
    }

    func stopListening() {
        guard isListening else { return }

        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        recognitionRequest = nil
        recognitionTask = nil
        isListening = false
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
        stopListening()

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true

        if speechRecognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
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
                    onFinalResult(text)
                    self.stopListening()
                } else {
                    onPartialResult(text)
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

        configureAudioSession()
        installAudioTap(for: request)

        audioEngine.prepare()

        do {
            try audioEngine.start()
            isListening = true
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
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("[AppleSTTProvider] Failed to configure audio session: \(error.localizedDescription)")
        }
    }

    private func installAudioTap(for request: SFSpeechAudioBufferRecognitionRequest) {
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }
    }
}
