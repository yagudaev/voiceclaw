import ExpoModulesCore
import Combine

// Forward declaration — Vapi SDK will be linked via SPM in the Xcode project
// import Vapi

public class ExpoVapiModule: Module {
  // private var vapi: Vapi.Vapi?
  // private var cancellables = Set<AnyCancellable>()
  private var isCallActive = false
  private var isMicMuted = false

  public func definition() -> ModuleDefinition {
    Name("ExpoVapi")

    Events(
      "onCallStart",
      "onCallEnd",
      "onTranscript",
      "onSpeechStart",
      "onSpeechEnd",
      "onError"
    )

    // Initialize Vapi with a public key
    AsyncFunction("initialize") { (publicKey: String) in
      // TODO: Uncomment when Vapi SDK is linked
      // self.vapi = Vapi.Vapi(publicKey: publicKey)
      // self.subscribeToEvents()
    }

    // Start a voice call
    AsyncFunction("startCall") { (assistantId: String, overrides: [String: Any]?) -> [String: Any] in
      guard !self.isCallActive else {
        throw Exception(name: "ERR_CALL_IN_PROGRESS", description: "A call is already in progress")
      }

      // TODO: Uncomment when Vapi SDK is linked
      // let response = try await self.vapi?.start(
      //   assistantId: assistantId,
      //   assistantOverrides: overrides ?? [:]
      // )

      self.isCallActive = true
      self.sendEvent("onCallStart", [:])

      // Simulate for now
      return ["callId": "stub-\(Date().timeIntervalSince1970)", "status": "started"]
    }

    // Stop the current call
    AsyncFunction("stopCall") { () in
      // TODO: Uncomment when Vapi SDK is linked
      // self.vapi?.stop()
      self.isCallActive = false
      self.sendEvent("onCallEnd", [:])
    }

    // Set microphone mute state
    AsyncFunction("setMuted") { (muted: Bool) in
      // TODO: Uncomment when Vapi SDK is linked
      // try await self.vapi?.setMuted(muted)
      self.isMicMuted = muted
    }

    // Check if a call is active
    Function("isCallActive") { () -> Bool in
      return self.isCallActive
    }

    // Check if microphone is muted
    Function("isMuted") { () -> Bool in
      return self.isMicMuted
    }

    // Send a text message during a call
    AsyncFunction("sendMessage") { (content: String) in
      // TODO: Uncomment when Vapi SDK is linked
      // let message = VapiMessage(type: "add-message", role: "user", content: content)
      // try await self.vapi?.send(message: message)
    }
  }

  // MARK: - Event subscription (uncomment when Vapi SDK is linked)

  /*
  private func subscribeToEvents() {
    guard let vapi = vapi else { return }

    vapi.eventPublisher
      .receive(on: DispatchQueue.main)
      .sink { [weak self] event in
        guard let self = self else { return }

        switch event {
        case .callDidStart:
          self.isCallActive = true
          self.sendEvent("onCallStart", [:])

        case .callDidEnd:
          self.isCallActive = false
          self.isMicMuted = false
          self.sendEvent("onCallEnd", [:])

        case .transcript(let transcript):
          self.sendEvent("onTranscript", [
            "role": transcript.role == .user ? "user" : "assistant",
            "text": transcript.transcript,
            "type": transcript.transcriptType == .final ? "final" : "partial"
          ])

        case .speechUpdate(let update):
          let role = update.role == .user ? "user" : "assistant"
          if update.status == .started {
            self.sendEvent("onSpeechStart", ["role": role])
          } else {
            self.sendEvent("onSpeechEnd", ["role": role])
          }

        case .error(let error):
          self.sendEvent("onError", [
            "message": error.localizedDescription
          ])

        default:
          break
        }
      }
      .store(in: &cancellables)
  }
  */
}
