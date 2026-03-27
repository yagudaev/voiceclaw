import AVFoundation

class ElevenLabsTTSProvider: NSObject, TTSProvider {
    let name = "ElevenLabs TTS"
    private(set) var isSpeaking = false
    private(set) var latencyMs: Double = 0

    private var apiKey = ""
    private var voiceId = "Awx8TeMHHpDzbm42nIB6"
    private var modelId = "eleven_turbo_v2_5"

    private var audioPlayer: AVAudioPlayer?
    private var onStartCallback: (() -> Void)?
    private var onCompleteCallback: (() -> Void)?
    private var currentTask: URLSessionDataTask?

    // MARK: - Configuration

    func configure(apiKey: String, voiceId: String? = nil, modelId: String? = nil) {
        self.apiKey = apiKey
        if let voiceId = voiceId { self.voiceId = voiceId }
        if let modelId = modelId { self.modelId = modelId }
    }

    // MARK: - TTSProvider

    func speak(text: String, onStart: @escaping () -> Void, onComplete: @escaping () -> Void) {
        guard !apiKey.isEmpty else {
            print("[ElevenLabs] API key not configured")
            onComplete()
            return
        }

        onStartCallback = onStart
        onCompleteCallback = onComplete

        let urlString = "https://api.elevenlabs.io/v1/text-to-speech/\(voiceId)/stream"
        guard let url = URL(string: urlString) else {
            print("[ElevenLabs] Invalid URL")
            onComplete()
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "text": text,
            "model_id": modelId
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            print("[ElevenLabs] Failed to encode body: \(error)")
            onComplete()
            return
        }

        isSpeaking = true
        let requestStartTime = CFAbsoluteTimeGetCurrent()

        let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }

            if let error = error {
                print("[ElevenLabs] Request error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.isSpeaking = false
                    self.onCompleteCallback?()
                }
                return
            }

            guard let data = data, !data.isEmpty else {
                print("[ElevenLabs] Empty response")
                DispatchQueue.main.async {
                    self.isSpeaking = false
                    self.onCompleteCallback?()
                }
                return
            }

            self.latencyMs = (CFAbsoluteTimeGetCurrent() - requestStartTime) * 1000

            DispatchQueue.main.async {
                self.playAudioData(data)
            }
        }

        currentTask = task
        task.resume()
    }

    func stop() {
        currentTask?.cancel()
        currentTask = nil
        audioPlayer?.stop()
        audioPlayer = nil
        isSpeaking = false
        onStartCallback = nil
        onCompleteCallback = nil
    }
}

// MARK: - AVAudioPlayerDelegate

extension ElevenLabsTTSProvider: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        isSpeaking = false
        onCompleteCallback?()
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        print("[ElevenLabs] Audio decode error: \(error?.localizedDescription ?? "unknown")")
        isSpeaking = false
        onCompleteCallback?()
    }
}

// MARK: - Helpers

private extension ElevenLabsTTSProvider {
    func playAudioData(_ data: Data) {
        do {
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            onStartCallback?()
            audioPlayer?.play()
        } catch {
            print("[ElevenLabs] Failed to create audio player: \(error)")
            isSpeaking = false
            onCompleteCallback?()
        }
    }
}
