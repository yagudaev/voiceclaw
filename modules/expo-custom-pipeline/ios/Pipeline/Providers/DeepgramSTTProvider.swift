import Foundation
import AVFoundation

class DeepgramSTTProvider: NSObject, STTProvider {

    // MARK: - STTProvider conformance

    let name = "deepgram"
    private(set) var isListening = false
    private(set) var latencyMs: Double = 0

    func startListening(
        onPartialResult: @escaping (String) -> Void,
        onFinalResult: @escaping (String) -> Void
    ) {
        guard !isListening else { return }
        guard !apiKey.isEmpty else {
            print("[DeepgramSTT] API key not set – call configure(apiKey:) first")
            return
        }

        self.onPartialResult = onPartialResult
        self.onFinalResult = onFinalResult
        isListening = true
        lastAudioSendTime = 0

        connectWebSocket()
    }

    func stopListening() {
        guard isListening else { return }
        isListening = false
        stopAudioEngine()
        sendCloseMessage { [weak self] in
            self?.disconnectWebSocket()
        }
    }

    // MARK: - Configuration

    func configure(apiKey: String) {
        self.apiKey = apiKey
    }

    // MARK: - Private state

    private var apiKey = ""
    private var webSocket: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var audioEngine: AVAudioEngine?

    private var onPartialResult: ((String) -> Void)?
    private var onFinalResult: ((String) -> Void)?

    private var lastAudioSendTime: CFAbsoluteTime = 0
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var reconnectWorkItem: DispatchWorkItem?

    // MARK: - WebSocket lifecycle

    private func connectWebSocket() {
        let queryParams = "model=nova-3&language=en&smart_format=true&interim_results=true&endpointing=300&vad_events=true&encoding=linear16&sample_rate=16000&channels=1"
        guard let url = URL(string: "wss://api.deepgram.com/v1/listen?\(queryParams)") else {
            print("[DeepgramSTT] Failed to build WebSocket URL")
            return
        }

        var request = URLRequest(url: url)
        request.setValue("Token \(apiKey)", forHTTPHeaderField: "Authorization")

        let session = URLSession(configuration: .default, delegate: nil, delegateQueue: nil)
        urlSession = session

        let task = session.webSocketTask(with: request)
        webSocket = task
        task.resume()

        reconnectAttempts = 0
        receiveMessage()
        startAudioEngine()
    }

    private func disconnectWebSocket() {
        reconnectWorkItem?.cancel()
        reconnectWorkItem = nil
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
    }

    private func sendCloseMessage(completion: (() -> Void)? = nil) {
        // Deepgram expects a JSON close message as a text frame to flush final results.
        // Wait briefly after sending so Deepgram can return any trailing transcripts.
        let closeJSON = "{\"type\":\"CloseStream\"}"
        webSocket?.send(.string(closeJSON)) { error in
            if let error = error {
                print("[DeepgramSTT] Error sending close message: \(error.localizedDescription)")
            }
            DispatchQueue.global().asyncAfter(deadline: .now() + 0.5) {
                completion?()
            }
        }
    }

    private func attemptReconnect() {
        guard isListening, reconnectAttempts < maxReconnectAttempts else {
            print("[DeepgramSTT] Max reconnect attempts reached, giving up")
            isListening = false
            stopAudioEngine()
            disconnectWebSocket()
            return
        }

        reconnectAttempts += 1
        let delay = min(pow(2.0, Double(reconnectAttempts)), 16.0)
        print("[DeepgramSTT] Reconnecting in \(delay)s (attempt \(reconnectAttempts)/\(maxReconnectAttempts))")

        let workItem = DispatchWorkItem { [weak self] in
            guard let self = self, self.isListening else { return }
            self.disconnectWebSocket()
            self.connectWebSocket()
        }
        reconnectWorkItem = workItem
        DispatchQueue.global().asyncAfter(deadline: .now() + delay, execute: workItem)
    }

    // MARK: - WebSocket receive loop

    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleTranscriptMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleTranscriptMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue receive loop
                if self.isListening {
                    self.receiveMessage()
                }

            case .failure(let error):
                print("[DeepgramSTT] WebSocket receive error: \(error.localizedDescription)")
                if self.isListening {
                    self.stopAudioEngine()
                    self.attemptReconnect()
                }
            }
        }
    }

    // MARK: - Transcript parsing

    private func handleTranscriptMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return
        }

        // Ignore non-results messages (e.g. VAD events, metadata)
        guard let type = json["type"] as? String, type == "Results" else {
            return
        }

        guard let channel = json["channel"] as? [String: Any],
              let alternatives = channel["alternatives"] as? [[String: Any]],
              let first = alternatives.first,
              let transcript = first["transcript"] as? String,
              !transcript.isEmpty else {
            return
        }

        let isFinal = json["is_final"] as? Bool ?? false

        // Measure latency from the last audio buffer send to transcript receipt
        if lastAudioSendTime > 0 {
            latencyMs = (CFAbsoluteTimeGetCurrent() - lastAudioSendTime) * 1000
        }

        if isFinal {
            DispatchQueue.main.async { [weak self] in
                self?.onFinalResult?(transcript)
            }
        } else {
            DispatchQueue.main.async { [weak self] in
                self?.onPartialResult?(transcript)
            }
        }
    }

    // MARK: - Audio capture

    private func startAudioEngine() {
        let engine = AVAudioEngine()
        audioEngine = engine

        let inputNode = engine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        // Target format: 16-bit PCM mono at 16kHz (non-interleaved so int16ChannelData is populated)
        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 16000,
            channels: 1,
            interleaved: false
        ) else {
            print("[DeepgramSTT] Failed to create target audio format")
            return
        }

        guard let converter = AVAudioConverter(from: recordingFormat, to: targetFormat) else {
            print("[DeepgramSTT] Failed to create audio converter")
            return
        }

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            guard let self = self, self.isListening else { return }
            guard let pcmData = self.convertToPCM16(buffer: buffer, converter: converter, targetFormat: targetFormat) else { return }
            self.sendAudioData(pcmData)
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true)
            try engine.start()
        } catch {
            print("[DeepgramSTT] Failed to start audio engine: \(error.localizedDescription)")
            isListening = false
            stopAudioEngine()
            disconnectWebSocket()
        }
    }

    private func stopAudioEngine() {
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func convertToPCM16(
        buffer: AVAudioPCMBuffer,
        converter: AVAudioConverter,
        targetFormat: AVAudioFormat
    ) -> Data? {
        let frameCount = AVAudioFrameCount(
            Double(buffer.frameLength) * (16000.0 / buffer.format.sampleRate)
        )
        guard frameCount > 0 else { return nil }

        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: frameCount) else {
            return nil
        }

        var error: NSError?
        var hasData = false
        converter.convert(to: outputBuffer, error: &error) { _, outStatus in
            if hasData {
                outStatus.pointee = .noDataNow
                return nil
            }
            hasData = true
            outStatus.pointee = .haveData
            return buffer
        }

        if let error = error {
            print("[DeepgramSTT] Audio conversion error: \(error.localizedDescription)")
            return nil
        }

        guard outputBuffer.frameLength > 0 else { return nil }

        let byteCount = Int(outputBuffer.frameLength) * Int(targetFormat.streamDescription.pointee.mBytesPerFrame)
        guard let int16Ptr = outputBuffer.int16ChannelData?[0] else { return nil }
        return Data(bytes: int16Ptr, count: byteCount)
    }

    private func sendAudioData(_ data: Data) {
        lastAudioSendTime = CFAbsoluteTimeGetCurrent()
        webSocket?.send(.data(data)) { [weak self] error in
            if let error = error {
                print("[DeepgramSTT] Error sending audio: \(error.localizedDescription)")
                if self?.isListening == true {
                    self?.stopAudioEngine()
                    self?.attemptReconnect()
                }
            }
        }
    }
}
