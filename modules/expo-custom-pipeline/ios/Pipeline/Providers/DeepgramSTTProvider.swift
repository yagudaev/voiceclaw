import Foundation
import AVFoundation

class DeepgramSTTProvider: NSObject, STTProvider {
    let name = "deepgram"

    private(set) var isListening = false
    private(set) var latencyMs: Double = 0

    private var apiKey = ""
    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var audioEngine = AVAudioEngine()
    private var listenStartTime: CFAbsoluteTime = 0
    private var hasReceivedFirstResult = false

    private var onPartialResultCallback: ((String) -> Void)?
    private var onFinalResultCallback: ((String) -> Void)?

    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var isReconnecting = false

    // MARK: - Configuration

    func configure(apiKey: String) {
        self.apiKey = apiKey
    }

    // MARK: - STTProvider

    func startListening(
        onPartialResult: @escaping (String) -> Void,
        onFinalResult: @escaping (String) -> Void
    ) {
        guard !isListening else { return }
        guard !apiKey.isEmpty else {
            print("[DeepgramSTT] API key not configured")
            return
        }

        onPartialResultCallback = onPartialResult
        onFinalResultCallback = onFinalResult
        reconnectAttempts = 0
        latencyMs = 0
        hasReceivedFirstResult = false
        listenStartTime = CFAbsoluteTimeGetCurrent()

        connectWebSocket()
    }

    func stopListening() {
        guard isListening else { return }
        isListening = false
        sendCloseStream()
    }

    // MARK: - WebSocket

    private func connectWebSocket() {
        let urlString = "wss://api.deepgram.com/v1/listen?model=nova-3&interim_results=true&endpointing=300&encoding=linear16&sample_rate=16000&channels=1"
        guard let url = URL(string: urlString) else {
            print("[DeepgramSTT] Invalid WebSocket URL")
            return
        }

        var request = URLRequest(url: url)
        request.setValue("Token \(apiKey)", forHTTPHeaderField: "Authorization")

        let session = URLSession(configuration: .default)
        urlSession = session
        let task = session.webSocketTask(with: request)
        webSocketTask = task
        task.resume()

        listenForMessages()
        startAudioCapture()
    }

    private func listenForMessages() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                self.handleWebSocketMessage(message)
                self.listenForMessages()
            case .failure(let error):
                if self.isListening {
                    print("[DeepgramSTT] WebSocket receive error: \(error.localizedDescription)")
                    self.attemptReconnect()
                }
            }
        }
    }

    private func handleWebSocketMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            parseTranscriptResponse(text)
        case .data(let data):
            if let text = String(data: data, encoding: .utf8) {
                parseTranscriptResponse(text)
            }
        @unknown default:
            break
        }
    }

    private func parseTranscriptResponse(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let channel = json["channel"] as? [String: Any],
              let alternatives = channel["alternatives"] as? [[String: Any]],
              let firstAlt = alternatives.first,
              let transcript = firstAlt["transcript"] as? String,
              !transcript.isEmpty else {
            return
        }

        if !hasReceivedFirstResult {
            hasReceivedFirstResult = true
            latencyMs = (CFAbsoluteTimeGetCurrent() - listenStartTime) * 1000
        }

        let isFinal = json["is_final"] as? Bool ?? false

        DispatchQueue.main.async { [weak self] in
            if isFinal {
                self?.onFinalResultCallback?(transcript)
            } else {
                self?.onPartialResultCallback?(transcript)
            }
        }
    }

    private func sendCloseStream() {
        let closeMessage = "{\"type\": \"CloseStream\"}"
        webSocketTask?.send(.string(closeMessage)) { [weak self] error in
            if let error = error {
                print("[DeepgramSTT] Failed to send CloseStream: \(error.localizedDescription)")
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                self?.disconnect()
            }
        }
    }

    private func disconnect() {
        stopAudioCapture()
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
        onPartialResultCallback = nil
        onFinalResultCallback = nil
        deactivateAudioSession()
    }

    private func attemptReconnect() {
        guard isListening, !isReconnecting, reconnectAttempts < maxReconnectAttempts else {
            if reconnectAttempts >= maxReconnectAttempts {
                print("[DeepgramSTT] Max reconnection attempts reached")
                DispatchQueue.main.async { [weak self] in
                    self?.isListening = false
                    self?.disconnect()
                }
            }
            return
        }

        isReconnecting = true
        reconnectAttempts += 1
        let delay = pow(2.0, Double(reconnectAttempts))

        print("[DeepgramSTT] Reconnecting in \(delay)s (attempt \(reconnectAttempts)/\(maxReconnectAttempts))")

        stopAudioCapture()
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self = self, self.isListening else { return }
            self.isReconnecting = false
            self.connectWebSocket()
        }
    }

    // MARK: - Audio Capture

    private func startAudioCapture() {
        configureAudioSession()

        let inputNode = audioEngine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 16000,
            channels: 1,
            interleaved: false
        ) else {
            print("[DeepgramSTT] Failed to create target audio format")
            return
        }

        guard let converter = AVAudioConverter(from: inputFormat, to: targetFormat) else {
            print("[DeepgramSTT] Failed to create audio converter")
            return
        }

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { [weak self] buffer, _ in
            guard let self = self else { return }

            let frameCount = AVAudioFrameCount(
                Double(buffer.frameLength) * 16000 / inputFormat.sampleRate
            )
            guard frameCount > 0 else { return }

            guard let convertedBuffer = AVAudioPCMBuffer(
                pcmFormat: targetFormat,
                frameCapacity: frameCount
            ) else { return }

            var error: NSError?
            let status = converter.convert(to: convertedBuffer, error: &error) { inNumPackets, outStatus in
                outStatus.pointee = .haveData
                return buffer
            }

            guard status != .error, error == nil else {
                print("[DeepgramSTT] Audio conversion error: \(error?.localizedDescription ?? "unknown")")
                return
            }

            guard let channelData = convertedBuffer.int16ChannelData else { return }
            let dataSize = Int(convertedBuffer.frameLength) * MemoryLayout<Int16>.size
            let data = Data(bytes: channelData[0], count: dataSize)

            self.webSocketTask?.send(.data(data)) { error in
                if let error = error {
                    print("[DeepgramSTT] Failed to send audio: \(error.localizedDescription)")
                }
            }
        }

        audioEngine.prepare()

        do {
            try audioEngine.start()
            isListening = true
        } catch {
            print("[DeepgramSTT] Audio engine failed to start: \(error.localizedDescription)")
            disconnect()
        }
    }

    private func stopAudioCapture() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
    }

    private func configureAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("[DeepgramSTT] Failed to configure audio session: \(error.localizedDescription)")
        }
    }

    private func deactivateAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            print("[DeepgramSTT] Failed to deactivate audio session: \(error.localizedDescription)")
        }
    }
}
