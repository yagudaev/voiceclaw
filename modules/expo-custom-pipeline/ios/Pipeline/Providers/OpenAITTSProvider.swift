import AVFoundation

class OpenAITTSProvider: NSObject, TTSProvider {
    let name = "OpenAI TTS"
    private(set) var isSpeaking = false
    private(set) var latencyMs: Double = 0

    private var apiKey = ""
    private var voice = "alloy"

    private var audioPlayer: AVAudioPlayer?
    private var onStartCallback: (() -> Void)?
    private var onCompleteCallback: (() -> Void)?
    private var onErrorCallback: ((String) -> Void)?
    private var currentTask: URLSessionDataTask?

    // MARK: - Configuration

    /// Configure provider with API key and optional voice.
    /// Voices: alloy, echo, fable, onyx, nova, shimmer
    func configure(apiKey: String, voice: String? = nil) {
        self.apiKey = apiKey
        if let voice = voice { self.voice = voice }
    }

    // MARK: - TTSProvider

    func speak(text: String, onStart: @escaping () -> Void, onComplete: @escaping () -> Void, onError: @escaping (String) -> Void) {
        guard !apiKey.isEmpty else {
            onError("OpenAI TTS: API key not configured")
            onComplete()
            return
        }

        onStartCallback = onStart
        onCompleteCallback = onComplete
        onErrorCallback = onError

        guard let url = URL(string: "https://api.openai.com/v1/audio/speech") else {
            print("[OpenAI TTS] Invalid URL")
            onComplete()
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "model": "tts-1",
            "input": text,
            "voice": voice
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            print("[OpenAI TTS] Failed to encode body: \(error)")
            onComplete()
            return
        }

        isSpeaking = true
        let requestStartTime = CFAbsoluteTimeGetCurrent()

        let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }

            if let error = error {
                let msg = "OpenAI TTS: \(error.localizedDescription)"
                print("[OpenAI TTS] Request error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.isSpeaking = false
                    self.onErrorCallback?(msg)
                    self.onCompleteCallback?()
                }
                return
            }

            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                let body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
                let msg = "OpenAI TTS HTTP \(httpResponse.statusCode): \(body.prefix(200))"
                print("[OpenAI TTS] HTTP \(httpResponse.statusCode): \(body.prefix(200))")
                DispatchQueue.main.async {
                    self.isSpeaking = false
                    self.onErrorCallback?(msg)
                    self.onCompleteCallback?()
                }
                return
            }

            guard let data = data, !data.isEmpty else {
                print("[OpenAI TTS] Empty response")
                DispatchQueue.main.async {
                    self.isSpeaking = false
                    self.onErrorCallback?("OpenAI TTS: Empty audio response")
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
        onErrorCallback = nil
    }
}

// MARK: - AVAudioPlayerDelegate

extension OpenAITTSProvider: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        isSpeaking = false
        onCompleteCallback?()
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        let msg = "OpenAI TTS: Audio decode error: \(error?.localizedDescription ?? "unknown")"
        print("[OpenAI TTS] Audio decode error: \(error?.localizedDescription ?? "unknown")")
        isSpeaking = false
        onErrorCallback?(msg)
        onCompleteCallback?()
    }
}

// MARK: - Helpers

private extension OpenAITTSProvider {
    func playAudioData(_ data: Data) {
        do {
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            onStartCallback?()
            audioPlayer?.play()
        } catch {
            let msg = "OpenAI TTS: Failed to create audio player: \(error.localizedDescription)"
            print("[OpenAI TTS] Failed to create audio player: \(error)")
            isSpeaking = false
            onErrorCallback?(msg)
            onCompleteCallback?()
        }
    }
}
