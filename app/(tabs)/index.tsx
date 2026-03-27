import { LatencyBadge } from '@/components/latency-badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { addMessage, createConversation, getConversation, getLatestConversation, getMessages, getSetting, setSetting, updateConversationVapi, type Message, type LatencyData } from '@/db'
import { getApiConfig, streamCompletion } from '@/lib/chat'
import { compactMessages } from '@/lib/compact'
import { useConversationContext } from '@/lib/conversation-context'
import { maybeGenerateTitle } from '@/lib/title'
import { useCallSounds } from '@/lib/sounds'
import { useTranscriptBuffer } from '@/lib/use-transcript-buffer'
import { useAutoReconnect } from '@/lib/use-auto-reconnect'
import { sendVapiChat, syncMessagesToVapi } from '@/lib/vapi-chat'
import ExpoCustomPipelineModule from '@/modules/expo-custom-pipeline/src/ExpoCustomPipelineModule'
import type { FinalTranscriptEvent, LatencyUpdateEvent } from '@/modules/expo-custom-pipeline/src/ExpoCustomPipeline.types'
import ExpoVapiModule from '@/modules/expo-vapi'
import type { FunctionCallEvent, SpeechEvent, TranscriptEvent } from '@/modules/expo-vapi'
import { Stack } from 'expo-router'
import { MicIcon, MicOffIcon, PhoneOffIcon, PlusIcon, RefreshCwIcon, SendIcon, TimerIcon, XIcon } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'

const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g
const URL_IMAGE_REGEX = /(?:^|\s)(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?)/gi
const THINKING_MESSAGE_ID = -2

const VOICE_SYSTEM_PROMPT = `\
You are on a live voice call. Keep responses concise and conversational — short \
sentences, natural speech. No bullet lists, no code blocks. Speak like a human \
in a phone call. Your identity, personality, and capabilities are defined in \
your system files.

For long-running tasks (image generation, web searches, file operations, etc.), \
delegate to a sub-agent so the user gets an immediate response and can keep \
talking. Acknowledge the request quickly ("On it, generating that now") and let \
the background work complete asynchronously.

When sharing images or URLs, include them as markdown (e.g. ![description](url)) \
but never speak the URL aloud — just describe what you created or found.

## Display Tool

You have a \`displayText\` function that writes content to the user's screen \
WITHOUT it being spoken aloud. Use it for:
- URLs, links, or code snippets
- Long text the user asked you to write (emails, summaries, lists)
- Image markdown (![desc](url))
- Any content better read than heard

After calling displayText, briefly tell the user verbally, e.g. "I've put that \
on your screen" or "Check your display". Keep the spoken part short — the detail \
is on screen.`

const DISPLAY_TEXT_FUNCTION = {
  name: 'displayText',
  description: 'Write content to the user\'s screen without it being spoken aloud by TTS. Use for URLs, code, long text, images, or anything better read than heard.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The content to display. Supports markdown including image syntax ![alt](url).',
      },
      title: {
        type: 'string',
        description: 'Optional short title shown above the content.',
      },
    },
    required: ['text'],
  },
}

type ContentPart = { type: 'text', text: string } | { type: 'image', url: string, alt: string }

export default function ChatScreen() {
  const { colorScheme } = useColorScheme()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [vapiReady, setVapiReady] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const [showLatency, setShowLatency] = useState(false)
  const [streamingRole, setStreamingRole] = useState<'user' | 'assistant'>('assistant')
  const flatListRef = useRef<FlatList<Message>>(null)
  const hasScrolledRef = useRef(false)
  const { playJoin, playEnd, startThinking, stopThinking } = useCallSounds()
  const soundsRef = useRef({ playJoin, playEnd, startThinking, stopThinking })
  soundsRef.current = { playJoin, playEnd, startThinking, stopThinking }
  const { selectedConversationId, clearSelection } = useConversationContext()
  const userInitiatedEndRef = useRef(false)
  const wasCallActiveRef = useRef(false)
  const lastCallOverridesRef = useRef<Record<string, unknown> | null>(null)
  const lastAssistantIdRef = useRef<string | null>(null)
  const pendingLatencyRef = useRef<LatencyData | null>(null)
  const activeVoiceModeRef = useRef<'vapi' | 'custom'>('vapi')
  const customPipelineSubsRef = useRef<Array<{ remove: () => void }>>([])

  // Vapi latency tracking refs
  const vapiUserSpeechEndTimeRef = useRef<number | null>(null)
  const vapiUserFinalTranscriptTimeRef = useRef<number | null>(null)
  const vapiAssistantFirstTokenTimeRef = useRef<number | null>(null)
  const vapiPendingLatencyRef = useRef<LatencyData>({})

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    setMessages(await getMessages(conversationId))
  }, [conversationId])

  const handleTranscriptFlush = useCallback(async (role: 'user' | 'assistant', text: string) => {
    if (!conversationId) return
    if (__DEV__) console.log('[Chat] Transcript flush:', role, text.substring(0, 50))
    try {
      // Attach latency data to assistant messages from Custom Pipeline
      const latency = role === 'assistant' ? pendingLatencyRef.current ?? undefined : undefined
      if (role === 'assistant') pendingLatencyRef.current = null
      await addMessage(conversationId, role, text, latency)
      await loadMessages()
      maybeGenerateTitle(conversationId)
    } catch (err) {
      console.warn('[Chat] Failed to flush transcript:', err)
    }
  }, [conversationId, loadMessages])

  const transcriptBuffer = useTranscriptBuffer({ onFlush: handleTranscriptFlush })
  const transcriptBufferRef = useRef(transcriptBuffer)
  transcriptBufferRef.current = transcriptBuffer

  const reconnectCall = useCallback(async () => {
    const assistantId = lastAssistantIdRef.current
    if (!assistantId) {
      throw new Error('No previous call configuration to reconnect with')
    }
    const overrides = lastCallOverridesRef.current
    setIsConnecting(true)

    // Safety timeout: reset isConnecting if onCallStart never fires after reconnect
    if (connectingTimeoutRef.current) clearTimeout(connectingTimeoutRef.current)
    connectingTimeoutRef.current = setTimeout(() => {
      setIsConnecting((current) => {
        if (current) console.warn('[Chat] Reconnect connecting timed out after 15s, resetting state')
        return false
      })
    }, 15_000)

    try {
      await ExpoVapiModule.startCall(assistantId, overrides ?? undefined)
    } catch (e) {
      setIsConnecting(false)
      if (connectingTimeoutRef.current) {
        clearTimeout(connectingTimeoutRef.current)
        connectingTimeoutRef.current = null
      }
      throw e
    }
  }, [])

  const { state: reconnectState, trigger: triggerReconnect, cancel: cancelReconnect, retry: manualRetry } = useAutoReconnect({
    onReconnect: reconnectCall,
  })

  const ensureVapiReady = useCallback(async (): Promise<boolean> => {
    if (vapiReady) return true
    const apiKey = await getSetting('vapi_api_key')
    if (!apiKey) return false
    try {
      await ExpoVapiModule.initialize(apiKey)
      setVapiReady(true)
      return true
    } catch (e) {
      console.warn('Vapi init failed:', e)
      return false
    }
  }, [vapiReady])

  useEffect(() => {
    const subs = [
      ExpoVapiModule.addListener('onCallStart', () => {
        console.log('[Chat] onCallStart fired')
        if (connectingTimeoutRef.current) {
          clearTimeout(connectingTimeoutRef.current)
          connectingTimeoutRef.current = null
        }
        setIsCallActive(true)
        setIsConnecting(false)
        wasCallActiveRef.current = true
        cancelReconnect()
        soundsRef.current.playJoin()
        // Reset Vapi latency tracking for fresh call
        vapiUserSpeechEndTimeRef.current = null
        vapiUserFinalTranscriptTimeRef.current = null
        vapiAssistantFirstTokenTimeRef.current = null
        vapiPendingLatencyRef.current = {}
      }),
      ExpoVapiModule.addListener('onCallEnd', async () => {
        console.log('[Chat] onCallEnd fired')
        if (connectingTimeoutRef.current) {
          clearTimeout(connectingTimeoutRef.current)
          connectingTimeoutRef.current = null
        }
        const wasActive = wasCallActiveRef.current
        const wasUserInitiated = userInitiatedEndRef.current

        // Store any accumulated Vapi latency before flushing
        const vapiLatency = vapiPendingLatencyRef.current
        if (vapiLatency.sttLatencyMs != null || vapiLatency.llmLatencyMs != null || vapiLatency.ttsLatencyMs != null) {
          pendingLatencyRef.current = { ...vapiLatency }
        }
        vapiPendingLatencyRef.current = {}

        // Flush any in-progress transcript buffers before cleanup
        if (conversationId) {
          const pending = transcriptBufferRef.current.flushAll()
          for (const { role, text } of pending) {
            console.log('[Chat] Flushing buffered transcript on call end:', role, text.substring(0, 50))
            const latency = role === 'assistant' ? pendingLatencyRef.current ?? undefined : undefined
            if (role === 'assistant') pendingLatencyRef.current = null
            await addMessage(conversationId, role, text, latency)
          }
          if (pending.length > 0) {
            loadMessages()
            maybeGenerateTitle(conversationId)
          }
        }

        setIsCallActive(false)
        setIsMuted(false)
        setIsThinking(false)
        setIsConnecting(false)
        wasCallActiveRef.current = false
        userInitiatedEndRef.current = false
        soundsRef.current.stopThinking()

        if (wasActive && !wasUserInitiated) {
          // Unexpected disconnect -- attempt auto-reconnect
          console.log('[Chat] Unexpected disconnect detected, triggering auto-reconnect')
          triggerReconnect()
        } else {
          // User-initiated end -- normal cleanup
          soundsRef.current.playEnd()
          if (conversationId) {
            syncConversationToVapi(conversationId)
          }
        }
      }),
      ExpoVapiModule.addListener('onTranscript', (event: TranscriptEvent) => {
        console.log('[Chat] onTranscript:', event.role, event.type, event.text?.substring(0, 50))
        if (event.type === 'final') {
          transcriptBufferRef.current.onTranscriptFinal(event.role, event.text)
        }

        // Vapi latency tracking
        if (event.type === 'final' && event.role === 'user') {
          // STT latency: time from user speech end to final user transcript
          if (vapiUserSpeechEndTimeRef.current != null) {
            vapiPendingLatencyRef.current.sttLatencyMs = Date.now() - vapiUserSpeechEndTimeRef.current
            vapiUserSpeechEndTimeRef.current = null
          }
          vapiUserFinalTranscriptTimeRef.current = Date.now()
          // Reset assistant first-token tracker for the new turn
          vapiAssistantFirstTokenTimeRef.current = null
        }

        if (event.role === 'assistant' && vapiAssistantFirstTokenTimeRef.current == null) {
          // LLM latency: time from user's final transcript to first assistant output
          if (vapiUserFinalTranscriptTimeRef.current != null) {
            vapiPendingLatencyRef.current.llmLatencyMs = Date.now() - vapiUserFinalTranscriptTimeRef.current
            vapiUserFinalTranscriptTimeRef.current = null
          }
          vapiAssistantFirstTokenTimeRef.current = Date.now()
        }
      }),
      ExpoVapiModule.addListener('onSpeechStart', (event: SpeechEvent) => {
        transcriptBufferRef.current.onSpeechStart(event.role)
        if (event.role === 'assistant') {
          setIsThinking(false)
          soundsRef.current.stopThinking()
          // Vapi latency tracking
          const now = Date.now()
          if (vapiAssistantFirstTokenTimeRef.current != null) {
            // TTS latency: time from first assistant text to speech start
            vapiPendingLatencyRef.current.ttsLatencyMs = now - vapiAssistantFirstTokenTimeRef.current
          } else if (vapiUserFinalTranscriptTimeRef.current != null) {
            // Speech started before any transcript -- count full time as LLM latency
            vapiPendingLatencyRef.current.llmLatencyMs = now - vapiUserFinalTranscriptTimeRef.current
            vapiUserFinalTranscriptTimeRef.current = null
            vapiAssistantFirstTokenTimeRef.current = now
          }
        }
      }),
      ExpoVapiModule.addListener('onSpeechEnd', (event: SpeechEvent) => {
        transcriptBufferRef.current.onSpeechEnd(event.role)
        if (event.role === 'user') {
          setIsThinking(true)
          soundsRef.current.startThinking()
          // Vapi latency: mark when user stopped speaking (STT timer starts)
          vapiUserSpeechEndTimeRef.current = Date.now()
        }
        if (event.role === 'assistant') {
          // Vapi latency: assistant turn is done — store accumulated latency for flush
          const latency = vapiPendingLatencyRef.current
          if (latency.sttLatencyMs != null || latency.llmLatencyMs != null || latency.ttsLatencyMs != null) {
            pendingLatencyRef.current = { ...latency }
          }
          // Reset for next turn
          vapiPendingLatencyRef.current = {}
          vapiAssistantFirstTokenTimeRef.current = null
        }
      }),
      ExpoVapiModule.addListener('onFunctionCall', async (event: FunctionCallEvent) => {
        if (event.name === 'displayText' && conversationId) {
          const text = (event.parameters.text as string) || ''
          const title = event.parameters.title as string | undefined
          const displayContent = title ? `**${title}**\n\n${text}` : text
          await addMessage(conversationId, 'assistant', displayContent)
          loadMessages()

          try {
            await ExpoVapiModule.sendFunctionCallResult(
              'displayText',
              JSON.stringify({ status: 'displayed', length: text.length })
            )
          } catch (e) {
            console.warn('[DisplayText] Failed to send function call result:', e)
          }
        }
      }),
      ExpoVapiModule.addListener('onError', async (event) => {
        console.error('[Vapi]', event.message)
        setIsConnecting(false)
        if (connectingTimeoutRef.current) {
          clearTimeout(connectingTimeoutRef.current)
          connectingTimeoutRef.current = null
        }
        setIsThinking(false)
        soundsRef.current.stopThinking()
        if (conversationId) {
          await addMessage(conversationId, 'assistant', `Error: ${event.message}`)
          loadMessages()
        }
      }),
    ]
    return () => subs.forEach((s) => s.remove())
  }, [conversationId, cancelReconnect, triggerReconnect])

  // Listen for latency updates from the Custom Pipeline
  useEffect(() => {
    const sub = ExpoCustomPipelineModule.addListener(
      'onLatencyUpdate',
      (event: LatencyUpdateEvent) => {
        pendingLatencyRef.current = {
          sttLatencyMs: event.sttLatencyMs,
          llmLatencyMs: event.llmLatencyMs,
          ttsLatencyMs: event.ttsLatencyMs,
        }
      }
    )
    return () => sub.remove()
  }, [])

  const startNewConversation = useCallback(async () => {
    hasScrolledRef.current = false
    const conv = await createConversation()
    setConversationId(conv.id)
    setMessages([])
    setStreamingText(null)
    setIsThinking(false)
  }, [])

  const loadConversation = useCallback(async (id: number) => {
    hasScrolledRef.current = false
    setConversationId(id)
    setMessages(await getMessages(id))
    setStreamingText(null)
    setIsThinking(false)
  }, [])

  // Handle conversation selection from History tab
  useEffect(() => {
    if (selectedConversationId !== null) {
      loadConversation(selectedConversationId)
      clearSelection()
    }
  }, [selectedConversationId, loadConversation, clearSelection])

  // Resume the most recent conversation on first mount, or create a new one if none exist
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    (async () => {
      const latest = await getLatestConversation()
      if (latest) {
        loadConversation(latest.id)
      } else {
        startNewConversation()
      }
    })()
  }, [])

  useEffect(() => {
    getSetting('show_latency').then((v) => { if (v === 'true') setShowLatency(true) }).catch(() => {})
  }, [])

  useEffect(() => { loadMessages() }, [loadMessages])

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !conversationId) return
    const userInput = inputText.trim()
    setInputText('')

    await addMessage(conversationId, 'user', userInput)
    await loadMessages()

    if (isCallActive && vapiReady) {
      try { await ExpoVapiModule.sendMessage(userInput) }
      catch (e) { console.warn('Failed to send via Vapi:', e) }
      return
    }

    const { apiKey, model, apiUrl } = await getApiConfig()
    if (!apiKey || !apiUrl) {
      await addMessage(conversationId, 'assistant', 'Please configure your OpenClaw API URL and key in Settings first.')
      await loadMessages()
      return
    }

    setIsThinking(true)
    const allDbMessages = await getMessages(conversationId)
    const allMessages = await compactMessages(conversationId, allDbMessages, apiKey, model, apiUrl)

    const systemPrompt = (await getSetting('system_prompt')) || ''
    streamCompletion(allMessages, apiKey, model, apiUrl, systemPrompt, conversationId, {
      onToken: (text) => {
        setIsThinking(false)
        setStreamingRole('assistant')
        setStreamingText(text)
      },
      onDone: async (text) => {
        setStreamingText(null)
        await addMessage(conversationId, 'assistant', text || 'No response received.')
        await loadMessages()
        maybeGenerateTitle(conversationId)
        syncTextMessageToVapi(conversationId, userInput)
      },
      onError: async (error) => {
        setStreamingText(null)
        setIsThinking(false)
        await addMessage(conversationId, 'assistant', `Error: ${error}`)
        await loadMessages()
      },
    })
  }, [inputText, conversationId, loadMessages, isCallActive, vapiReady])

  const connectingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (connectingTimeoutRef.current) {
        clearTimeout(connectingTimeoutRef.current)
        connectingTimeoutRef.current = null
      }
    }
  }, [])

  const toggleCall = useCallback(async () => {
    if (isCallActive) {
      userInitiatedEndRef.current = true
      cancelReconnect()
      if (activeVoiceModeRef.current === 'custom') {
        stopCustomPipeline()
      } else {
        await ExpoVapiModule.stopCall()
      }
      return
    }

    // Disable the button immediately to prevent double-tap
    setIsConnecting(true)
    let callStarted = false

    try {
      const voiceMode = (await getSetting('voice_mode')) || 'vapi'

      if (!conversationId) {
        console.warn('[Chat] No active conversation, cannot start call')
        return
      }

      if (voiceMode === 'custom') {
        activeVoiceModeRef.current = 'custom'
        callStarted = await startCustomPipelineCall()
      } else {
        activeVoiceModeRef.current = 'vapi'
        callStarted = await startVapiCall()
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e)
      console.error('Failed to start call:', errorMsg)
      if (conversationId) {
        await addMessage(conversationId, 'assistant', `Call failed: ${errorMsg}`)
        await loadMessages()
      }
    } finally {
      if (!callStarted) {
        setIsConnecting(false)
        if (connectingTimeoutRef.current) {
          clearTimeout(connectingTimeoutRef.current)
          connectingTimeoutRef.current = null
        }
      }
    }
  }, [isCallActive, ensureVapiReady, conversationId, loadMessages])

  const startVapiCall = useCallback(async (): Promise<boolean> => {
    const assistantId = await getSetting('assistant_id')
    if (!assistantId) {
      if (conversationId) {
        await addMessage(conversationId, 'assistant', 'Please configure your Vapi API key and Assistant ID in Settings first.')
        await loadMessages()
      }
      return false
    }

    const ready = await ensureVapiReady()
    if (!ready) {
      if (conversationId) {
        await addMessage(conversationId, 'assistant', 'Please configure your Vapi API key and Assistant ID in Settings first.')
        await loadMessages()
      }
      return false
    }

    if (!conversationId) return false

    const { apiKey, apiUrl, model } = await getApiConfig()
    const modelMessages: Array<{ role: string, content: string }> = [
      { role: 'system', content: VOICE_SYSTEM_PROMPT },
    ]

    const prevMessages = await getMessages(conversationId)
    if (prevMessages.length > 0) {
      const compacted = apiKey && apiUrl
        ? await compactMessages(conversationId, prevMessages, apiKey, model, apiUrl)
        : prevMessages.map((m) => ({ role: m.role, content: m.content }))

      const summaryMsg = compacted.find((m) => m.role === 'system' && m.content.startsWith('Previous conversation summary:'))
      const historyMsgs = compacted.filter((m) => m.role !== 'system')

      const history = historyMsgs
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')
      const contextParts = []
      if (summaryMsg) contextParts.push(summaryMsg.content)
      if (history) contextParts.push(`Recent messages:\n${history}`)
      contextParts.push('Continue the conversation naturally from where we left off.')

      modelMessages.push({
        role: 'system',
        content: contextParts.join('\n\n'),
      })
    }

    const overrides: Record<string, unknown> = {
      server: { timeoutSeconds: 45 },
      silenceTimeoutSeconds: 120,
      endCallPhrases: [],
      clientMessages: [
        'transcript',
        'hang',
        'function-call',
        'speech-update',
        'status-update',
        'conversation-update',
        'model-output',
      ],
      firstMessage: modelMessages.length > 1 ? 'Welcome back :)' : undefined,
      model: {
        url: apiUrl,
        provider: 'custom-llm',
        model,
        messages: modelMessages,
        functions: [DISPLAY_TEXT_FUNCTION],
      },
      metadata: { conversationId: `voiceclaw:${conversationId}` },
    }

    const callOverrides = Object.keys(overrides).length > 0 ? overrides : undefined
    lastAssistantIdRef.current = assistantId
    lastCallOverridesRef.current = callOverrides ?? null

    // Safety timeout: reset isConnecting if onCallStart never fires
    if (connectingTimeoutRef.current) clearTimeout(connectingTimeoutRef.current)
    connectingTimeoutRef.current = setTimeout(() => {
      setIsConnecting((current) => {
        if (current) console.warn('[Chat] Connecting timed out after 15s, resetting state')
        return false
      })
    }, 15_000)

    await ExpoVapiModule.startCall(assistantId, callOverrides)
    return true
  }, [ensureVapiReady, conversationId, loadMessages])

  const startCustomPipelineCall = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false

    const { apiKey, apiUrl, model } = await getApiConfig()
    if (!apiKey || !apiUrl) {
      await addMessage(conversationId, 'assistant', 'Please configure your OpenClaw API URL and key in Settings first.')
      await loadMessages()
      return false
    }

    // Read STT/TTS provider settings
    const sttProvider = (await getSetting('stt_provider')) || 'apple'
    const ttsProvider = (await getSetting('tts_provider')) || 'apple'

    // Configure STT provider
    const sttConfig: Record<string, string> = {}
    if (sttProvider === 'deepgram') {
      const deepgramKey = await getSetting('deepgram_api_key')
      if (deepgramKey) sttConfig.apiKey = deepgramKey
    }
    ExpoCustomPipelineModule.setSTTProvider(sttProvider, sttConfig)

    // Configure TTS provider
    const ttsConfig: Record<string, string> = {}
    if (ttsProvider === 'elevenlabs') {
      const elKey = await getSetting('elevenlabs_api_key')
      const elVoice = await getSetting('elevenlabs_voice_id')
      console.log('[CustomPipeline] ElevenLabs config — key:', elKey ? `${elKey.substring(0, 8)}...` : 'MISSING', 'voice:', elVoice || 'default')
      if (elKey) ttsConfig.apiKey = elKey
      if (elVoice) ttsConfig.voiceId = elVoice
    } else if (ttsProvider === 'openai') {
      const oaiKey = await getSetting('openai_tts_api_key')
      const oaiVoice = await getSetting('openai_tts_voice')
      if (oaiKey) ttsConfig.apiKey = oaiKey
      if (oaiVoice) ttsConfig.voice = oaiVoice
    }
    ExpoCustomPipelineModule.setTTSProvider(ttsProvider, ttsConfig)

    // Set up event listeners for custom pipeline
    customPipelineSubsRef.current.forEach((s) => s.remove())
    customPipelineSubsRef.current = []
    console.log('[CustomPipeline] Starting listeners, conversationId:', conversationId)
    const subs = [
      ExpoCustomPipelineModule.addListener('onPartialTranscript', (event) => {
        if (__DEV__) console.log('[CustomPipeline] Partial:', event.text?.substring(0, 50))
        setStreamingRole('user')
        setStreamingText(event.text)
      }),
      ExpoCustomPipelineModule.addListener('onFinalTranscript', (event: FinalTranscriptEvent) => {
        console.log('[CustomPipeline] Final transcript:', event.text?.substring(0, 50))
        setStreamingText(null)
        if (conversationId) {
          addMessage(conversationId, 'user', event.text).then(() => {
            loadMessages()
            maybeGenerateTitle(conversationId)
          })
        }
        setIsThinking(true)
        soundsRef.current.startThinking()
      }),
      ExpoCustomPipelineModule.addListener('onAssistantResponse', (event) => {
        console.log('[CustomPipeline] Assistant response:', event.text?.substring(0, 50))
        setIsThinking(false)
        soundsRef.current.stopThinking()
        if (conversationId && event.text) {
          addMessage(conversationId, 'assistant', event.text).then(() => loadMessages())
        }
      }),
      ExpoCustomPipelineModule.addListener('onTTSStart', () => {
        console.log('[CustomPipeline] TTS started')
        setIsThinking(false)
        soundsRef.current.stopThinking()
      }),
      ExpoCustomPipelineModule.addListener('onTTSComplete', () => {
        console.log('[CustomPipeline] TTS complete')
      }),
      ExpoCustomPipelineModule.addListener('onError', (event) => {
        console.error('[CustomPipeline]', event.message)
        setIsThinking(false)
        soundsRef.current.stopThinking()
        if (conversationId) {
          addMessage(conversationId, 'assistant', `Error: ${event.message}`).then(() => loadMessages())
        }
      }),
    ]
    customPipelineSubsRef.current = subs

    // Start conversation
    console.log('[CustomPipeline] Starting conversation with', { apiUrl, model, sttProvider, ttsProvider })
    ExpoCustomPipelineModule.startConversation(apiUrl, apiKey, model)
    setIsCallActive(true)
    setIsConnecting(false)
    soundsRef.current.playJoin()
    return true
  }, [conversationId, loadMessages])

  const stopCustomPipeline = useCallback(() => {
    ExpoCustomPipelineModule.stopConversation()
    customPipelineSubsRef.current.forEach((s) => s.remove())
    customPipelineSubsRef.current = []
    setIsCallActive(false)
    setIsMuted(false)
    setIsThinking(false)
    soundsRef.current.stopThinking()
    soundsRef.current.playEnd()
  }, [])

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted
    await ExpoVapiModule.setMuted(newMuted)
    setIsMuted(newMuted)
  }, [isMuted])

  let displayMessages = messages as Message[]
  if (streamingText !== null) {
    displayMessages = [...messages, { id: -1, conversation_id: conversationId ?? 0, role: streamingRole, content: streamingText, created_at: Date.now(), stt_latency_ms: null, llm_latency_ms: null, tts_latency_ms: null }]
  } else if (isThinking) {
    displayMessages = [...messages, { id: THINKING_MESSAGE_ID, conversation_id: conversationId ?? 0, role: 'assistant' as const, content: '', created_at: Date.now(), stt_latency_ms: null, llm_latency_ms: null, tts_latency_ms: null }]
  }

  const { partials } = transcriptBuffer

  const toggleLatencyDisplay = useCallback(async () => {
    const next = !showLatency
    setShowLatency(next)
    await setSetting('show_latency', next ? 'true' : 'false')
  }, [showLatency])

  return (
    <KeyboardAvoidingView
      testID="chat-screen"
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View className="mr-2 flex-row items-center">
              <Pressable testID="latency-toggle-button" onPress={toggleLatencyDisplay} className="p-2">
                <TimerIcon size={20} color={showLatency ? '#f59e0b' : (colorScheme === 'dark' ? '#666' : '#999')} />
              </Pressable>
              <Pressable testID="new-conversation-button" onPress={startNewConversation} className="p-2">
                <PlusIcon size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
              </Pressable>
            </View>
          ),
        }}
      />

      <FlatList
        testID="messages-list"
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <>
            <MessageBubble message={item} />
            {showLatency && item.id !== THINKING_MESSAGE_ID && <LatencyBadge message={item} />}
          </>
        )}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
        onContentSizeChange={() => {
          const animated = hasScrolledRef.current
          hasScrolledRef.current = true
          flatListRef.current?.scrollToEnd({ animated })
        }}
        ListEmptyComponent={
          <View testID="empty-chat-placeholder" className="flex-1 items-center justify-center pt-40">
            <Text className="text-lg text-muted-foreground">Start a conversation</Text>
            <Text className="mt-1 text-sm text-muted-foreground">Type a message or tap the mic to speak</Text>
          </View>
        }
        ListFooterComponent={
          partials.length > 0 ? (
            <View>
              {partials.map((p) => (
                <PartialBubble key={p.role} role={p.role} text={p.text} />
              ))}
            </View>
          ) : null
        }
      />

      {reconnectState.status === 'reconnecting' && (
        <View className="items-center gap-2 border-t border-border bg-muted/50 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text className="text-sm font-medium text-yellow-500">
              Reconnecting... (attempt {reconnectState.attempt}/{reconnectState.maxAttempts})
            </Text>
          </View>
          <Button variant="ghost" size="sm" onPress={() => { cancelReconnect(); soundsRef.current.playEnd() }}>
            <Icon as={XIcon} size={16} className="text-muted-foreground" />
            <Text className="ml-1 text-sm text-muted-foreground">Cancel</Text>
          </Button>
        </View>
      )}

      {reconnectState.status === 'failed' && (
        <View className="items-center gap-2 border-t border-border bg-muted/50 px-4 py-3">
          <Text className="text-sm font-medium text-destructive">Connection lost</Text>
          <View className="flex-row gap-2">
            <Button variant="secondary" size="sm" onPress={manualRetry}>
              <Icon as={RefreshCwIcon} size={16} className="text-foreground" />
              <Text className="ml-1 text-sm text-foreground">Retry</Text>
            </Button>
            <Button variant="ghost" size="sm" onPress={() => { cancelReconnect(); soundsRef.current.playEnd() }}>
              <Icon as={XIcon} size={16} className="text-muted-foreground" />
              <Text className="ml-1 text-sm text-muted-foreground">Dismiss</Text>
            </Button>
          </View>
        </View>
      )}

      {isCallActive && (
        <View testID="call-controls" className="flex-row items-center justify-center gap-4 border-t border-border bg-muted/50 px-4 py-3">
          <Button testID="mute-button" variant={isMuted ? 'destructive' : 'secondary'} size="icon" className="rounded-full" onPress={toggleMute}>
            <Icon as={isMuted ? MicOffIcon : MicIcon} size={20} className="text-foreground" />
          </Button>
          <Button testID="end-call-button" variant="destructive" className="rounded-full px-6" onPress={toggleCall}>
            <Icon as={PhoneOffIcon} size={20} className="text-destructive-foreground" />
            <Text className="ml-2 text-destructive-foreground">End Call</Text>
          </Button>
        </View>
      )}

      <View testID="input-bar" className="flex-row items-center gap-2 border-t border-border px-4 py-3">
        {!isCallActive && (
          <Button testID="call-button" variant="secondary" size="icon" className="rounded-full" onPress={toggleCall} disabled={isConnecting}>
            {isConnecting
              ? <ActivityIndicator size="small" color="#888" />
              : <Icon as={MicIcon} size={20} className="text-foreground" />}
          </Button>
        )}
        <Input
          testID="chat-input"
          className="flex-1"
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <Button testID="send-button" size="icon" className="rounded-full" onPress={sendMessage} disabled={!inputText.trim()}>
          <Icon as={SendIcon} size={20} className="text-primary-foreground" />
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}

// --- Helper Components ---

function PartialBubble({ role, text }: { role: 'user' | 'assistant', text: string }) {
  const isUser = role === 'user'
  return (
    <View className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? 'rounded-br-sm bg-primary/60' : 'rounded-bl-sm bg-muted/60'
        }`}>
        <Text
          className={`text-sm italic ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {text}
        </Text>
      </View>
    </View>
  )
}

function ThinkingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current
  const dot2 = useRef(new Animated.Value(0.3)).current
  const dot3 = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    // Single loop with sequential steps prevents animation drift between dots
    const pulse = (dot: Animated.Value) =>
      Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      ])

    const loop = Animated.loop(
      Animated.sequence([
        pulse(dot1),
        pulse(dot2),
        pulse(dot3),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [dot1, dot2, dot3])

  return (
    <View className="flex-row items-center gap-1.5 py-0.5">
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#aaa',
            opacity: dot,
          }}
        />
      ))}
    </View>
  )
}

function ChatImage({ url }: { url: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <View className="my-2 items-center justify-center rounded-lg bg-muted/50 p-4">
        <Text className="text-xs text-muted-foreground">Image failed to load</Text>
      </View>
    )
  }

  return (
    <View className="my-2">
      {loading && (
        <View className="absolute inset-0 z-10 items-center justify-center">
          <ActivityIndicator size="small" color="#888" />
        </View>
      )}
      <Image
        source={{ uri: url }}
        className="w-full rounded-lg"
        style={{ aspectRatio: 1 }}
        resizeMode="cover"
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true) }}
      />
    </View>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isThinkingPlaceholder = message.id === THINKING_MESSAGE_ID

  if (isThinkingPlaceholder) {
    return (
      <View testID="thinking-indicator" className="mb-3 px-4 items-start">
        <View className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
          <ThinkingDots />
        </View>
      </View>
    )
  }

  const parts = parseContent(message.content)

  return (
    <View testID={`message-bubble-${isUser ? 'user' : 'assistant'}`} className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-muted'
        }`}>
        {parts.map((part, i) =>
          part.type === 'image' ? (
            <ChatImage key={i} url={part.url} />
          ) : part.text.trim() ? (
            <Text key={i} className={`text-sm ${isUser ? 'text-primary-foreground' : 'text-foreground'}`}>
              {part.text.trim()}
            </Text>
          ) : null
        )}
      </View>
    </View>
  )
}

// --- Helper Functions ---

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = []
  let lastIndex = 0

  for (const match of content.matchAll(MD_IMAGE_REGEX)) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'image', alt: match[1], url: match[2] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) })
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: content })
  }

  const expanded: ContentPart[] = []
  for (const part of parts) {
    if (part.type !== 'text') {
      expanded.push(part)
      continue
    }
    let textLastIndex = 0
    for (const match of part.text.matchAll(URL_IMAGE_REGEX)) {
      const url = match[1]
      const start = match.index + (match[0].length - url.length)
      if (start > textLastIndex) {
        expanded.push({ type: 'text', text: part.text.slice(textLastIndex, start) })
      }
      expanded.push({ type: 'image', alt: '', url })
      textLastIndex = start + url.length
    }
    if (textLastIndex < part.text.length) {
      expanded.push({ type: 'text', text: part.text.slice(textLastIndex) })
    }
  }

  return expanded.length > 0 ? expanded : [{ type: 'text', text: content }]
}

async function syncTextMessageToVapi(conversationId: number, userInput: string) {
  try {
    const conv = await getConversation(conversationId)
    if (!conv) return

    const result = await sendVapiChat(userInput, {
      sessionId: conv.vapi_session_id || undefined,
      previousChatId: conv.vapi_last_chat_id || undefined,
    })

    if (result?.id) {
      await updateConversationVapi(
        conversationId,
        result.sessionId || conv.vapi_session_id,
        result.id
      )
    }
  } catch (e) {
    console.warn('[VapiSync] Failed to sync text message:', e)
  }
}

async function syncConversationToVapi(conversationId: number) {
  try {
    const conv = await getConversation(conversationId)
    if (!conv) return

    // If we already have a session, the messages were synced incrementally
    if (conv.vapi_last_chat_id) return

    const msgs = await getMessages(conversationId)
    if (msgs.length === 0) return

    const result = await syncMessagesToVapi(
      msgs.map((m) => ({ role: m.role, content: m.content })),
      { sessionId: conv.vapi_session_id || undefined }
    )

    if (result.sessionId || result.lastChatId) {
      await updateConversationVapi(
        conversationId,
        result.sessionId || conv.vapi_session_id,
        result.lastChatId || conv.vapi_last_chat_id
      )
    }
  } catch (e) {
    console.warn('[VapiSync] Failed to sync conversation:', e)
  }
}
