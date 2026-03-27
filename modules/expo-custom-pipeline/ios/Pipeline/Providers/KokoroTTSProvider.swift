import Foundation

// Future: mlalma/kokoro-ios MLX Swift, 327MB model, iOS 18+

class KokoroTTSProvider: TTSProvider {
    let name = "Kokoro TTS"
    private(set) var isSpeaking = false
    private(set) var latencyMs: Double = 0

    // MARK: - TTSProvider

    func speak(text: String, onStart: @escaping () -> Void, onComplete: @escaping () -> Void) {
        print("[Kokoro] Not yet implemented")
        onComplete()
    }

    func stop() {
        print("[Kokoro] Not yet implemented")
    }
}
