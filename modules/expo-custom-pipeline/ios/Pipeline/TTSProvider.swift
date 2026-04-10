import Foundation

protocol TTSProvider {
    var name: String { get }
    var isSpeaking: Bool { get }
    var latencyMs: Double { get }
    /// Synthesize and play `text`. `previousText` provides the text that was
    /// spoken immediately before this utterance so providers that support it
    /// (e.g. ElevenLabs `previous_text`) can maintain prosodic continuity.
    func speak(text: String, previousText: String?, onStart: @escaping () -> Void, onComplete: @escaping () -> Void, onError: @escaping (String) -> Void)
    func stop()
}
