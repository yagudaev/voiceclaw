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

            switch name {
            case "apple":
                self.sttProvider = AppleSTTProvider()
            case "deepgram":
                let provider = DeepgramSTTProvider()
                if let apiKey = config?["apiKey"], !apiKey.isEmpty {
                    provider.configure(apiKey: apiKey)
                }
                self.sttProvider = provider
            default:
                print("[ExpoCustomPipeline] Unknown STT provider: \(name)")
            }
        }

        Function("setTTSProvider") { (name: String, config: [String: String]?) in
            self.ttsProviderName = name
            print("[ExpoCustomPipeline] TTS provider set to: \(name), config keys: \(config?.keys.joined(separator: ", ") ?? "nil")")

            switch name {
            case "apple":
                self.ttsProvider = AppleTTSProvider()
            case "elevenlabs":
                let provider = ElevenLabsTTSProvider()
                if let apiKey = config?["apiKey"], !apiKey.isEmpty {
                    provider.configure(apiKey: apiKey, voiceId: config?["voiceId"])
                }
                self.ttsProvider = provider
            case "openai":
                let provider = OpenAITTSProvider()
                if let apiKey = config?["apiKey"], !apiKey.isEmpty {
                    provider.configure(apiKey: apiKey, voice: config?["voice"])
                }
                self.ttsProvider = provider
            default:
                print("[ExpoCustomPipeline] Unknown TTS provider: \(name)")
            }
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
    }
}
