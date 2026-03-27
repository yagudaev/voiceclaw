#if canImport(KokoroSwift)
import AVFoundation
import Foundation
import KokoroSwift
import MLX
import MLXUtilsLibrary

// MARK: - KokoroTTSProvider

@available(iOS 18.0, *)
class KokoroTTSProvider: TTSProvider {
    let name = "Kokoro TTS"
    private(set) var isSpeaking = false
    private(set) var latencyMs: Double = 0

    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var ttsEngine: KokoroTTS?
    private var voices: [String: MLXArray] = [:]

    private var onStartCallback: (() -> Void)?
    private var onCompleteCallback: (() -> Void)?
    private var onErrorCallback: ((String) -> Void)?
    private var downloadTask: URLSessionDownloadTask?

    private var isModelReady = false

    // MARK: - TTSProvider

    func speak(
        text: String,
        onStart: @escaping () -> Void,
        onComplete: @escaping () -> Void,
        onError: @escaping (String) -> Void
    ) {
        onStartCallback = onStart
        onCompleteCallback = onComplete
        onErrorCallback = onError

        if isModelReady {
            synthesizeAndPlay(text: text)
        } else {
            prepareModel { [weak self] result in
                guard let self = self else { return }
                switch result {
                case .success:
                    self.synthesizeAndPlay(text: text)
                case .failure(let error):
                    print("[Kokoro] Model preparation failed: \(error)")
                    DispatchQueue.main.async {
                        self.isSpeaking = false
                        self.onErrorCallback?("Kokoro: \(error.localizedDescription)")
                        self.onCompleteCallback?()
                    }
                }
            }
        }
    }

    func stop() {
        downloadTask?.cancel()
        downloadTask = nil
        playerNode?.stop()
        if audioEngine?.isRunning == true {
            audioEngine?.stop()
        }
        isSpeaking = false
        onStartCallback = nil
        onCompleteCallback = nil
        onErrorCallback = nil
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

    // Default voice: af_heart (American female, 'a' prefix = US English)
    var defaultVoiceKey: String { "af_heart.npy" }

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
        let needsVoices = !FileManager.default.fileExists(atPath: cachedVoicesURL.path)

        if !needsModel && !needsVoices {
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
        if needsVoices {
            let voicesURL = URL(
                string: "https://huggingface.co/prince-canuma/Kokoro-82M/resolve/main/voices.npz"
            )!
            filesToDownload.append((voicesURL, cachedVoicesURL))
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
            do {
                self.ttsEngine = KokoroTTS(modelPath: self.cachedModelURL, g2p: .misaki)
                self.voices = NpyzReader.read(
                    fileFromPath: self.cachedVoicesURL
                ) ?? [:]
                self.isModelReady = true
                print("[Kokoro] Model loaded successfully")
                completion(.success(()))
            } catch {
                print("[Kokoro] Failed to load model: \(error)")
                completion(.failure(error))
            }
        }
    }
}

// MARK: - Synthesis & Playback

@available(iOS 18.0, *)
private extension KokoroTTSProvider {
    func synthesizeAndPlay(text: String) {
        guard let engine = ttsEngine else {
            onErrorCallback?("Kokoro: model not ready")
            onCompleteCallback?()
            return
        }

        guard let voice = voices[defaultVoiceKey] else {
            onErrorCallback?("Kokoro: voice '\(defaultVoiceKey)' not found in voices.npz")
            onCompleteCallback?()
            return
        }

        let startTime = CFAbsoluteTimeGetCurrent()
        isSpeaking = true

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            do {
                let (audio, _) = try engine.generateAudio(
                    voice: voice,
                    language: .enUS,
                    text: text
                )
                self.latencyMs = (CFAbsoluteTimeGetCurrent() - startTime) * 1000
                DispatchQueue.main.async { self.playAudioSamples(audio) }
            } catch {
                print("[Kokoro] Synthesis error: \(error)")
                DispatchQueue.main.async {
                    self.isSpeaking = false
                    self.onErrorCallback?("Kokoro synthesis error: \(error.localizedDescription)")
                    self.onCompleteCallback?()
                }
            }
        }
    }

    func playAudioSamples(_ samples: [Float]) {
        let format = AVAudioFormat(
            standardFormatWithSampleRate: KokoroTTSProvider.samplingRate,
            channels: 1
        )!

        guard let buffer = AVAudioPCMBuffer(
            pcmFormat: format,
            frameCapacity: AVAudioFrameCount(samples.count)
        ) else {
            print("[Kokoro] Failed to create PCM buffer")
            isSpeaking = false
            onErrorCallback?("Kokoro: Failed to create audio buffer")
            onCompleteCallback?()
            return
        }

        buffer.frameLength = buffer.frameCapacity
        let dst = buffer.floatChannelData![0]
        samples.withUnsafeBufferPointer { buf in
            guard let src = buf.baseAddress else { return }
            dst.assign(from: src, count: samples.count)
        }

        if audioEngine == nil {
            let eng = AVAudioEngine()
            let player = AVAudioPlayerNode()
            eng.attach(player)
            audioEngine = eng
            playerNode = player
        }

        guard let eng = audioEngine, let player = playerNode else {
            isSpeaking = false
            onErrorCallback?("Kokoro: Audio engine not initialized")
            onCompleteCallback?()
            return
        }

        eng.connect(player, to: eng.mainMixerNode, format: format)

        if !eng.isRunning {
            do {
                try eng.start()
            } catch {
                print("[Kokoro] Audio engine failed to start: \(error)")
                isSpeaking = false
                onErrorCallback?("Kokoro: Audio engine error: \(error.localizedDescription)")
                onCompleteCallback?()
                return
            }
        }

        onStartCallback?()

        player.scheduleBuffer(buffer, at: nil, options: .interrupts) { [weak self] in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isSpeaking = false
                self.onCompleteCallback?()
            }
        }
        player.play()
    }
}

// MARK: - KokoroError

enum KokoroError: LocalizedError {
    case notAvailable(String)
    case downloadFailed(String)

    var errorDescription: String? {
        switch self {
        case .notAvailable(let msg): return msg
        case .downloadFailed(let msg): return msg
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
