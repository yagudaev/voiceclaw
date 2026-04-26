import { getConversation, getMessages, getSetting, updateConversationTitle } from '@/db'
import { streamRealtimeText } from './chat'
import { getProviderForRealtimeModel } from './use-realtime'

const DEFAULT_REALTIME_MODEL = 'gemini-3.1-flash-live-preview'
const DEFAULT_VOICE_FOR_GEMINI = 'Zephyr'
const DEFAULT_VOICE_FOR_XAI = 'eve'
const DEFAULT_VOICE_FOR_OPENAI = 'alloy'

const TITLE_INSTRUCTIONS = `\
You generate short conversation titles. When asked, reply with ONLY the title — \
3 to 5 words, no quotes, no trailing punctuation. Do not greet, do not explain.`

const TITLE_REQUEST = 'Based on the conversation history, generate a short title (3-5 words). Reply with only the title.'

export async function maybeGenerateTitle(conversationId: number) {
  try {
    const conv = await getConversation(conversationId)
    if (!conv || conv.title !== 'New Conversation') return

    const msgs = await getMessages(conversationId)
    if (msgs.length < 3) return

    const serverUrl = await getSetting('realtime_server_url')
    const apiKey = await getSetting('realtime_api_key')
    if (!serverUrl || !apiKey) {
      console.debug('[TitleGen] Brain Gateway not configured; skipping title generation')
      return
    }

    const model = (await getSetting('realtime_model')) || DEFAULT_REALTIME_MODEL
    const provider = getProviderForRealtimeModel(model)
    const voice = (await getSetting('realtime_voice')) || defaultVoiceFor(provider)

    const history = msgs
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(0, 6)
      .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content }))

    const title = await generateTitleViaRealtime({
      serverUrl,
      apiKey,
      model,
      voice,
      provider,
      conversationId,
      history,
    })

    if (title) await updateConversationTitle(conversationId, title)
  } catch (e) {
    console.warn('[TitleGen] Failed, falling back to timestamp:', e)
    try {
      const fallback = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      await updateConversationTitle(conversationId, fallback)
    } catch {}
  }
}

// --- Helper Functions ---

interface TitleGenOptions {
  serverUrl: string
  apiKey: string
  model: string
  voice: string
  provider: 'gemini' | 'openai' | 'xai'
  conversationId: number
  history: { role: 'user' | 'assistant', text: string }[]
}

function defaultVoiceFor(provider: 'gemini' | 'openai' | 'xai'): string {
  if (provider === 'gemini') return DEFAULT_VOICE_FOR_GEMINI
  if (provider === 'xai') return DEFAULT_VOICE_FOR_XAI
  return DEFAULT_VOICE_FOR_OPENAI
}

function cleanTitle(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '').replace(/\.+$/, '').slice(0, 80)
}

function generateTitleViaRealtime(opts: TitleGenOptions): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const cancel = streamRealtimeText(TITLE_REQUEST, {
      serverUrl: opts.serverUrl,
      apiKey: opts.apiKey,
      model: opts.model,
      voice: opts.voice,
      provider: opts.provider,
      sessionKey: `voiceclaw:title:${opts.conversationId}`,
      instructionsOverride: TITLE_INSTRUCTIONS,
      conversationHistory: opts.history,
    }, {
      onToken: () => {},
      onDone: (text) => {
        const cleaned = cleanTitle(text || '')
        finish(cleaned || null)
      },
      onError: (err) => {
        console.warn('[TitleGen] realtime stream failed:', err)
        finish(null)
      },
    })

    setTimeout(() => {
      if (!settled) {
        try { cancel() } catch {}
        finish(null)
      }
    }, 15_000)
  })
}
