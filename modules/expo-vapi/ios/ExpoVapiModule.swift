import ExpoModulesCore
import Combine

public class ExpoVapiModule: Module {
  private var vapi: Vapi?
  private var cancellables = Set<AnyCancellable>()
  private var callActive = false
  private var micMuted = false

  public func definition() -> ModuleDefinition {
    Name("ExpoVapi")

    Events(
      "onCallStart",
      "onCallEnd",
      "onTranscript",
      "onSpeechStart",
      "onSpeechEnd",
      "onFunctionCall",
      "onError"
    )

    AsyncFunction("initialize") { (publicKey: String) in
      self.vapi = Vapi(publicKey: publicKey)
      self.subscribeToEvents()
    }

    AsyncFunction("startCall") { (assistantId: String, overrides: [String: Any]?) -> [String: Any] in
      guard let vapi = self.vapi else {
        throw Exception(name: "ERR_NOT_INITIALIZED", description: "Call initialize() first")
      }

      let response = try await vapi.start(
        assistantId: assistantId,
        assistantOverrides: overrides ?? [:]
      )

      return ["callId": response.id, "status": "started"]
    }

    AsyncFunction("stopCall") { () in
      self.vapi?.stop()
    }

    AsyncFunction("setMuted") { (muted: Bool) in
      try await self.vapi?.setMuted(muted)
      self.micMuted = muted
    }

    Function("isCallActive") { () -> Bool in
      return self.callActive
    }

    Function("isMuted") { () -> Bool in
      return self.micMuted
    }

    AsyncFunction("sendMessage") { (content: String) in
      let message = VapiMessage(type: "add-message", role: "user", content: content)
      try await self.vapi?.send(message: message)
    }

    AsyncFunction("sendFunctionCallResult") { (name: String, result: String) in
      guard let vapi = self.vapi else {
        throw Exception(name: "ERR_NOT_INITIALIZED", description: "Call initialize() first")
      }
      let message = VapiFunctionCallResultMessage(name: name, result: result)
      try await vapi.sendRaw(message: message)
    }
  }

  private func subscribeToEvents() {
    guard let vapi = vapi else { return }

    vapi.eventPublisher
      .receive(on: DispatchQueue.main)
      .sink { [weak self] event in
        self?.handleVapiEvent(event)
      }
      .store(in: &cancellables)
  }

  private func handleVapiEvent(_ event: Vapi.Event) {
    switch event {
    case .callDidStart:
      self.callActive = true
      self.sendEvent("onCallStart", [:])

    case .callDidEnd:
      self.callActive = false
      self.micMuted = false
      self.sendEvent("onCallEnd", [:])

    case .transcript(let transcript):
      self.handleTranscript(transcript)

    case .speechUpdate(let update):
      self.handleSpeechUpdate(update)

    case .functionCall(let functionCall):
      self.handleFunctionCall(functionCall)

    case .error(let error):
      print("[Vapi] Error: \(error.localizedDescription)")
      self.sendEvent("onError", ["message": error.localizedDescription])

    case .hang:
      print("[Vapi] Hang event received (not ending call — letting server handle disconnect)")

    case .statusUpdate(let status):
      print("[Vapi] Status: \(status.status)")

    case .conversationUpdate(let update):
      print("[Vapi] Conversation updated: \(update.conversation.count) messages")

    case .modelOutput(let output):
      print("[Vapi] Model output: \(output.output.prefix(100))")

    default:
      print("[Vapi] Unhandled event: \(event)")
    }
  }

  private func handleTranscript(_ transcript: Transcript) {
    self.sendEvent("onTranscript", [
      "role": transcript.role == .user ? "user" : "assistant",
      "text": transcript.transcript,
      "type": transcript.transcriptType == .final ? "final" : "partial"
    ])
  }

  private func handleSpeechUpdate(_ update: SpeechUpdate) {
    let role = update.role == .user ? "user" : "assistant"
    if update.status == .started {
      self.sendEvent("onSpeechStart", ["role": role])
    } else {
      self.sendEvent("onSpeechEnd", ["role": role])
    }
  }

  private func handleFunctionCall(_ functionCall: FunctionCall) {
    var params: [String: Any] = [:]
    for (key, value) in functionCall.parameters {
      params[key] = value
    }
    self.sendEvent("onFunctionCall", [
      "name": functionCall.name,
      "parameters": params
    ])
  }
}
