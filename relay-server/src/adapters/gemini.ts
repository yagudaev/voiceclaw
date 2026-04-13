// Gemini Live adapter — translates relay protocol ↔ Gemini Live WebSocket events

import WebSocket from "ws"
import type { SessionConfigEvent } from "../types.js"
import type { ProviderAdapter, SendToClient } from "./types.js"
import { buildInstructions } from "../instructions.js"
import { getGeminiTools } from "../tools/index.js"
import { log, error as logError } from "../log.js"

const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
const DEFAULT_MODEL = "gemini-3.1-flash-live-preview"
const WATCHDOG_TIMEOUT_MS = 20_000

const GEMINI_VOICES = ["Puck", "Charon", "Kore", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"]

// Map OpenAI voice names → Gemini equivalents
const VOICE_MAP: Record<string, string> = {
  alloy: "Kore",
  echo: "Charon",
  fable: "Fenrir",
  onyx: "Orus",
  nova: "Aoede",
  shimmer: "Leda",
  sage: "Puck",
  ash: "Zephyr",
  ballad: "Kore",
  coral: "Aoede",
  verse: "Puck",
}

export class GeminiAdapter implements ProviderAdapter {
  private upstream: WebSocket | null = null
  private sendToClient: SendToClient | null = null
  private config: SessionConfigEvent | null = null
  private transcript: { role: "user" | "assistant", text: string }[] = []
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null
  private pendingToolCalls = 0
  private currentAssistantText = ""
  private currentUserText = ""
  private userSpeaking = false

  async connect(config: SessionConfigEvent, sendToClient: SendToClient): Promise<void> {
    this.sendToClient = sendToClient
    this.config = config

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY not set")

    const model = config.model || DEFAULT_MODEL
    const url = `${GEMINI_WS_URL}?key=${apiKey}`

    return new Promise((resolve, reject) => {
      this.upstream = new WebSocket(url)

      this.upstream.on("open", () => {
        log(`[gemini] WebSocket connected, sending setup (model=${model})`)
        this.sendSetup(config, model)
      })

      this.upstream.on("message", (raw) => {
        try {
          const msg = JSON.parse(String(raw))

          // Setup complete is the first response — resolve the connect promise
          if (msg.setupComplete !== undefined) {
            log("[gemini] Setup complete")
            this.resetWatchdog()
            resolve()
            return
          }

          this.handleServerMessage(msg)
        } catch (err) {
          logError("[gemini] Failed to parse message:", err)
        }
      })

      this.upstream.on("error", (err) => {
        logError("[gemini] WebSocket error:", err.message)
        reject(err)
      })

      this.upstream.on("close", (code, reason) => {
        log(`[gemini] WebSocket closed: ${code} ${String(reason)}`)
        this.sendToClient?.({ type: "error", message: "upstream connection closed", code: 502 })
      })

      // Timeout if setup doesn't complete within 15s
      setTimeout(() => reject(new Error("Gemini setup timed out")), 15_000)
    })
  }

  sendAudio(data: string) {
    // Client sends 24kHz PCM16, Gemini needs 16kHz PCM16
    const downsampled = downsample24to16(data)
    this.sendUpstream({
      realtimeInput: {
        audio: {
          data: downsampled,
          mimeType: "audio/pcm;rate=16000",
        },
      },
    })
    this.resetWatchdog()
  }

  commitAudio() {
    // Gemini uses automatic VAD — no explicit commit needed
  }

  createResponse() {
    // Gemini auto-responds based on VAD — no explicit trigger needed
  }

  cancelResponse() {
    // Gemini handles interruption via barge-in automatically
  }

  sendToolResult(callId: string, output: string) {
    this.pendingToolCalls = Math.max(0, this.pendingToolCalls - 1)

    let parsedOutput: Record<string, unknown>
    try {
      parsedOutput = JSON.parse(output)
    } catch {
      parsedOutput = { result: output }
    }

    this.sendUpstream({
      toolResponse: {
        functionResponses: [{
          id: callId,
          response: parsedOutput,
        }],
      },
    })

    if (this.pendingToolCalls === 0) {
      this.resetWatchdog()
    }
  }

  getTranscript() {
    return [...this.transcript]
  }

  disconnect() {
    this.clearWatchdog()
    if (this.upstream && this.upstream.readyState !== WebSocket.CLOSED) {
      this.upstream.close()
    }
    this.upstream = null
    this.sendToClient = null
  }

  // --- setup ---

  private sendSetup(config: SessionConfigEvent, model: string) {
    const instructions = buildInstructions(config)
    const tools = getGeminiTools(config)
    const voice = resolveVoice(config.voice)

    // Gemini Live setup message structure:
    // - generationConfig: responseModalities, speechConfig (generation settings)
    // - outputAudioTranscription, inputAudioTranscription: at setup root
    // - systemInstruction, tools, realtimeInputConfig: at setup root
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setup: Record<string, any> = {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
      outputAudioTranscription: {},
      inputAudioTranscription: {},
      systemInstruction: {
        parts: [{ text: instructions }],
      },
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
          endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
          prefixPaddingMs: 20,
          silenceDurationMs: 500,
        },
      },
    }

    if (tools.length > 0) {
      setup.tools = [{ functionDeclarations: tools }]
    }

    log(`[gemini] Setup: model=${model}, voice=${voice}, tools=${tools.length}`)
    this.sendUpstream({ setup })
  }

  // --- server message handling ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleServerMessage(msg: any) {
    if (msg.serverContent) {
      this.handleServerContent(msg.serverContent)
      return
    }

    if (msg.toolCall) {
      this.handleToolCall(msg.toolCall)
      return
    }

    if (msg.toolCallCancellation) {
      log("[gemini] Tool call cancelled")
      this.pendingToolCalls = 0
      this.resetWatchdog()
      return
    }

    if (msg.goAway) {
      log(`[gemini] GoAway received — session ending soon`)
      return
    }

    if (msg.sessionResumptionUpdate) {
      log("[gemini] Session resumption update")
      return
    }

    if (msg.usageMetadata) {
      log(`[gemini] Usage: ${JSON.stringify(msg.usageMetadata)}`)
      return
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleServerContent(content: any) {
    const keys = Object.keys(content).join(", ")
    log(`[gemini] serverContent: ${keys}`)

    // Model audio output — only extract inlineData (audio)
    // Do NOT emit transcript from modelTurn.parts[].text — outputTranscription handles that
    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData) {
          this.sendToClient?.({ type: "audio.delta", data: part.inlineData.data })
          this.resetWatchdog()
        }
      }
    }

    // Output transcription (model speech → text)
    // Flush any accumulated user text first — the model is now responding
    if (content.outputTranscription?.text) {
      if (this.currentUserText) {
        this.transcript.push({ role: "user", text: this.currentUserText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentUserText,
          role: "user",
        })
        this.currentUserText = ""
      }
      this.userSpeaking = false
      this.currentAssistantText += content.outputTranscription.text
      this.sendToClient?.({
        type: "transcript.delta",
        text: content.outputTranscription.text,
        role: "assistant",
      })
    }

    // Input transcription (user speech → text)
    // Synthesize turn.started so client stops playback (prevents echo)
    if (content.inputTranscription?.text) {
      if (!this.userSpeaking) {
        this.userSpeaking = true
        this.sendToClient?.({ type: "turn.started" })
      }
      // Flush any accumulated assistant text — user is speaking again
      if (this.currentAssistantText) {
        this.transcript.push({ role: "assistant", text: this.currentAssistantText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentAssistantText,
          role: "assistant",
        })
        this.currentAssistantText = ""
      }
      this.currentUserText += content.inputTranscription.text
      this.sendToClient?.({
        type: "transcript.delta",
        text: content.inputTranscription.text,
        role: "user",
      })
    }

    // Turn complete — flush accumulated transcriptions (user first, then assistant)
    if (content.turnComplete) {
      if (this.currentUserText) {
        this.transcript.push({ role: "user", text: this.currentUserText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentUserText,
          role: "user",
        })
        this.currentUserText = ""
      }
      if (this.currentAssistantText) {
        this.transcript.push({ role: "assistant", text: this.currentAssistantText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentAssistantText,
          role: "assistant",
        })
        this.currentAssistantText = ""
      }
      this.userSpeaking = false
      this.sendToClient?.({ type: "turn.ended" })
    }

    // Interrupted (barge-in) — flush both user and assistant text
    if (content.interrupted) {
      log("[gemini] Response interrupted by user")
      if (!this.userSpeaking) {
        this.userSpeaking = true
        this.sendToClient?.({ type: "turn.started" })
      }
      if (this.currentUserText) {
        this.transcript.push({ role: "user", text: this.currentUserText })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentUserText,
          role: "user",
        })
        this.currentUserText = ""
      }
      if (this.currentAssistantText) {
        this.transcript.push({ role: "assistant", text: this.currentAssistantText + "..." })
        this.sendToClient?.({
          type: "transcript.done",
          text: this.currentAssistantText + "...",
          role: "assistant",
        })
        this.currentAssistantText = ""
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleToolCall(toolCall: any) {
    const calls = toolCall.functionCalls || []

    for (const call of calls) {
      log(`[gemini] Tool call: ${call.name} (${call.id})`)
      this.pendingToolCalls++
      this.pauseWatchdog()
      this.sendToClient?.({
        type: "tool.call",
        callId: call.id,
        name: call.name,
        arguments: JSON.stringify(call.args || {}),
      })
    }
  }

  // --- upstream comms ---

  private sendUpstream(msg: Record<string, unknown>) {
    if (this.upstream?.readyState === WebSocket.OPEN) {
      this.upstream.send(JSON.stringify(msg))
    }
  }

  // --- watchdog ---

  private resetWatchdog() {
    this.clearWatchdog()
    this.watchdogTimer = setTimeout(() => {
      log("[gemini] Watchdog: no audio for 20s, injecting prompt")
      this.sendUpstream({
        clientContent: {
          turns: [{
            role: "user",
            parts: [{ text: "(The user has been silent for a while. If you were mid-conversation, gently check if they're still there. If the conversation had naturally ended, stay quiet.)" }],
          }],
          turnComplete: true,
        },
      })
    }, WATCHDOG_TIMEOUT_MS)
  }

  private pauseWatchdog() {
    this.clearWatchdog()
  }

  private clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }
}

// --- helpers ---

function resolveVoice(voice?: string): string {
  if (!voice) return "Zephyr"
  // If it's already a Gemini voice name, normalize casing
  const match = GEMINI_VOICES.find((v) => v.toLowerCase() === voice.toLowerCase())
  if (match) return match
  // Map from OpenAI voice names
  return VOICE_MAP[voice.toLowerCase()] || "Zephyr"
}

function downsample24to16(base64Audio: string): string {
  const inputBuf = Buffer.from(base64Audio, "base64")
  const inputSamples = inputBuf.length / 2 // 16-bit = 2 bytes per sample
  const outputSamples = Math.floor(inputSamples * 16000 / 24000)
  const outputBuf = Buffer.alloc(outputSamples * 2)
  const ratio = 24000 / 16000 // 1.5

  for (let i = 0; i < outputSamples; i++) {
    const srcPos = i * ratio
    const srcIdx = Math.floor(srcPos)
    const frac = srcPos - srcIdx

    const s0 = inputBuf.readInt16LE(srcIdx * 2)
    const s1 = srcIdx + 1 < inputSamples
      ? inputBuf.readInt16LE((srcIdx + 1) * 2)
      : s0

    const sample = Math.round(s0 * (1 - frac) + s1 * frac)
    outputBuf.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2)
  }

  return outputBuf.toString("base64")
}
