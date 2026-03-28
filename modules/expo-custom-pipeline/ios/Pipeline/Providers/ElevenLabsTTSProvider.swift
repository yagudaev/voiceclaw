import AVFoundation
import os.log

private let logger = Logger(subsystem: "com.yagudaev.voiceclaw", category: "ElevenLabs")

class ElevenLabsTTSProvider: NSObject, TTSProvider, URLSessionDataDelegate {
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

    // Streaming state
    private var streamingSession: URLSession?
    private var streamingTask: URLSessionDataTask?
    private var accumulatedData = Data()
    private var requestStartTime: CFAbsoluteTime = 0
    private var didFireOnStart = false
    /// Minimum bytes before firing onStart. MP3 frames are ~417 bytes at 128kbps,
    /// so 4KB gives us roughly 10 frames — enough to confirm valid audio is arriving.
    private let earlyPlaybackThreshold = 4096

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
        requestStartTime = CFAbsoluteTimeGetCurrent()
        accumulatedData = Data()
        didFireOnStart = false

        // Use a delegate-based session so we receive data chunks as they arrive
        let session = URLSession(
            configuration: .default,
            delegate: self,
            delegateQueue: nil
        )
        streamingSession = session

        let task = session.dataTask(with: request)
        streamingTask = task
        task.resume()
    }

    func stop() {
        streamingTask?.cancel()
        streamingTask = nil
        streamingSession?.invalidateAndCancel()
        streamingSession = nil
        audioPlayer?.stop()
        audioPlayer = nil
        accumulatedData = Data()
        didFireOnStart = false
        isSpeaking = false
        onStartCallback = nil
        onCompleteCallback = nil
        onErrorCallback = nil
    }

    // MARK: - URLSessionDataDelegate

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
            logger.error("[ElevenLabs] HTTP \(httpResponse.statusCode)")
            completionHandler(.cancel)
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                let msg = "ElevenLabs HTTP \(httpResponse.statusCode)"
                self.isSpeaking = false
                self.onErrorCallback?(msg)
                self.onCompleteCallback?()
                self.cleanupSession()
            }
            return
        }
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        accumulatedData.append(data)

        // Fire onStart as soon as enough data has arrived — this signals the
        // pipeline that audio will start momentarily, reducing perceived latency.
        if !didFireOnStart && accumulatedData.count >= earlyPlaybackThreshold {
            didFireOnStart = true
            latencyMs = (CFAbsoluteTimeGetCurrent() - requestStartTime) * 1000
            logger.debug("[ElevenLabs] Streaming: received \(self.accumulatedData.count) bytes, firing onStart (latency: \(String(format: "%.0f", self.latencyMs))ms)")
            DispatchQueue.main.async { [weak self] in
                self?.onStartCallback?()
            }
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            // Ignore cancellation
            if (error as NSError).code == NSURLErrorCancelled { return }
            let msg = "ElevenLabs: \(error.localizedDescription)"
            logger.error("[ElevenLabs] Request error: \(error.localizedDescription)")
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.isSpeaking = false
                self.onErrorCallback?(msg)
                self.onCompleteCallback?()
                self.cleanupSession()
            }
            return
        }

        guard !accumulatedData.isEmpty else {
            logger.error("[ElevenLabs] Empty response")
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.isSpeaking = false
                self.onErrorCallback?("ElevenLabs: Empty audio response")
                self.onCompleteCallback?()
                self.cleanupSession()
            }
            return
        }

        // If we never reached the early threshold (very short audio), fire onStart now
        if !didFireOnStart {
            didFireOnStart = true
            latencyMs = (CFAbsoluteTimeGetCurrent() - requestStartTime) * 1000
        }

        logger.debug("[ElevenLabs] Download complete: \(self.accumulatedData.count) bytes total")

        let audioData = accumulatedData
        DispatchQueue.main.async { [weak self] in
            self?.playAudioData(audioData)
            self?.cleanupSession()
        }
    }
}

// MARK: - AVAudioPlayerDelegate

extension ElevenLabsTTSProvider: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        isSpeaking = false
        onCompleteCallback?()
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        let msg = "ElevenLabs: Audio decode error: \(error?.localizedDescription ?? "unknown")"
        logger.error("[ElevenLabs] Audio decode error: \(error?.localizedDescription ?? "unknown")")
        isSpeaking = false
        onErrorCallback?(msg)
        onCompleteCallback?()
    }
}

// MARK: - Helpers

private extension ElevenLabsTTSProvider {
    func configureAudioSessionForPlayback() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(
                .playAndRecord, mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth]
            )
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            logger.debug("[ElevenLabs] Audio session configured for playback")
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
            // If onStart was already fired via early streaming threshold, don't fire again
            if !didFireOnStart {
                onStartCallback?()
            }
            audioPlayer?.play()
        } catch {
            logger.error("[ElevenLabs] Failed to create audio player: \(error)")
            isSpeaking = false
            onErrorCallback?("ElevenLabs: Failed to create audio player: \(error.localizedDescription)")
            onCompleteCallback?()
        }
    }

    func cleanupSession() {
        streamingSession?.finishTasksAndInvalidate()
        streamingSession = nil
        streamingTask = nil
    }
}
