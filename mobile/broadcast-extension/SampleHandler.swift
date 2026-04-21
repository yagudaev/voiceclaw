//
// SampleHandler.swift
//
// Broadcast Upload Extension for VoiceClaw. Captures the full device screen
// (including when the host app is backgrounded) at 1 FPS, encodes each frame
// as JPEG, writes it to the shared App Group container, and posts a Darwin
// notification so the host app can read it and send it over its active
// realtime WebSocket.
//
// The host app reads frames in ScreenCaptureManager.handleBroadcastFrameNotification
// (see mobile/modules/expo-screen-capture/ios/ScreenCaptureManager.swift).
//
// Keep constants here in sync with ScreenCaptureManager.

import ReplayKit
import UIKit
import CoreImage
import CoreVideo

private let APP_GROUP_ID = "group.com.yagudaev.voiceclaw.broadcast"
private let FRAME_FILENAME = "latest-frame.jpg"
private let HEARTBEAT_FILENAME = "heartbeat.txt"
private let FRAME_COUNTER_FILENAME = "frame-id.txt"
private let DARWIN_FRAME_NOTIFICATION = "com.yagudaev.voiceclaw.broadcast.frame" as CFString

private let MAX_DIMENSION: CGFloat = 768
private let CAPTURE_INTERVAL: TimeInterval = 1.0
private let JPEG_QUALITY: CGFloat = 0.7

class SampleHandler: RPBroadcastSampleHandler {
    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])
    private var frameCounter: Int = 0
    private var lastFrameAt: TimeInterval = 0
    private let writeQueue = DispatchQueue(label: "voiceclaw.broadcast.write", qos: .userInitiated)

    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        touchHeartbeat()
    }

    override func broadcastPaused() {
        // Nothing to flush — we write on every sample buffer.
    }

    override func broadcastResumed() {
        touchHeartbeat()
    }

    override func broadcastFinished() {
        // Best-effort cleanup: remove the heartbeat so the app stops treating us
        // as live. Frame file is left behind; it'll be overwritten next session.
        guard let url = sharedURL() else { return }
        try? FileManager.default.removeItem(at: url.appendingPathComponent(HEARTBEAT_FILENAME))
    }

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        guard sampleBufferType == .video else { return }

        let now = Date().timeIntervalSince1970
        if now - lastFrameAt < CAPTURE_INTERVAL { return }
        lastFrameAt = now

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

        let id = frameCounter + 1
        frameCounter = id
        writeQueue.async { [weak self] in
            self?.writeFrame(jpegData, id: id)
        }
    }

    private func writeFrame(_ data: Data, id: Int) {
        guard let url = sharedURL() else { return }
        let frameURL = url.appendingPathComponent(FRAME_FILENAME)
        let counterURL = url.appendingPathComponent(FRAME_COUNTER_FILENAME)

        do {
            try data.write(to: frameURL, options: .atomic)
            try String(id).write(to: counterURL, atomically: true, encoding: .utf8)
            touchHeartbeat()
            CFNotificationCenterPostNotification(
                CFNotificationCenterGetDarwinNotifyCenter(),
                CFNotificationName(DARWIN_FRAME_NOTIFICATION),
                nil,
                nil,
                true
            )
        } catch {
            // Swallow — next frame will try again. Extensions have a 50MB cap
            // so we don't want to throw and kill the broadcast session.
        }
    }

    private func touchHeartbeat() {
        guard let url = sharedURL() else { return }
        let heartbeatURL = url.appendingPathComponent(HEARTBEAT_FILENAME)
        let ts = String(Date().timeIntervalSince1970)
        try? ts.write(to: heartbeatURL, atomically: true, encoding: .utf8)
    }

    private func sharedURL() -> URL? {
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: APP_GROUP_ID)
    }
}
