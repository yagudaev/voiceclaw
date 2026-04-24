// xAI Grok Voice adapter — uses the OpenAI-compatible Realtime protocol with xAI event names

import { OpenAIAdapter } from "./openai.js"

const XAI_REALTIME_URL = "wss://api.x.ai/v1/realtime"
const DEFAULT_MODEL = "grok-voice-think-fast-1.0"
const DEFAULT_VOICE = "eve"

export class XAIAdapter extends OpenAIAdapter {
  constructor() {
    super({
      providerName: "xai",
      realtimeUrl: XAI_REALTIME_URL,
      apiKeyEnv: "XAI_API_KEY",
      defaultModel: DEFAULT_MODEL,
      defaultVoice: DEFAULT_VOICE,
      authHeaders: {},
      sessionFormat: "xai",
    })
  }
}
