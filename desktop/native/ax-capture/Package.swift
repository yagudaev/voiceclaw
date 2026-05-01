// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "ax-capture",
  platforms: [
    // Match Electron 41's minimum (macOS 11). Bumping forces unnecessary
    // OS-version gating on the smallest piece of the bundle.
    .macOS(.v11)
  ],
  targets: [
    .executableTarget(
      name: "AXCapture",
      path: "Sources/AXCapture"
    )
  ]
)
