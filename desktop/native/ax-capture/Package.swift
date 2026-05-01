// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "ax-capture",
  platforms: [
    .macOS(.v12)
  ],
  targets: [
    .executableTarget(
      name: "AXCapture",
      path: "Sources/AXCapture"
    )
  ]
)
