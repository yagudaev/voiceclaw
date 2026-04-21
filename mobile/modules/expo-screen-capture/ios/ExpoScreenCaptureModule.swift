import ExpoModulesCore
import ReplayKit

public class ExpoScreenCaptureModule: Module {
    private var manager: ScreenCaptureManager?

    public func definition() -> ModuleDefinition {
        Name("ExpoScreenCapture")

        Events("onFrame", "onError", "onStateChange")

        OnCreate {
            self.manager = ScreenCaptureManager(
                onFrame: { [weak self] data, width, height in
                    self?.sendEvent("onFrame", [
                        "data": data,
                        "width": width,
                        "height": height,
                    ])
                },
                onError: { [weak self] message, code in
                    self?.sendEvent("onError", [
                        "message": message,
                        "code": code ?? "",
                    ])
                },
                onState: { [weak self] state, source in
                    self?.sendEvent("onStateChange", [
                        "state": state,
                        "source": source,
                    ])
                }
            )
        }

        OnDestroy {
            self.manager?.shutdown()
        }

        Function("isAvailable") { () -> Bool in
            return RPScreenRecorder.shared().isAvailable
        }

        AsyncFunction("startInAppCapture") { (promise: Promise) in
            self.manager?.startInAppCapture { error in
                if let error = error {
                    promise.reject("SCREEN_CAPTURE_ERROR", error.localizedDescription)
                } else {
                    promise.resolve(nil)
                }
            }
        }

        AsyncFunction("stopInAppCapture") { (promise: Promise) in
            self.manager?.stopInAppCapture { error in
                if let error = error {
                    promise.reject("SCREEN_CAPTURE_ERROR", error.localizedDescription)
                } else {
                    promise.resolve(nil)
                }
            }
        }

        Function("presentBroadcastPicker") {
            DispatchQueue.main.async {
                self.manager?.presentBroadcastPicker()
            }
        }

        Function("startBroadcastBridge") {
            self.manager?.startBroadcastBridge()
        }

        Function("stopBroadcastBridge") {
            self.manager?.stopBroadcastBridge()
        }

        Function("isBroadcasting") { () -> Bool in
            return self.manager?.isBroadcasting() ?? false
        }
    }
}
