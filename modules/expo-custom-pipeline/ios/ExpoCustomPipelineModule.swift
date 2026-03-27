import ExpoModulesCore

public class ExpoCustomPipelineModule: Module {
    private var sttProvider: STTProvider?
    private var ttsProvider: TTSProvider?
    private var sttProviderName: String = ""
    private var ttsProviderName: String = ""

    public func definition() -> ModuleDefinition {
        Name("ExpoCustomPipeline")

        Events(
            "onPartialTranscript",
            "onFinalTranscript",
            "onTTSStart",
            "onTTSComplete",
            "onError"
        )

        Function("setSTTProvider") { (name: String, config: [String: String]?) in
            self.sttProviderName = name
            print("[ExpoCustomPipeline] STT provider set to: \(name)")
            self.sttProvider = makeSTTProvider(name: name, config: config)
        }

        Function("setTTSProvider") { (name: String, config: [String: String]?) in
            self.ttsProviderName = name
            let configKeys = config?.keys.joined(separator: ", ") ?? "nil"
            print("[ExpoCustomPipeline] TTS provider set to: \(name), config keys: \(configKeys)")
            self.ttsProvider = makeTTSProvider(name: name, config: config)
        }

        Function("startListening") { () in
            self.sttProvider?.startListening(
                onPartialResult: { [weak self] text in
                    self?.sendEvent("onPartialTranscript", ["text": text])
                },
                onFinalResult: { [weak self] text in
                    self?.sendEvent("onFinalTranscript", ["text": text])
                }
            )
        }

        Function("stopListening") { () in
            self.sttProvider?.stopListening()
        }

        Function("speak") { (text: String) in
            self.ttsProvider?.speak(
                text: text,
                onStart: { [weak self] in
                    self?.sendEvent("onTTSStart", [:])
                },
                onComplete: { [weak self] in
                    self?.sendEvent("onTTSComplete", [:])
                },
                onError: { [weak self] message in
                    self?.sendEvent("onError", ["message": message])
                }
            )
        }

        Function("stopSpeaking") { () in
            self.ttsProvider?.stop()
        }

        Function("isKokoroModelReady") { () -> Bool in
            if #available(iOS 18.0, *) {
                return KokoroTTSProvider.isModelCached()
            }
            return false
        }

        AsyncFunction("prepareKokoroModel") { (promise: Promise) in
            guard #available(iOS 18.0, *) else {
                promise.resolve(false)
                return
            }
            let provider = KokoroTTSProvider()
            provider.downloadModel { result in
                switch result {
                case .success: promise.resolve(true)
                case .failure(let err): promise.reject(err)
                }
            }
        }
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
