import AVFoundation
import os.log

private let logger = Logger(subsystem: "com.yagudaev.voiceclaw", category: "ElevenLabs")

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
    private var onErrorCallback: ((String) -> Void)?
    private var currentTask: URLSessionDataTask?

    // MARK: - Configuration

    func configure(apiKey: String, voiceId: String? = nil, modelId: String? = nil) {
        self.apiKey = apiKey
        if let voiceId = voiceId { self.voiceId = voiceId }
        if let modelId = modelId { self.modelId = modelId }
        logger.debug("[ElevenLabs] Configured with key: \(apiKey.prefix(8))..., voice: \(self.voiceId)")
    }

    // MARK: - TTSProvider

    func speak(text: String, onStart: @escaping () -> Void, onComplete: @escaping () -> Void, onError: @escaping (String) -> Void) {
        logger.debug("[ElevenLabs] speak() called with text: \(text.prefix(50))")
        guard !apiKey.isEmpty else {
            logger.error("[ElevenLabs] API key not configured")
            onError("ElevenLabs: API key not configured")
            onComplete()
            return
        }

        onStartCallback = onStart
        onCompleteCallback = onComplete
        onErrorCallback = onError

        let urlString = "https://api.elevenlabs.io/v1/text-to-speech/\(voiceId)/stream"
        guard let url = URL(string: urlString) else {
            NSLog("[ElevenLabs] Invalid URL")
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
            logger.error("[ElevenLabs] Failed to encode body: \(error)")
            onComplete()
            return
        }

        isSpeaking = true
        let requestStartTime = CFAbsoluteTimeGetCurrent()

        let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }

            if let error = error {
                let msg = "ElevenLabs: \(error.localizedDescription)"
                logger.error("[ElevenLabs] Request error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.isSpeaking = false
                    self.onErrorCallback?(msg)
                    self.onCompleteCallback?()
                }
                return
            }

            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                let body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
                let msg = "ElevenLabs HTTP \(httpResponse.statusCode): \(body.prefix(200))"
                logger.error("[ElevenLabs] HTTP \(httpResponse.statusCode): \(body.prefix(200))")
                DispatchQueue.main.async {
                    self.isSpeaking = false
                    self.onErrorCallback?(msg)
                    self.onCompleteCallback?()
                }
                return
            }

            guard let data = data, !data.isEmpty else {
                logger.error("[ElevenLabs] Empty response")
                DispatchQueue.main.async {
                    self.isSpeaking = false
                    self.onErrorCallback?("ElevenLabs: Empty audio response")
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

extension ElevenLabsTTSProvider: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        isSpeaking = false
        onCompleteCallback?()
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        logger.error("[ElevenLabs] Audio decode error: \(error?.localizedDescription ?? "unknown")")
        isSpeaking = false
        onCompleteCallback?()
    }
}

// MARK: - Helpers

private extension ElevenLabsTTSProvider {
    func configureAudioSessionForPlayback() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(
                .playAndRecord, mode: .default,
                options: [.defaultToSpeaker, .allowBluetooth]
            )
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            logger.error("[ElevenLabs] Audio session configured for playback")
        } catch {
            logger.error("[ElevenLabs] Failed to configure audio session: \(error)")
        }
    }

    func playAudioData(_ data: Data) {
        logger.debug("[ElevenLabs] Playing audio data: \(data.count) bytes")
        configureAudioSessionForPlayback()
        do {
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            let duration = audioPlayer?.duration ?? 0
            logger.debug("[ElevenLabs] AVAudioPlayer created, duration: \(duration)s")
            onStartCallback?()
            audioPlayer?.play()
        } catch {
            logger.error("[ElevenLabs] Failed to create audio player: \(error)")
            isSpeaking = false
            onCompleteCallback?()
        }
    }
}
