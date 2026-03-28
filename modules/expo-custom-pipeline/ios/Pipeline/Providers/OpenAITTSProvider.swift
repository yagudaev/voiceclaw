import AVFoundation

class OpenAITTSProvider: NSObject, TTSProvider, URLSessionDataDelegate {
    let name = "OpenAI TTS"
    private(set) var isSpeaking = false
    private(set) var latencyMs: Double = 0

    private var apiKey = ""
    private var voice = "alloy"

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
    /// Minimum bytes before attempting early playback. MP3 frames are ~417 bytes
    /// at 128kbps, so 4KB gives us roughly 10 frames — enough for AVAudioPlayer
    /// to initialise and start decoding.
    private let earlyPlaybackThreshold = 4096

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
            "voice": voice,
            "response_format": "mp3"
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            print("[OpenAI TTS] Failed to encode body: \(error)")
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
            print("[OpenAI TTS] HTTP \(httpResponse.statusCode)")
            completionHandler(.cancel)
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                let msg = "OpenAI TTS HTTP \(httpResponse.statusCode)"
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
            print("[OpenAI TTS] Streaming: received \(accumulatedData.count) bytes, firing onStart (latency: \(String(format: "%.0f", latencyMs))ms)")
            DispatchQueue.main.async { [weak self] in
                self?.onStartCallback?()
            }
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            // Ignore cancellation
            if (error as NSError).code == NSURLErrorCancelled { return }
            let msg = "OpenAI TTS: \(error.localizedDescription)"
            print("[OpenAI TTS] Request error: \(error.localizedDescription)")
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
            print("[OpenAI TTS] Empty response")
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.isSpeaking = false
                self.onErrorCallback?("OpenAI TTS: Empty audio response")
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

        print("[OpenAI TTS] Download complete: \(accumulatedData.count) bytes total")

        let audioData = accumulatedData
        DispatchQueue.main.async { [weak self] in
            self?.playAudioData(audioData)
            self?.cleanupSession()
        }
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
            // If onStart was already fired via early streaming threshold, don't fire again
            if !didFireOnStart {
                onStartCallback?()
            }
            audioPlayer?.play()
        } catch {
            let msg = "OpenAI TTS: Failed to create audio player: \(error.localizedDescription)"
            print("[OpenAI TTS] Failed to create audio player: \(error)")
            isSpeaking = false
            onErrorCallback?(msg)
            onCompleteCallback?()
        }
    }

    func cleanupSession() {
        streamingSession?.finishTasksAndInvalidate()
        streamingSession = nil
        streamingTask = nil
    }
}
