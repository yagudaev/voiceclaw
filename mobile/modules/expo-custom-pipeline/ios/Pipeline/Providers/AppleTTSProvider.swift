import AVFoundation

/// Apple AVSpeechSynthesizer TTS provider.
///
/// Latency measurement (native-side, informational):
///   Start  – `speak()` called (`speakStartTime`)
///   End    – `didStart` delegate callback (first audio frame playing)
/// The authoritative TTS latency is measured in use-pipeline.ts:
///   Start  – `speakSentence()` records `Date.now()` into `speakStartTimesRef`
///   End    – `onTTSStart` event fires (maps to the native `didStart` callback)
class AppleTTSProvider: NSObject, TTSProvider {
    let name = "Apple TTS"
    private(set) var isSpeaking = false
    private(set) var latencyMs: Double = 0

    private let synthesizer = AVSpeechSynthesizer()
    private var voice: AVSpeechSynthesisVoice?
    private var onStartCallback: (() -> Void)?
    private var onCompleteCallback: (() -> Void)?
    private var speakStartTime: CFAbsoluteTime = 0

    override init() {
        super.init()
        synthesizer.delegate = self
        voice = resolveVoice()
    }

    // MARK: - TTSProvider

    func speak(text: String, previousText: String? = nil, onStart: @escaping () -> Void, onComplete: @escaping () -> Void, onError: @escaping (String) -> Void) {
        onStartCallback = onStart
        onCompleteCallback = onComplete

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate

        speakStartTime = CFAbsoluteTimeGetCurrent()
        isSpeaking = true
        synthesizer.speak(utterance)
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
        onStartCallback = nil
        onCompleteCallback = nil
    }
}

// MARK: - AVSpeechSynthesizerDelegate

extension AppleTTSProvider: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        latencyMs = (CFAbsoluteTimeGetCurrent() - speakStartTime) * 1000
        onStartCallback?()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        isSpeaking = false
        onCompleteCallback?()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        isSpeaking = false
        onCompleteCallback?()
    }
}

// MARK: - Helpers

private extension AppleTTSProvider {
    func resolveVoice() -> AVSpeechSynthesisVoice? {
        // Premium Zoe
        if let premium = AVSpeechSynthesisVoice(identifier: "com.apple.voice.premium.en-US.Zoe") {
            return premium
        }
        // Enhanced Zoe
        if let enhanced = AVSpeechSynthesisVoice(identifier: "com.apple.voice.enhanced.en-US.Zoe") {
            return enhanced
        }
        // Default English
        return AVSpeechSynthesisVoice(language: "en-US")
    }
}
