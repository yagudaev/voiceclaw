import Foundation

protocol PipelineManagerDelegate: AnyObject {
    func pipelineDidReceivePartialTranscript(_ text: String)
    func pipelineDidReceiveFinalTranscript(_ text: String)
    func pipelineDidReceiveAssistantResponse(_ text: String)
    func pipelineDidStartSpeaking()
    func pipelineDidFinishSpeaking()
    func pipelineDidUpdateLatency(stt: Double, llm: Double, tts: Double)
    func pipelineDidEncounterError(_ message: String)
}

class PipelineManager {
    weak var delegate: PipelineManagerDelegate?

    private(set) var sttProvider: STTProvider?
    private(set) var ttsProvider: TTSProvider?

    private(set) var isConversationActive = false
    private(set) var sttLatencyMs: Double = 0
    private(set) var llmLatencyMs: Double = 0
    private(set) var ttsLatencyMs: Double = 0

    private var apiUrl: String = ""
    private var apiKey: String = ""
    private var model: String = ""
    private var sentenceBuffer: String = ""
    private var llmStartTime: CFAbsoluteTime = 0
    private var ttsStartTime: CFAbsoluteTime = 0
    private var urlSession: URLSession?
    private var activeTask: URLSessionDataTask?
    private var pendingTTSCount: Int = 0
    private var isStreamComplete: Bool = false
    private var fullResponse: String = ""

    // MARK: - Public Interface

    func setSTTProvider(_ provider: STTProvider) {
        sttProvider = provider
    }

    func setTTSProvider(_ provider: TTSProvider) {
        ttsProvider = provider
    }

    func startConversation(apiUrl: String, apiKey: String, model: String) {
        self.apiUrl = apiUrl
        self.apiKey = apiKey
        self.model = model
        isConversationActive = true

        print("[PipelineManager] Starting conversation, STT: \(sttProvider?.name ?? "none"), TTS: \(ttsProvider?.name ?? "none")")
        startListening()
    }

    func stopConversation() {
        isConversationActive = false
        sttProvider?.stopListening()
        ttsProvider?.stop()
        activeTask?.cancel()
        activeTask = nil
        sentenceBuffer = ""
        pendingTTSCount = 0
        isStreamComplete = false
        fullResponse = ""
    }

    func getLatencyStats() -> [String: Double] {
        return [
            "sttLatencyMs": sttLatencyMs,
            "llmLatencyMs": llmLatencyMs,
            "ttsLatencyMs": ttsLatencyMs
        ]
    }

    // MARK: - Helpers

    private func startListening() {
        guard let stt = sttProvider else {
            delegate?.pipelineDidEncounterError("No STT provider configured")
            return
        }

        print("[PipelineManager] Starting STT provider: \(stt.name)")
        stt.startListening(
            onPartialResult: { [weak self] text in
                print("[PipelineManager] Partial transcript: \(text.prefix(50))")
                self?.delegate?.pipelineDidReceivePartialTranscript(text)
            },
            onFinalResult: { [weak self] text in
                print("[PipelineManager] Final transcript: \(text.prefix(50))")
                guard let self = self, self.isConversationActive else { return }
                self.sttLatencyMs = stt.latencyMs
                self.delegate?.pipelineDidReceiveFinalTranscript(text)
                self.callOpenClawAPI(with: text)
            }
        )
    }

    private func callOpenClawAPI(with text: String) {
        guard !apiUrl.isEmpty else {
            delegate?.pipelineDidEncounterError("API URL not configured")
            return
        }

        guard let url = URL(string: apiUrl) else {
            delegate?.pipelineDidEncounterError("Invalid API URL: \(apiUrl)")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")

        let body: [String: Any] = [
            "model": model,
            "messages": [
                ["role": "user", "content": text]
            ],
            "stream": true
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            delegate?.pipelineDidEncounterError("Failed to encode request body: \(error.localizedDescription)")
            return
        }

        llmStartTime = CFAbsoluteTimeGetCurrent()
        sentenceBuffer = ""
        pendingTTSCount = 0
        isStreamComplete = false
        fullResponse = ""

        let session = URLSession(configuration: .default, delegate: SSEDelegate(manager: self), delegateQueue: nil)
        urlSession = session
        let task = session.dataTask(with: request)
        activeTask = task
        task.resume()
    }

    fileprivate func handleSSEData(_ data: Data) {
        guard let text = String(data: data, encoding: .utf8) else { return }

        let lines = text.components(separatedBy: "\n")
        for line in lines {
            guard line.hasPrefix("data: ") else { continue }
            let payload = String(line.dropFirst(6))

            if payload == "[DONE]" {
                isStreamComplete = true
                flushSentenceBuffer()
                restartSTTIfReady()
                return
            }

            guard let jsonData = payload.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                  let choices = json["choices"] as? [[String: Any]],
                  let delta = choices.first?["delta"] as? [String: Any],
                  let content = delta["content"] as? String else {
                continue
            }

            if llmLatencyMs == 0 {
                llmLatencyMs = (CFAbsoluteTimeGetCurrent() - llmStartTime) * 1000
                notifyLatencyUpdate()
            }

            fullResponse += content
            sentenceBuffer += content
            trySpeakCompleteSentences()
        }
    }

    fileprivate func handleSSEError(_ error: Error) {
        guard isConversationActive else { return }
        delegate?.pipelineDidEncounterError("API error: \(error.localizedDescription)")
    }

    fileprivate func handleSSEComplete() {
        isStreamComplete = true
        flushSentenceBuffer()
        // Emit the full assistant response so JS can save it
        let response = fullResponse.trimmingCharacters(in: .whitespacesAndNewlines)
        if !response.isEmpty {
            delegate?.pipelineDidReceiveAssistantResponse(response)
        }
        // If no TTS is pending (e.g. empty response), restart STT now
        restartSTTIfReady()
    }

    private func trySpeakCompleteSentences() {
        let sentenceEndings: [Character] = [".", "!", "?", "\n"]
        while let lastIndex = sentenceBuffer.lastIndex(where: { sentenceEndings.contains($0) }) {
            let sentenceEndPos = sentenceBuffer.index(after: lastIndex)
            let sentence = String(sentenceBuffer[sentenceBuffer.startIndex..<sentenceEndPos]).trimmingCharacters(in: .whitespacesAndNewlines)
            sentenceBuffer = String(sentenceBuffer[sentenceEndPos...])

            if !sentence.isEmpty {
                speakText(sentence)
            }
            break
        }
    }

    private func flushSentenceBuffer() {
        let remaining = sentenceBuffer.trimmingCharacters(in: .whitespacesAndNewlines)
        sentenceBuffer = ""
        if !remaining.isEmpty {
            speakText(remaining)
        }
    }

    private func speakText(_ text: String) {
        guard let tts = ttsProvider else {
            delegate?.pipelineDidEncounterError("No TTS provider configured")
            return
        }

        pendingTTSCount += 1
        print("[PipelineManager] Speaking text (pending: \(pendingTTSCount)): \(text.prefix(50))")
        ttsStartTime = CFAbsoluteTimeGetCurrent()
        tts.speak(
            text: text,
            onStart: { [weak self] in
                guard let self = self else { return }
                self.ttsLatencyMs = (CFAbsoluteTimeGetCurrent() - self.ttsStartTime) * 1000
                self.notifyLatencyUpdate()
                self.delegate?.pipelineDidStartSpeaking()
            },
            onComplete: { [weak self] in
                guard let self = self else { return }
                self.pendingTTSCount = max(0, self.pendingTTSCount - 1)
                print("[PipelineManager] TTS chunk complete (pending: \(self.pendingTTSCount), stream done: \(self.isStreamComplete))")
                self.delegate?.pipelineDidFinishSpeaking()
                self.restartSTTIfReady()
            },
            onError: { [weak self] message in
                guard let self = self else { return }
                self.pendingTTSCount = max(0, self.pendingTTSCount - 1)
                self.delegate?.pipelineDidEncounterError(message)
                self.restartSTTIfReady()
            }
        )
    }

    private func restartSTTIfReady() {
        guard isConversationActive, isStreamComplete, pendingTTSCount <= 0 else { return }
        isStreamComplete = false
        print("[PipelineManager] All TTS complete, restarting STT")
        startListening()
    }

    private func notifyLatencyUpdate() {
        delegate?.pipelineDidUpdateLatency(
            stt: sttLatencyMs,
            llm: llmLatencyMs,
            tts: ttsLatencyMs
        )
    }
}

// MARK: - SSE URLSession Delegate

private class SSEDelegate: NSObject, URLSessionDataDelegate {
    weak var manager: PipelineManager?

    init(manager: PipelineManager) {
        self.manager = manager
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        manager?.handleSSEData(data)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            if (error as NSError).code != NSURLErrorCancelled {
                manager?.handleSSEError(error)
            }
        } else {
            manager?.handleSSEComplete()
        }
    }
}
