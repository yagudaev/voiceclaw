import ExpoModulesCore
import AVFoundation

public class ExpoRealtimeAudioModule: Module {
    private var audioManager: RealtimeAudioManager?

    public func definition() -> ModuleDefinition {
        Name("ExpoRealtimeAudio")

        Events("onAudioCaptured", "onError")

        OnCreate {
            self.audioManager = RealtimeAudioManager { [weak self] base64Audio in
                self?.sendEvent("onAudioCaptured", ["data": base64Audio])
            } onError: { [weak self] message in
                self?.sendEvent("onError", ["message": message])
            }
        }

        Function("startCapture") { () in
            do {
                try self.audioManager?.startCapture()
            } catch {
                self.sendEvent("onError", ["message": error.localizedDescription])
            }
        }

        Function("stopCapture") { () in
            self.audioManager?.stopCapture()
        }

        Function("playAudio") { (data: String) in
            self.audioManager?.playAudio(base64Data: data)
        }

        Function("stopPlayback") { () in
            self.audioManager?.stopPlayback()
        }
    }
}
