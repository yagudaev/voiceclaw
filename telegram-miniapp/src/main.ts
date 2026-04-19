// Telegram mini app entrypoint.
// Flow: Telegram.WebApp provides initData → POST to relay /auth/telegram →
// receive a ticket → open WSS to relay /ws and stream audio.
//
// Relay URL comes from the query string (?relay=https://alice-relay.example).
// The bot composes that URL per user in /call.

import { RealtimeClient } from "./realtime-client"

const DEFAULT_MODEL = "gemini-2.5-flash-native-audio-preview-09-2025"
const DEFAULT_VOICE = "Aoede"

type Status = "idle" | "connecting" | "live" | "reconnecting" | "closed"

const statusEl = requireEl<HTMLDivElement>("status")
const callBtn = requireEl<HTMLButtonElement>("callButton")
const callLabel = requireEl<HTMLSpanElement>("callButtonLabel")
const muteBtn = requireEl<HTMLButtonElement>("muteButton")
const transcriptEl = requireEl<HTMLElement>("transcript")
const setupEl = requireEl<HTMLElement>("setup")
const setupMsgEl = requireEl<HTMLParagraphElement>("setupMessage")

const tg = window.Telegram?.WebApp
tg?.ready()
tg?.expand()

const relayBase = resolveRelayBase()
const startParamName = resolveAgentNameFromStartParam()

let currentStatus: Status = "idle"
let isCalling = false
let muted = false
let lastTranscriptRole: "user" | "assistant" | null = null
let lastTranscriptTextNode: Text | null = null
let agentLabel = startParamName ?? "Agent"

const TICKET_REUSE_WINDOW_MS = 4 * 60 * 1000
let cachedAuth: { ticket: string, sessionKey: string, mintedAt: number } | null = null

const client = new RealtimeClient({
  onStatus: (status) => {
    currentStatus = status
    renderStatus(status)
    if (status === "live") {
      setCallLabel("End call", true)
    } else if (status === "closed") {
      isCalling = false
      setCallLabel("Start call", false)
      muteBtn.hidden = true
    }
  },
  onTranscriptDelta: (text, role) => appendTranscript(role, text),
  onError: (message) => {
    renderStatus("error", message)
    isCalling = false
    setCallLabel("Start call", false)
    muteBtn.hidden = true
  },
})

callBtn.addEventListener("click", () => {
  if (isCalling) {
    client.stop()
    return
  }
  void startCall()
})

muteBtn.addEventListener("click", () => {
  muted = !muted
  client.setMuted(muted)
  muteBtn.classList.toggle("muted", muted)
  muteBtn.textContent = muted ? "Unmute" : "Mute"
})

if (!relayBase) {
  disableCall("No relay URL provided. Open this mini app from the bot — it attaches your relay URL automatically.")
} else if (!tg?.initData) {
  disableCall("Mini app must be opened inside Telegram. Launch it from the bot's /call command.")
}

async function startCall() {
  if (!relayBase || !tg?.initData) return
  isCalling = true
  setCallLabel("Connecting…", true)
  renderStatus("connecting")
  lastTranscriptRole = null
  lastTranscriptTextNode = null

  let ticket: string
  let sessionKey: string
  if (cachedAuth && Date.now() - cachedAuth.mintedAt < TICKET_REUSE_WINDOW_MS) {
    ticket = cachedAuth.ticket
    sessionKey = cachedAuth.sessionKey
  } else {
    try {
      const authRes = await fetch(`${relayBase}/auth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      })
      if (!authRes.ok) {
        const text = await authRes.text()
        throw new Error(`auth failed: ${authRes.status} ${text}`)
      }
      const payload = await authRes.json() as {
        ticket: string
        sessionKey: string
        bot?: { firstName?: string } | null
      }
      ticket = payload.ticket
      sessionKey = payload.sessionKey
      cachedAuth = { ticket, sessionKey, mintedAt: Date.now() }
      if (!startParamName && payload.bot?.firstName) agentLabel = stripBotSuffix(payload.bot.firstName)
    } catch (err) {
      const message = err instanceof Error ? err.message : "auth failed"
      console.error("[miniapp] auth error", err)
      renderStatus("error", `Auth failed: ${message}`)
      isCalling = false
      setCallLabel("Start call", false)
      return
    }
  }

  const wsUrl = toWsUrl(relayBase) + "/ws"
  tg?.HapticFeedback?.impactOccurred("light")

  try {
    await client.start({
      serverUrl: wsUrl,
      voice: DEFAULT_VOICE,
      model: DEFAULT_MODEL,
      brainAgent: "enabled",
      apiKey: ticket,
      sessionKey,
      deviceContext: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        deviceModel: "telegram-miniapp",
      },
    })
    muteBtn.hidden = false
  } catch (err) {
    const message = err instanceof Error ? err.message : "connection failed"
    console.error("[miniapp] start error", err)
    renderStatus("error", message)
    isCalling = false
    setCallLabel("Start call", false)
  }
}

function appendTranscript(role: "user" | "assistant", text: string) {
  if (lastTranscriptRole === role && lastTranscriptTextNode) {
    lastTranscriptTextNode.data += text
  } else {
    const line = document.createElement("div")
    line.className = `line ${role}`
    const label = document.createElement("span")
    label.className = "role"
    label.textContent = role === "user" ? "You:" : `${agentLabel}:`
    const textNode = document.createTextNode(text)
    line.appendChild(label)
    line.appendChild(textNode)
    transcriptEl.appendChild(line)
    lastTranscriptRole = role
    lastTranscriptTextNode = textNode
  }
  transcriptEl.scrollTop = transcriptEl.scrollHeight
}

function renderStatus(kind: Status | "error", detail?: string) {
  statusEl.classList.remove("ok", "error", "connecting")
  switch (kind) {
    case "connecting":
      statusEl.classList.add("connecting")
      statusEl.textContent = "Connecting…"
      break
    case "reconnecting":
      statusEl.classList.add("connecting")
      statusEl.textContent = "Reconnecting…"
      break
    case "live":
      statusEl.classList.add("ok")
      statusEl.textContent = "Live"
      break
    case "closed":
      statusEl.textContent = "Idle"
      break
    case "error":
      statusEl.classList.add("error")
      statusEl.textContent = detail ? `Error: ${detail}` : "Error"
      break
    default:
      statusEl.textContent = "Idle"
  }
  void currentStatus
}

function setCallLabel(label: string, active: boolean) {
  callLabel.textContent = label
  callBtn.classList.toggle("active", active)
}

function disableCall(reason: string) {
  callBtn.disabled = true
  setupEl.hidden = false
  setupMsgEl.textContent = reason
}

function resolveRelayBase(): string | null {
  const params = new URLSearchParams(window.location.search)
  const direct = params.get("relay")
  if (direct) return normalizeRelayUrl(direct)

  // Fallback: Telegram passes a `start_param` when launched via t.me link.
  const startParam = tg?.initDataUnsafe?.start_param
  if (startParam && startParam.startsWith("relay_")) {
    return normalizeRelayUrl(decodeURIComponent(startParam.slice("relay_".length)))
  }
  return null
}

function normalizeRelayUrl(input: string): string | null {
  try {
    const url = new URL(input)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

function toWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, "ws")
}

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing element #${id}`)
  return el as T
}

function stripBotSuffix(name: string): string {
  return name.replace(/\s*bot\s*$/i, "").trim() || name
}

function resolveAgentNameFromStartParam(): string | null {
  const raw = tg?.initDataUnsafe?.start_param
  if (!raw) return null
  if (raw.startsWith("relay_") || raw.startsWith("relay-")) return null
  if (!/^[A-Za-z][A-Za-z0-9 _-]{0,30}$/.test(raw)) return null
  return raw.replace(/[_-]+/g, " ").trim()
}
