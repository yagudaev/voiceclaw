#if canImport(KokoroSwift)
import AVFoundation
import Foundation
import KokoroSwift
import MLX

// MARK: - KokoroTTSProvider

@available(iOS 18.0, *)
class KokoroTTSProvider: TTSProvider {
    private struct SpeechRequest {
        let id: UUID
        let chunks: [String]
        let onStart: () -> Void
        let onComplete: () -> Void
        let onError: (String) -> Void
    }

    let name = "Kokoro TTS"
    private(set) var isSpeaking = false
    private(set) var latencyMs: Double = 0

    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var ttsEngine: KokoroTTS?
    private var voiceEmbedding: MLXArray?

    private var downloadTask: URLSessionDownloadTask?
    private var pendingChunks: [String] = []
    private var didStartCurrentSpeech = false
    private var activeSpeechID = UUID()
    private let speechIDLock = NSLock()
    private let synthesisQueue = DispatchQueue(label: "com.yagudaev.voiceclaw.kokoro-tts")
    private var queuedRequests: [SpeechRequest] = []
    private var currentRequest: SpeechRequest?

    private var isModelReady = false

    // MARK: - TTSProvider

    func speak(
        text: String,
        onStart: @escaping () -> Void,
        onComplete: @escaping () -> Void,
        onError: @escaping (String) -> Void
    ) {
        let chunks = makeSpeechChunks(from: text)

        guard !chunks.isEmpty else {
            onComplete()
            return
        }

        queuedRequests.append(
            SpeechRequest(
                id: UUID(),
                chunks: chunks,
                onStart: onStart,
                onComplete: onComplete,
                onError: onError
            )
        )
        startNextRequestIfIdle()
    }

    func stop() {
        // Invalidate all in-flight and queued work first (thread-safe)
        speechIDLock.lock()
        activeSpeechID = UUID()
        speechIDLock.unlock()
        queuedRequests = []
        currentRequest = nil
        pendingChunks = []
        didStartCurrentSpeech = false
        isSpeaking = false

        downloadTask?.cancel()
        downloadTask = nil

        // Stop player before engine to prevent completion handler reentrancy
        let player = playerNode
        let engine = audioEngine
        playerNode = nil
        audioEngine = nil

        player?.stop()
        if engine?.isRunning == true {
            engine?.stop()
        }

        // Do NOT recreate the engine here. The old synthesis may still be
        // running on synthesisQueue and shares NLTagger/Misaki state that
        // crashes if a new engine is created concurrently. Instead, let the
        // old synthesis finish (it will bail via speechID check) and reuse
        // the existing engine for the next request.
    }

    // MARK: - Public helpers

    static func isModelCached() -> Bool {
        let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("KokoroTTS", isDirectory: true)
        let model = cache.appendingPathComponent("kokoro-v1_0.safetensors")
        let voice = cache.appendingPathComponent("af_heart.safetensors")
        let legacyVoices = cache.appendingPathComponent("voices.npz")
        return FileManager.default.fileExists(atPath: model.path)
            && (
                FileManager.default.fileExists(atPath: voice.path)
                    || FileManager.default.fileExists(atPath: legacyVoices.path)
            )
    }

    func downloadModel(completion: @escaping (Result<Void, Error>) -> Void) {
        prepareModel(completion: completion)
    }
}

// MARK: - Model Preparation

@available(iOS 18.0, *)
private extension KokoroTTSProvider {
    static let samplingRate = Double(KokoroTTS.Constants.samplingRate)

    var cacheDirectory: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("KokoroTTS", isDirectory: true)
    }

    var cachedModelURL: URL {
        cacheDirectory.appendingPathComponent("kokoro-v1_0.safetensors")
    }

    var cachedVoicesURL: URL {
        cacheDirectory.appendingPathComponent("voices.npz")
    }

    var cachedVoiceURL: URL {
        cacheDirectory.appendingPathComponent("af_heart.safetensors")
    }

    // Default voice: af_heart (American female, 'a' prefix = US English)
    var defaultVoiceName: String { "af_heart" }

    func prepareModel(completion: @escaping (Result<Void, Error>) -> Void) {
        do {
            try FileManager.default.createDirectory(
                at: cacheDirectory,
                withIntermediateDirectories: true
            )
        } catch {
            completion(.failure(error))
            return
        }

        let needsModel = !FileManager.default.fileExists(atPath: cachedModelURL.path)
        let hasLegacyVoices = FileManager.default.fileExists(atPath: cachedVoicesURL.path)
        let needsVoice = !FileManager.default.fileExists(atPath: cachedVoiceURL.path) && !hasLegacyVoices

        if !needsModel && !needsVoice {
            loadModel(completion: completion)
            return
        }

        var filesToDownload: [(URL, URL)] = []
        if needsModel {
            let modelURL = URL(
                string: "https://huggingface.co/prince-canuma/Kokoro-82M/resolve/main/kokoro-v1_0.safetensors"
            )!
            filesToDownload.append((modelURL, cachedModelURL))
        }
        if needsVoice {
            let voiceURL = URL(
                string: "https://huggingface.co/prince-canuma/Kokoro-82M/resolve/main/voices/\(defaultVoiceName).safetensors"
            )!
            filesToDownload.append((voiceURL, cachedVoiceURL))
        }

        downloadFiles(filesToDownload, index: 0) { [weak self] result in
            switch result {
            case .success:
                self?.loadModel(completion: completion)
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func downloadFiles(
        _ pairs: [(URL, URL)],
        index: Int,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        guard index < pairs.count else {
            completion(.success(()))
            return
        }

        let (remoteURL, localURL) = pairs[index]
        print("[Kokoro] Downloading \(remoteURL.lastPathComponent)...")

        let task = URLSession.shared.downloadTask(with: remoteURL) { [weak self] tempURL, response, error in
            guard let self = self else { return }

            if let error = error {
                completion(.failure(error))
                return
            }

            if let http = response as? HTTPURLResponse, http.statusCode != 200 {
                let msg = "HTTP \(http.statusCode) for \(remoteURL.lastPathComponent)"
                completion(.failure(KokoroError.downloadFailed(msg)))
                return
            }

            guard let tempURL = tempURL else {
                let msg = "No temp file for \(remoteURL.lastPathComponent)"
                completion(.failure(KokoroError.downloadFailed(msg)))
                return
            }

            do {
                if FileManager.default.fileExists(atPath: localURL.path) {
                    try FileManager.default.removeItem(at: localURL)
                }
                try FileManager.default.moveItem(at: tempURL, to: localURL)
                print("[Kokoro] Downloaded \(localURL.lastPathComponent)")
                self.downloadFiles(pairs, index: index + 1, completion: completion)
            } catch {
                completion(.failure(error))
            }
        }
        downloadTask = task
        task.resume()
    }

    func loadModel(completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            self.loadEngineSync()
            if self.isModelReady {
                completion(.success(()))
            } else {
                completion(.failure(KokoroError.voiceLoadFailed("Failed to load Kokoro model")))
            }
        }
    }

    /// Synchronously (re)create the KokoroTTS engine and load voice embedding.
    /// Safe to call multiple times — used after interrupt to get a fresh engine
    /// since Misaki/NLTagger state can be corrupted by concurrent access.
    func reloadEngine() {
        print("[Kokoro] Reloading engine after interrupt")
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.loadEngineSync()
        }
    }

    private func loadEngineSync() {
        do {
            ttsEngine = KokoroTTS(modelPath: cachedModelURL, g2p: .misaki)
            if FileManager.default.fileExists(atPath: cachedVoiceURL.path) {
                voiceEmbedding = VoiceEmbeddingLoader.loadVoice(from: cachedVoiceURL)
            } else {
                voiceEmbedding = VoiceEmbeddingLoader.loadVoices(
                    from: cachedVoicesURL
                )?["\(defaultVoiceName).npy"]
                ?? VoiceEmbeddingLoader.loadVoices(from: cachedVoicesURL)?[defaultVoiceName]
            }
            guard voiceEmbedding != nil else {
                throw KokoroError.voiceLoadFailed("Could not load voice embedding for \(defaultVoiceName)")
            }
            isModelReady = true
            print("[Kokoro] Engine loaded successfully")
        } catch {
            print("[Kokoro] Failed to load engine: \(error)")
            isModelReady = false
        }
    }
}

// MARK: - Synthesis & Playback

@available(iOS 18.0, *)
private extension KokoroTTSProvider {
    func synthesizeAndPlay(text: String) {
        guard let engine = ttsEngine else {
            failCurrentRequest(message: "Kokoro: model not ready")
            return
        }

        guard let voice = voiceEmbedding else {
            failCurrentRequest(message: "Kokoro: voice '\(defaultVoiceName)' is not loaded")
            return
        }

        let startTime = CFAbsoluteTimeGetCurrent()
        isSpeaking = true

        // Capture speechID on main thread to avoid data race with stop()
        let speechID = activeSpeechID
        let isFinalChunk = pendingChunks.isEmpty

        synthesisQueue.async { [weak self] in
            guard let self = self else { return }

            // Bail early if stop() was called — thread-safe read
            self.speechIDLock.lock()
            let currentID = self.activeSpeechID
            self.speechIDLock.unlock()
            if speechID != currentID { return }

            do {
                let (audio, _) = try engine.generateAudio(
                    voice: voice,
                    language: .enUS,
                    text: text
                )

                // Check again after synthesis (could have been cancelled during)
                self.speechIDLock.lock()
                let postSynthID = self.activeSpeechID
                self.speechIDLock.unlock()
                if speechID != postSynthID { return }

                guard let buffer = self.makePCMBuffer(from: audio) else {
                    DispatchQueue.main.async {
                        guard speechID == self.activeSpeechID else { return }
                        self.failCurrentRequest(message: "Kokoro: Failed to create audio buffer")
                    }
                    return
                }
                self.latencyMs = (CFAbsoluteTimeGetCurrent() - startTime) * 1000
                DispatchQueue.main.async {
                    self.playAudioBuffer(buffer, speechID: speechID, isFinalChunk: isFinalChunk)
                }
            } catch {
                print("[Kokoro] Synthesis error: \(error)")
                DispatchQueue.main.async {
                    guard speechID == self.activeSpeechID else { return }
                    self.failCurrentRequest(message: "Kokoro synthesis error: \(error.localizedDescription)")
                }
            }
        }
    }

    func makePCMBuffer(from samples: [Float]) -> AVAudioPCMBuffer? {
        let format = AVAudioFormat(
            standardFormatWithSampleRate: KokoroTTSProvider.samplingRate,
            channels: 1
        )!

        guard let buffer = AVAudioPCMBuffer(
            pcmFormat: format,
            frameCapacity: AVAudioFrameCount(samples.count)
        ) else {
            print("[Kokoro] Failed to create PCM buffer")
            return nil
        }

        buffer.frameLength = buffer.frameCapacity
        let dst = buffer.floatChannelData![0]
        samples.withUnsafeBufferPointer { buf in
            guard let src = buf.baseAddress else { return }
            dst.assign(from: src, count: samples.count)
        }
        return buffer
    }

    func playAudioBuffer(_ buffer: AVAudioPCMBuffer, speechID: UUID, isFinalChunk: Bool) {
        guard speechID == activeSpeechID else { return }

        if audioEngine == nil {
            let eng = AVAudioEngine()
            let player = AVAudioPlayerNode()
            eng.attach(player)
            audioEngine = eng
            playerNode = player
        }

        guard let eng = audioEngine, let player = playerNode else {
            failCurrentRequest(message: "Kokoro: Audio engine not initialized")
            return
        }

        eng.connect(player, to: eng.mainMixerNode, format: buffer.format)

        if !eng.isRunning {
            do {
                try eng.start()
            } catch {
                print("[Kokoro] Audio engine failed to start: \(error)")
                failCurrentRequest(message: "Kokoro: Audio engine error: \(error.localizedDescription)")
                return
            }
        }

        if !didStartCurrentSpeech {
            didStartCurrentSpeech = true
            currentRequest?.onStart()
        }

        player.scheduleBuffer(buffer, at: nil, options: .interrupts) { [weak self] in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard speechID == self.activeSpeechID else { return }
                if isFinalChunk {
                    self.finishCurrentRequest()
                } else {
                    self.synthesizeNextChunk(for: speechID)
                }
            }
        }
        player.play()
    }

    func synthesizeNextChunk(for speechID: UUID) {
        guard speechID == activeSpeechID else { return }

        guard !pendingChunks.isEmpty else {
            finishCurrentRequest()
            return
        }

        let chunk = pendingChunks.removeFirst()
        synthesizeAndPlay(text: chunk)
    }

    func startNextRequestIfIdle() {
        guard currentRequest == nil else { return }
        guard !queuedRequests.isEmpty else { return }

        let request = queuedRequests.removeFirst()
        currentRequest = request
        pendingChunks = request.chunks
        didStartCurrentSpeech = false
        speechIDLock.lock()
        activeSpeechID = request.id
        speechIDLock.unlock()

        if isModelReady {
            synthesizeNextChunk(for: request.id)
        } else {
            prepareModel { [weak self] result in
                guard let self = self else { return }
                DispatchQueue.main.async {
                    guard self.currentRequest?.id == request.id else { return }
                    switch result {
                    case .success:
                        self.synthesizeNextChunk(for: request.id)
                    case .failure(let error):
                        print("[Kokoro] Model preparation failed: \(error)")
                        self.failCurrentRequest(message: "Kokoro: \(error.localizedDescription)")
                    }
                }
            }
        }
    }

    func finishCurrentRequest() {
        let request = currentRequest
        currentRequest = nil
        pendingChunks = []
        isSpeaking = false
        didStartCurrentSpeech = false
        request?.onComplete()
        startNextRequestIfIdle()
    }

    func failCurrentRequest(message: String) {
        let request = currentRequest
        currentRequest = nil
        pendingChunks = []
        isSpeaking = false
        didStartCurrentSpeech = false
        request?.onError(message)
        request?.onComplete()
        startNextRequestIfIdle()
    }

    func makeSpeechChunks(from text: String, maxChunkLength: Int = 180) -> [String] {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }

        var sentences: [String] = []
        let nsText = trimmed as NSString
        nsText.enumerateSubstrings(
            in: NSRange(location: 0, length: nsText.length),
            options: [.bySentences, .substringNotRequired]
        ) { _, range, _, _ in
            let sentence = nsText.substring(with: range).trimmingCharacters(in: .whitespacesAndNewlines)
            if !sentence.isEmpty {
                sentences.append(sentence)
            }
        }

        if sentences.isEmpty {
            sentences = [trimmed]
        }

        var chunks: [String] = []
        var current = ""

        for sentence in sentences {
            if current.isEmpty {
                current = sentence
                continue
            }

            let candidate = "\(current) \(sentence)"
            if candidate.count <= maxChunkLength {
                current = candidate
            } else {
                chunks.append(current)
                current = sentence
            }
        }

        if !current.isEmpty {
            chunks.append(current)
        }

        return chunks.flatMap { chunk in
            guard chunk.count > maxChunkLength else { return [chunk] }

            var subchunks: [String] = []
            var start = chunk.startIndex
            while start < chunk.endIndex {
                let end = chunk.index(start, offsetBy: maxChunkLength, limitedBy: chunk.endIndex) ?? chunk.endIndex
                subchunks.append(String(chunk[start..<end]).trimmingCharacters(in: .whitespacesAndNewlines))
                start = end
            }
            return subchunks.filter { !$0.isEmpty }
        }
    }
}

// MARK: - KokoroError

enum KokoroError: LocalizedError {
    case notAvailable(String)
    case downloadFailed(String)
    case voiceLoadFailed(String)

    var errorDescription: String? {
        switch self {
        case .notAvailable(let msg): return msg
        case .downloadFailed(let msg): return msg
        case .voiceLoadFailed(let msg): return msg
        }
    }
}

#else

import Foundation

// Fallback: KokoroSwift framework not linked (iOS < 18 simulator or missing SPM package)
class KokoroTTSProvider: TTSProvider {
    let name = "Kokoro TTS"
    private(set) var isSpeaking = false
    private(set) var latencyMs: Double = 0

    static func isModelCached() -> Bool { return false }

    func downloadModel(completion: @escaping (Result<Void, Error>) -> Void) {
        completion(.failure(NSError(domain: "KokoroTTS", code: 0,
            userInfo: [NSLocalizedDescriptionKey: "Kokoro TTS requires iOS 18+ and the KokoroSwift package"])))
    }

    func speak(
        text: String,
        onStart: @escaping () -> Void,
        onComplete: @escaping () -> Void,
        onError: @escaping (String) -> Void
    ) {
        print("[Kokoro] KokoroSwift not available — requires iOS 18+ and KokoroSwift SPM package")
        onError("Kokoro TTS requires iOS 18+ and the KokoroSwift package")
        onComplete()
    }

    func stop() {}
}

#endif
