import ExpoModulesCore
import AVFoundation

public class ExpoRealtimeAudioModule: Module {
    private var audioManager: RealtimeAudioManager?

    public func definition() -> ModuleDefinition {
        Name("ExpoRealtimeAudio")

        Events("onAudioCaptured", "onError", "onLog", "onRmsMetrics")

        OnCreate {
            self.audioManager = RealtimeAudioManager(
                onAudioCaptured: { [weak self] base64Audio in
                    self?.sendEvent("onAudioCaptured", ["data": base64Audio])
                },
                onError: { [weak self] message in
                    self?.sendEvent("onError", ["message": message])
                },
                onLog: { [weak self] message in
                    self?.sendEvent("onLog", ["message": message])
                },
                onRmsMetrics: { [weak self] rms, playbackActive, gated, threshold, route in
                    self?.sendEvent("onRmsMetrics", [
                        "rms": rms,
                        "playbackActive": playbackActive,
                        "gated": gated,
                        "threshold": threshold,
                        "route": route,
                    ])
                }
            )
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

        Function("setVolume") { (volume: Float) in
            self.audioManager?.setVolume(volume)
        }

        Function("setEchoGateEnabled") { (enabled: Bool) in
            self.audioManager?.setEchoGateEnabled(enabled)
        }

        Function("setEchoGateThreshold") { (threshold: Float) in
            self.audioManager?.setEchoGateThreshold(threshold)
        }

        Function("setDebugMetricsEnabled") { (enabled: Bool) in
            self.audioManager?.setDebugMetricsEnabled(enabled)
        }
    }
}
