import Foundation

protocol STTProvider {
    var name: String { get }
    var isListening: Bool { get }
    var latencyMs: Double { get }
    func startListening(onPartialResult: @escaping (String) -> Void, onFinalResult: @escaping (String) -> Void)
    func stopListening()
}
