import Foundation
import ReplayKit
import UIKit
import CoreImage
import CoreVideo

// Matches desktop's /desktop/src/renderer/src/lib/screen-capture.ts
private let MAX_DIMENSION: CGFloat = 768
private let CAPTURE_INTERVAL_MS: TimeInterval = 1.0  // 1 FPS
private let JPEG_QUALITY: CGFloat = 0.7

// Shared App Group + file paths used by the broadcast extension to drop frames
// into a container the main app can read. Keep in sync with the extension's
// SampleHandler.swift.
private let APP_GROUP_ID = "group.com.yagudaev.voiceclaw.broadcast"
private let FRAME_FILENAME = "latest-frame.jpg"
private let HEARTBEAT_FILENAME = "heartbeat.txt"
private let FRAME_COUNTER_FILENAME = "frame-id.txt"
private let DARWIN_FRAME_NOTIFICATION = "com.yagudaev.voiceclaw.broadcast.frame" as CFString

// Heartbeat older than this means the extension isn't running anymore.
private let HEARTBEAT_STALE_SECONDS: TimeInterval = 3.0

final class ScreenCaptureManager {
    private let onFrame: (String, Int, Int) -> Void
    private let onError: (String, String?) -> Void
    private let onState: (String, String) -> Void

    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])
    private let encodeQueue = DispatchQueue(label: "expo.screencapture.encode", qos: .userInitiated)

    private var inAppCaptureActive = false
    private var lastInAppFrameAt: TimeInterval = 0

    private var bridgeActive = false
    private var lastBroadcastFrameId: Int = -1

    init(
        onFrame: @escaping (String, Int, Int) -> Void,
        onError: @escaping (String, String?) -> Void,
        onState: @escaping (String, String) -> Void
    ) {
        self.onFrame = onFrame
        self.onError = onError
        self.onState = onState
    }

    func shutdown() {
        if inAppCaptureActive {
            RPScreenRecorder.shared().stopCapture { _ in }
            inAppCaptureActive = false
        }
        stopBroadcastBridge()
    }

    // MARK: - In-app capture (RPScreenRecorder)

    func startInAppCapture(completion: @escaping (Error?) -> Void) {
        let recorder = RPScreenRecorder.shared()
        guard recorder.isAvailable else {
            let err = NSError(domain: "ExpoScreenCapture", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Screen recording is not available on this device",
            ])
            onError(err.localizedDescription, "NOT_AVAILABLE")
            completion(err)
            return
        }
        if recorder.isRecording || inAppCaptureActive {
            completion(nil)
            return
        }

        recorder.isMicrophoneEnabled = false
        recorder.isCameraEnabled = false
        onState("starting", "in-app")

        recorder.startCapture(handler: { [weak self] sampleBuffer, bufferType, error in
            guard let self = self else { return }
            if let error = error {
                self.onError(error.localizedDescription, "CAPTURE_HANDLER_ERROR")
                return
            }
            guard bufferType == .video else { return }

            let now = Date().timeIntervalSince1970
            if now - self.lastInAppFrameAt < CAPTURE_INTERVAL_MS { return }
            self.lastInAppFrameAt = now

            // Retain the buffer across the async hop to the encode queue.
            let retained = sampleBuffer as CMSampleBuffer
            self.encodeQueue.async {
                self.encodeSampleBuffer(retained)
            }
        }, completionHandler: { [weak self] error in
            guard let self = self else { return }
            if let error = error {
                self.onError(error.localizedDescription, "START_CAPTURE_FAILED")
                self.onState("idle", "none")
                completion(error)
            } else {
                self.inAppCaptureActive = true
                self.onState("active", "in-app")
                completion(nil)
            }
        })
    }

    func stopInAppCapture(completion: @escaping (Error?) -> Void) {
        let recorder = RPScreenRecorder.shared()
        guard inAppCaptureActive || recorder.isRecording else {
            completion(nil)
            return
        }
        onState("stopping", "in-app")
        recorder.stopCapture { [weak self] error in
            guard let self = self else { return }
            self.inAppCaptureActive = false
            self.onState("idle", "none")
            if let error = error {
                self.onError(error.localizedDescription, "STOP_CAPTURE_FAILED")
                completion(error)
            } else {
                completion(nil)
            }
        }
    }

    // MARK: - Broadcast picker (system UI)

    func presentBroadcastPicker() {
        // RPSystemBroadcastPickerView renders a button that, when tapped, shows
        // the system broadcast picker. We programmatically trigger the tap so the
        // app can expose the picker via a plain JS-initiated call.
        let picker = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 60, height: 60))
        picker.showsMicrophoneButton = false
        // Filter to our extension bundle id. Set via APP_VARIANT-derived suffix.
        let extBundleId = broadcastExtensionBundleId()
        if !extBundleId.isEmpty {
            picker.preferredExtension = extBundleId
        }

        // Attach to a host window so the picker can present.
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow }) else {
            onError("No key window to present broadcast picker", "NO_WINDOW")
            return
        }
        picker.isHidden = true
        window.addSubview(picker)

        // Find the inner UIButton and invoke it.
        if let button = picker.subviews.compactMap({ $0 as? UIButton }).first {
            button.sendActions(for: .touchUpInside)
        } else {
            // Fallback: UIKit sometimes wraps the button deeper.
            for sub in picker.subviews {
                for inner in sub.subviews {
                    if let btn = inner as? UIButton {
                        btn.sendActions(for: .touchUpInside)
                        break
                    }
                }
            }
        }

        // Remove after the system UI has had a chance to appear.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            picker.removeFromSuperview()
        }
    }

    // MARK: - Broadcast bridge (reads frames written by the broadcast extension)

    func startBroadcastBridge() {
        if bridgeActive { return }
        bridgeActive = true
        lastBroadcastFrameId = readCurrentFrameId()
        onState("active", "broadcast")

        // Subscribe to Darwin notifications posted by the extension.
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        let observer = UnsafeRawPointer(Unmanaged.passUnretained(self).toOpaque())
        CFNotificationCenterAddObserver(
            center,
            observer,
            { (_, observer, _, _, _) in
                guard let observer = observer else { return }
                let me = Unmanaged<ScreenCaptureManager>.fromOpaque(observer).takeUnretainedValue()
                me.handleBroadcastFrameNotification()
            },
            DARWIN_FRAME_NOTIFICATION,
            nil,
            .deliverImmediately
        )
    }

    func stopBroadcastBridge() {
        if !bridgeActive { return }
        bridgeActive = false

        let center = CFNotificationCenterGetDarwinNotifyCenter()
        let observer = UnsafeRawPointer(Unmanaged.passUnretained(self).toOpaque())
        CFNotificationCenterRemoveEveryObserver(center, observer)

        onState("idle", "none")
    }

    func isBroadcasting() -> Bool {
        guard let url = sharedContainerURL() else { return false }
        let heartbeat = url.appendingPathComponent(HEARTBEAT_FILENAME)
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: heartbeat.path),
              let modified = attrs[.modificationDate] as? Date else { return false }
        return Date().timeIntervalSince(modified) < HEARTBEAT_STALE_SECONDS
    }

    // MARK: - Helpers

    private func handleBroadcastFrameNotification() {
        encodeQueue.async { [weak self] in
            guard let self = self, self.bridgeActive else { return }
            let currentId = self.readCurrentFrameId()
            if currentId == self.lastBroadcastFrameId { return }
            self.lastBroadcastFrameId = currentId

            guard let url = self.sharedContainerURL() else { return }
            let frameURL = url.appendingPathComponent(FRAME_FILENAME)
            guard let data = try? Data(contentsOf: frameURL) else { return }
            guard let image = UIImage(data: data) else { return }

            let base64 = data.base64EncodedString()
            let width = Int(image.size.width)
            let height = Int(image.size.height)
            DispatchQueue.main.async {
                self.onFrame(base64, width, height)
            }
        }
    }

    private func readCurrentFrameId() -> Int {
        guard let url = sharedContainerURL() else { return -1 }
        let idURL = url.appendingPathComponent(FRAME_COUNTER_FILENAME)
        guard let str = try? String(contentsOf: idURL, encoding: .utf8) else { return -1 }
        return Int(str.trimmingCharacters(in: .whitespacesAndNewlines)) ?? -1
    }

    private func sharedContainerURL() -> URL? {
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: APP_GROUP_ID)
    }

    private func broadcastExtensionBundleId() -> String {
        guard let mainBundleId = Bundle.main.bundleIdentifier else { return "" }
        return "\(mainBundleId).BroadcastUpload"
    }

    private func encodeSampleBuffer(_ sampleBuffer: CMSampleBuffer) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let sourceExtent = ciImage.extent
        guard sourceExtent.width > 0, sourceExtent.height > 0 else { return }

        let scale = min(MAX_DIMENSION / sourceExtent.width, MAX_DIMENSION / sourceExtent.height, 1.0)
        let scaledImage = ciImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        let targetExtent = scaledImage.extent
        guard let cgImage = ciContext.createCGImage(scaledImage, from: targetExtent) else { return }

        let uiImage = UIImage(cgImage: cgImage, scale: 1.0, orientation: .up)
        guard let jpegData = uiImage.jpegData(compressionQuality: JPEG_QUALITY) else { return }

        let base64 = jpegData.base64EncodedString()
        let width = Int(targetExtent.width)
        let height = Int(targetExtent.height)
        DispatchQueue.main.async { [weak self] in
            self?.onFrame(base64, width, height)
        }
    }
}
