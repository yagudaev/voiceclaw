import Foundation

protocol TTSProvider {
    var name: String { get }
    var isSpeaking: Bool { get }
    var latencyMs: Double { get }
    func speak(text: String, onStart: @escaping () -> Void, onComplete: @escaping () -> Void, onError: @escaping (String) -> Void)
    func stop()
}
