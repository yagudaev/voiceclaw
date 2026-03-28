import ExpoModulesCore

public class ExpoCustomPipelineModule: Module {
    private let coordinator = AudioCoordinator()
    private var sttProviderName: String = ""
    private var ttsProviderName: String = ""

    public func definition() -> ModuleDefinition {
        Name("ExpoCustomPipeline")

        Events(
            "onPartialTranscript",
            "onFinalTranscript",
            "onTTSStart",
            "onTTSComplete",
            "onError",
            "onBargeIn"
        )

        OnCreate {
            self.coordinator.delegate = self
        }

        Function("setSTTProvider") { (name: String, config: [String: String]?) in
            self.sttProviderName = name
            print("[ExpoCustomPipeline] STT provider set to: \(name)")
            self.coordinator.setSTTProvider(makeSTTProvider(name: name, config: config))
        }

        Function("setTTSProvider") { (name: String, config: [String: String]?) in
            self.ttsProviderName = name
            let configKeys = config?.keys.joined(separator: ", ") ?? "nil"
            print("[ExpoCustomPipeline] TTS provider set to: \(name), config keys: \(configKeys)")
            self.coordinator.setTTSProvider(makeTTSProvider(name: name, config: config))
        }

        Function("startListening") { () in
            self.coordinator.startListening()
        }

        Function("stopListening") { () in
            self.coordinator.stopListening()
        }

        Function("speak") { (text: String) in
            self.coordinator.speak(text: text)
        }

        Function("stopSpeaking") { () in
            self.coordinator.stopSpeaking()
        }

        Function("setBargeInEnabled") { (enabled: Bool) in
            self.coordinator.setBargeInEnabled(enabled)
        }

        Function("simulateFinalTranscript") { (text: String) in
            self.coordinator.simulateFinalTranscript(text)
        }

        Function("isKokoroModelReady") { () -> Bool in
            if #available(iOS 18.0, *) {
                return KokoroTTSProvider.isModelCached()
            }
            return false
        }

        Function("isKokoroAvailable") { () -> Bool in
            #if canImport(KokoroSwift)
            if #available(iOS 18.0, *) {
                return true
            }
            #endif
            return false
        }

        AsyncFunction("prepareKokoroModel") { (promise: Promise) in
            #if canImport(KokoroSwift)
            guard #available(iOS 18.0, *) else {
                promise.reject(NSError(domain: "KokoroTTS", code: 0,
                    userInfo: [NSLocalizedDescriptionKey: "Kokoro TTS requires iOS 18+"]))
                return
            }
            let provider = KokoroTTSProvider()
            provider.downloadModel { result in
                switch result {
                case .success: promise.resolve(true)
                case .failure(let err): promise.reject(err)
                }
            }
            #else
            promise.reject(NSError(domain: "KokoroTTS", code: 0,
                userInfo: [NSLocalizedDescriptionKey: "Kokoro TTS is not available in this build. The KokoroSwift package needs to be added to the project."]))
            #endif
        }
    }
}

// MARK: - AudioCoordinatorDelegate

extension ExpoCustomPipelineModule: AudioCoordinatorDelegate {
    func audioCoordinatorDidReceivePartialTranscript(_ text: String) {
        sendEvent("onPartialTranscript", ["text": text])
    }

    func audioCoordinatorDidReceiveFinalTranscript(_ text: String) {
        sendEvent("onFinalTranscript", ["text": text])
    }

    func audioCoordinatorDidStartTTS() {
        sendEvent("onTTSStart", [:])
    }

    func audioCoordinatorDidCompleteTTS() {
        sendEvent("onTTSComplete", [:])
    }

    func audioCoordinatorDidError(_ message: String) {
        sendEvent("onError", ["message": message])
    }

    func audioCoordinatorDidBargeIn() {
        sendEvent("onBargeIn", [:])
    }
}

// MARK: - Helpers

private func makeSTTProvider(name: String, config: [String: String]?) -> STTProvider? {
    switch name {
    case "apple":
        return AppleSTTProvider()
    case "deepgram":
        let provider = DeepgramSTTProvider()
        if let apiKey = config?["apiKey"], !apiKey.isEmpty {
            provider.configure(apiKey: apiKey)
        }
        return provider
    default:
        print("[ExpoCustomPipeline] Unknown STT provider: \(name)")
        return nil
    }
}

private func makeTTSProvider(name: String, config: [String: String]?) -> TTSProvider? {
    switch name {
    case "apple":
        return AppleTTSProvider()
    case "elevenlabs":
        let provider = ElevenLabsTTSProvider()
        if let apiKey = config?["apiKey"], !apiKey.isEmpty {
            provider.configure(apiKey: apiKey, voiceId: config?["voiceId"])
        }
        return provider
    case "openai":
        let provider = OpenAITTSProvider()
        if let apiKey = config?["apiKey"], !apiKey.isEmpty {
            provider.configure(apiKey: apiKey, voice: config?["voice"])
        }
        return provider
    case "kokoro":
        if #available(iOS 18.0, *) {
            return KokoroTTSProvider()
        }
        print("[ExpoCustomPipeline] Kokoro requires iOS 18+")
        return nil
    default:
        print("[ExpoCustomPipeline] Unknown TTS provider: \(name)")
        return nil
    }
}
