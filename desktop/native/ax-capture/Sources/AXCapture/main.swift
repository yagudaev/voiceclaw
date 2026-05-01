import AppKit
import ApplicationServices
import Foundation

// JSON-line stdio protocol.
//
// Read one command per line on stdin, write one response per line on stdout.
//
// Commands:
//   {"cmd":"ping"}                 -> {"ok":true,"version":"1"}
//   {"cmd":"permission"}           -> {"ok":true,"granted":bool}
//   {"cmd":"capture"}              -> {"ok":true,"app":string,"window":string,
//                                       "elements":[{role,text,frame:{x,y,w,h}}]}
//                                  or {"ok":false,"error":"permission_denied"|"no_frontmost"|"ax_failed"}
//
// All responses include "id" if the command had one (for request matching on
// the Electron side). Responses are flushed immediately.

let MAX_ELEMENTS = 500
let MAX_TEXT_LEN = 400
let MAX_DEPTH = 25

setbuf(stdout, nil)
setbuf(stderr, nil)

while let line = readLine(strippingNewline: true) {
  guard let data = line.data(using: .utf8),
        let cmd = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  else {
    write(["ok": false, "error": "bad_json"])
    continue
  }
  let id = cmd["id"]
  switch cmd["cmd"] as? String {
  case "ping":
    write(merge(["ok": true, "version": "1"], id))
  case "permission":
    let granted = AXIsProcessTrusted()
    write(merge(["ok": true, "granted": granted], id))
  case "capture":
    write(merge(capture(), id))
  default:
    write(merge(["ok": false, "error": "unknown_cmd"], id))
  }
}

// --- helpers below ---

func capture() -> [String: Any] {
  guard AXIsProcessTrusted() else {
    return ["ok": false, "error": "permission_denied"]
  }
  guard let app = NSWorkspace.shared.frontmostApplication else {
    return ["ok": false, "error": "no_frontmost"]
  }
  let pid = app.processIdentifier
  let appName = app.localizedName ?? app.bundleIdentifier ?? "unknown"
  let axApp = AXUIElementCreateApplication(pid)

  var focused: CFTypeRef?
  let err = AXUIElementCopyAttributeValue(axApp, kAXFocusedWindowAttribute as CFString, &focused)
  if err != .success || focused == nil {
    // Fall back to first AXWindows entry. Some apps don't expose
    // AXFocusedWindow until interaction.
    var windowsRef: CFTypeRef?
    let werr = AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &windowsRef)
    if werr != .success {
      return ["ok": false, "error": "ax_failed", "axError": err.rawValue]
    }
    let windows = windowsRef as? [AXUIElement] ?? []
    guard let first = windows.first else {
      return ["ok": false, "error": "no_window"]
    }
    focused = first
  }
  // Safe cast: Accessibility implementations are inconsistent and a buggy
  // app could conceivably return something that isn't an AXUIElement.
  // Force-casting here would crash the sidecar; bail with ax_failed instead.
  guard CFGetTypeID(focused!) == AXUIElementGetTypeID() else {
    return ["ok": false, "error": "ax_failed"]
  }
  let window = focused as! AXUIElement

  var windowTitle = ""
  var titleRef: CFTypeRef?
  if AXUIElementCopyAttributeValue(window, kAXTitleAttribute as CFString, &titleRef) == .success,
     let s = titleRef as? String {
    windowTitle = s
  }

  var elements: [[String: Any]] = []
  walk(window, depth: 0, out: &elements)

  return [
    "ok": true,
    "app": appName,
    "pid": Int(pid),
    "window": windowTitle,
    "elements": elements,
    "truncated": elements.count >= MAX_ELEMENTS,
  ]
}

func walk(_ el: AXUIElement, depth: Int, out: inout [[String: Any]]) {
  if out.count >= MAX_ELEMENTS { return }
  if depth > MAX_DEPTH { return }

  let role = stringAttr(el, kAXRoleAttribute) ?? ""
  let text = readableText(el)
  if !text.isEmpty {
    let frame = elementFrame(el)
    var entry: [String: Any] = ["role": role, "text": truncate(text, MAX_TEXT_LEN)]
    if let f = frame { entry["frame"] = f }
    out.append(entry)
    if out.count >= MAX_ELEMENTS { return }
  }

  var childrenRef: CFTypeRef?
  if AXUIElementCopyAttributeValue(el, kAXChildrenAttribute as CFString, &childrenRef) == .success,
     let children = childrenRef as? [AXUIElement] {
    for c in children {
      if out.count >= MAX_ELEMENTS { return }
      walk(c, depth: depth + 1, out: &out)
    }
  }
}

// Pull whichever attribute carries human-readable text for this element.
// AXValue is for fields/text areas; AXTitle for buttons/menus; AXDescription
// for icons/images; AXHelp / AXPlaceholderValue as fallbacks.
func readableText(_ el: AXUIElement) -> String {
  for attr in [kAXValueAttribute, kAXTitleAttribute, kAXDescriptionAttribute,
               kAXHelpAttribute, kAXPlaceholderValueAttribute as CFString] as [Any] {
    let key = attr as! CFString
    if let s = stringAttr(el, key as String), !s.isEmpty { return s }
  }
  return ""
}

func stringAttr(_ el: AXUIElement, _ key: String) -> String? {
  var ref: CFTypeRef?
  if AXUIElementCopyAttributeValue(el, key as CFString, &ref) == .success {
    return ref as? String
  }
  return nil
}

func elementFrame(_ el: AXUIElement) -> [String: Double]? {
  var posRef: CFTypeRef?
  var sizeRef: CFTypeRef?
  guard AXUIElementCopyAttributeValue(el, kAXPositionAttribute as CFString, &posRef) == .success,
        AXUIElementCopyAttributeValue(el, kAXSizeAttribute as CFString, &sizeRef) == .success
  else { return nil }
  guard let posVal = posRef, let sizeVal = sizeRef else { return nil }
  // Safe cast: a non-AXValue here would force-crash. Apps occasionally
  // return malformed types for these attributes; skipping the frame is
  // strictly preferable to taking down the sidecar.
  guard CFGetTypeID(posVal) == AXValueGetTypeID(),
        CFGetTypeID(sizeVal) == AXValueGetTypeID() else { return nil }
  var pos = CGPoint.zero
  var size = CGSize.zero
  AXValueGetValue(posVal as! AXValue, .cgPoint, &pos)
  AXValueGetValue(sizeVal as! AXValue, .cgSize, &size)
  return ["x": Double(pos.x), "y": Double(pos.y), "w": Double(size.width), "h": Double(size.height)]
}

func truncate(_ s: String, _ n: Int) -> String {
  if s.count <= n { return s }
  let idx = s.index(s.startIndex, offsetBy: n)
  return String(s[..<idx]) + "…"
}

func merge(_ base: [String: Any], _ id: Any?) -> [String: Any] {
  var out = base
  if let id = id { out["id"] = id }
  return out
}

func write(_ obj: [String: Any]) {
  if let data = try? JSONSerialization.data(withJSONObject: obj, options: []),
     let s = String(data: data, encoding: .utf8) {
    print(s)
  }
}
