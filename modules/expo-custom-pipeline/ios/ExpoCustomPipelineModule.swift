import ExpoModulesCore

public class ExpoCustomPipelineModule: Module {
    private let pipelineManager = PipelineManager()
    private var sttProviderName: String = ""
    private var ttsProviderName: String = ""

    public func definition() -> ModuleDefinition {
        Name("ExpoCustomPipeline")

        Events(
            "onPartialTranscript",
            "onFinalTranscript",
            "onAssistantResponse",
            "onTTSStart",
            "onTTSComplete",
            "onLatencyUpdate",
            "onError"
        )

        OnCreate {
            self.pipelineManager.delegate = self
        }

        Function("setSTTProvider") { (name: String, config: [String: String]?) in
            self.sttProviderName = name
            print("[ExpoCustomPipeline] STT provider set to: \(name)")

            switch name {
            case "apple":
                self.pipelineManager.setSTTProvider(AppleSTTProvider())
            case "deepgram":
                let provider = DeepgramSTTProvider()
                if let apiKey = config?["apiKey"], !apiKey.isEmpty {
                    provider.configure(apiKey: apiKey)
                }
                self.pipelineManager.setSTTProvider(provider)
            default:
                print("[ExpoCustomPipeline] Unknown STT provider: \(name)")
            }
        }

        Function("setTTSProvider") { (name: String, config: [String: String]?) in
            self.ttsProviderName = name
            print("[ExpoCustomPipeline] TTS provider set to: \(name), config keys: \(config?.keys.joined(separator: ", ") ?? "nil")")

            switch name {
            case "apple":
                self.pipelineManager.setTTSProvider(AppleTTSProvider())
            case "elevenlabs":
                let provider = ElevenLabsTTSProvider()
                if let apiKey = config?["apiKey"], !apiKey.isEmpty {
                    provider.configure(apiKey: apiKey, voiceId: config?["voiceId"])
                }
                self.pipelineManager.setTTSProvider(provider)
            case "openai":
                let provider = OpenAITTSProvider()
                if let apiKey = config?["apiKey"], !apiKey.isEmpty {
                    provider.configure(apiKey: apiKey, voice: config?["voice"])
                }
                self.pipelineManager.setTTSProvider(provider)
            default:
                print("[ExpoCustomPipeline] Unknown TTS provider: \(name)")
            }
        }

        Function("startListening") { () in
            self.pipelineManager.sttProvider?.startListening(
                onPartialResult: { [weak self] text in
                    self?.sendEvent("onPartialTranscript", ["text": text])
                },
                onFinalResult: { [weak self] text in
                    self?.sendEvent("onFinalTranscript", ["text": text])
                }
            )
        }

        Function("stopListening") { () in
            self.pipelineManager.sttProvider?.stopListening()
        }

        Function("speak") { (text: String) in
            self.pipelineManager.ttsProvider?.speak(
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
            self.pipelineManager.ttsProvider?.stop()
        }

        Function("startConversation") { (apiUrl: String, apiKey: String, model: String) in
            self.pipelineManager.startConversation(apiUrl: apiUrl, apiKey: apiKey, model: model)
        }

        Function("stopConversation") { () in
            self.pipelineManager.stopConversation()
        }

        Function("getLatencyStats") { () -> [String: Double] in
            return self.pipelineManager.getLatencyStats()
        }
    }
}

// MARK: - PipelineManagerDelegate

extension ExpoCustomPipelineModule: PipelineManagerDelegate {
    func pipelineDidReceivePartialTranscript(_ text: String) {
        sendEvent("onPartialTranscript", ["text": text])
    }

    func pipelineDidReceiveFinalTranscript(_ text: String) {
        sendEvent("onFinalTranscript", ["text": text])
    }

    func pipelineDidReceiveAssistantResponse(_ text: String) {
        sendEvent("onAssistantResponse", ["text": text])
    }

    func pipelineDidStartSpeaking() {
        sendEvent("onTTSStart", [:])
    }

    func pipelineDidFinishSpeaking() {
        sendEvent("onTTSComplete", [:])
    }

    func pipelineDidUpdateLatency(stt: Double, llm: Double, tts: Double) {
        sendEvent("onLatencyUpdate", [
            "sttLatencyMs": stt,
            "llmLatencyMs": llm,
            "ttsLatencyMs": tts
        ])
    }

    func pipelineDidEncounterError(_ message: String) {
        print("[ExpoCustomPipeline] Error: \(message)")
        sendEvent("onError", ["message": message])
    }
}
