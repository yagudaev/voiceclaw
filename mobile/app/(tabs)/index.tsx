import { LatencyBadge } from '@/components/latency-badge'
import { ToolCallRow, type ToolCallItem } from '@/components/tool-call-row'
import { VoiceClawMark } from '@/components/brand/voiceclaw-mark'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { addMessage, createConversation, getLatestConversation, getMessages, getSetting, type Message, type ProviderInfo } from '@/db'
import { streamRealtimeText } from '@/lib/chat'
import { BRAND } from '@/lib/brand'
import { useConversationContext } from '@/lib/conversation-context'
import { maybeGenerateTitle } from '@/lib/title'
import { useCallSounds } from '@/lib/sounds'
import { useRealtime, getProviderForRealtimeModel, type RealtimeCallbacks, type RealtimeConfig, type RmsMetrics } from '@/lib/use-realtime'
import { useDirectGemini } from '@/lib/use-direct-gemini'
import { DEFAULT_REALTIME_SERVER_URL } from '@/lib/relay-config'
import { useAutoReconnect } from '@/lib/use-auto-reconnect'
import ExpoRealtimeAudioModule from '@/modules/expo-realtime-audio/src/ExpoRealtimeAudioModule'
import { Stack } from 'expo-router'
import { MicIcon, MicOffIcon, PhoneOffIcon, PlusIcon, RefreshCwIcon, SendIcon, XIcon } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, FlatList, Image, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, View } from 'react-native'

const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g
const URL_IMAGE_REGEX = /(?:^|\s)(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?)/gi
const THINKING_MESSAGE_ID = -2
const LISTENING_MESSAGE_ID = -3
const DEFAULT_REALTIME_MODEL = 'gemini-3.1-flash-live-preview'
const PAIR_NEEDED_MESSAGE = [
  "This device isn't paired with your VoiceClaw desktop yet.",
  '',
  'On your Mac: open VoiceClaw → Settings → Devices → Pair a device.',
  'Then open the iPhone Camera and scan the QR — it\'ll bring you right back here.',
  '',
  'Already paired? Re-pair from the same screen and tap the new QR.',
].join('\n')
const REALTIME_MODELS = [
  'gemini-3.1-flash-live-preview',
  'grok-voice-think-fast-1.0',
  'gpt-realtime-2',
  'gpt-realtime-mini',
] as const
const GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'] as const
const XAI_VOICES = ['eve', 'ara', 'rex', 'sal', 'leo'] as const
const OPENAI_REALTIME_VOICES = [
  'marin',
  'cedar',
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
] as const

type ContentPart = { type: 'text', text: string } | { type: 'image', url: string, alt: string }
type DisplayItem =
  | { kind: 'message', message: Message }
  | { kind: 'tool_call', item: ToolCallItem }

export default function ChatScreen() {
  const { colorScheme } = useColorScheme()
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light
  const [messages, setMessages] = useState<Message[]>([])
  const [toolCalls, setToolCalls] = useState<Map<string, ToolCallItem>>(new Map())
  const [inputText, setInputText] = useState('')
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const [showLatency, setShowLatency] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [streamingRole, setStreamingRole] = useState<'user' | 'assistant'>('assistant')
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)
  const flatListRef = useRef<FlatList<DisplayItem>>(null)
  const initialLoadGraceRef = useRef(true)
  const isPinnedToBottomRef = useRef(true)
  const { playJoin, playEnd, startThinking, stopThinking } = useCallSounds()
  const soundsRef = useRef({ playJoin, playEnd, startThinking, stopThinking })
  soundsRef.current = { playJoin, playEnd, startThinking, stopThinking }
  const { selectedConversationId, clearSelection } = useConversationContext()
  const activeProvidersRef = useRef<ProviderInfo | null>(null)
  const cancelReconnectRef = useRef<(() => void) | null>(null)
  const triggerReconnectRef = useRef<(() => void) | null>(null)
  const pairNeededShownRef = useRef(false)
  const connectionErrorShownRef = useRef(false)
  const [rmsMetrics, setRmsMetrics] = useState<RmsMetrics | null>(null)
  const conversationIdRef = useRef<number | null>(null)
  conversationIdRef.current = conversationId

  // Refs for pipeline callbacks that need fresh closure values
  const loadMessagesRef = useRef<() => Promise<void>>(async () => {})
  const startRealtimeCallRef = useRef<() => Promise<boolean>>(async () => false)

  // 'direct' = phone ↔ Gemini Live directly (beta), 'relay' = phone ↔ desktop
  // relay-proxy (default). Set per call in startRealtimeCall; toggleMute and
  // stopRealtimeCall route through the active mode.
  const activeModeRef = useRef<'direct' | 'relay'>('relay')
  // Snapshot of the config used for the current call so we can rebuild a relay
  // start() if direct-mode setup fails after we already committed to it.
  const lastConfigRef = useRef<RealtimeConfig | null>(null)
  const fallbackToRelayRef = useRef<((reason: string) => void) | null>(null)

  const sharedCallbacks: RealtimeCallbacks = {
    onSessionReady: (sessionId) => {
      console.log('[Realtime] Session ready:', sessionId)
      setIsCallActive(true)
      setIsConnecting(false)
      cancelReconnectRef.current?.()
      pairNeededShownRef.current = false
      connectionErrorShownRef.current = false
      soundsRef.current.playJoin()
      ExpoRealtimeAudioModule.startCapture()
    },
    onToolCall: (callId, name, args) => {
      setToolCalls((prev) => {
        const next = new Map(prev)
        next.set(callId, { callId, name, args, status: 'in-progress', startedAt: Date.now() })
        return next
      })
    },
    onToolCompleted: (callId, name, durationMs, result) => {
      setToolCalls((prev) => {
        const next = new Map(prev)
        const existing = prev.get(callId)
        if (existing) {
          next.set(callId, { ...existing, status: 'success', durationMs, result })
        } else {
          next.set(callId, {
            callId,
            name,
            args: '',
            status: 'success',
            startedAt: Date.now() - durationMs,
            durationMs,
            result,
          })
        }
        return next
      })
    },
    onToolFailed: (callId, name, durationMs, error, cancelled) => {
      setToolCalls((prev) => {
        const next = new Map(prev)
        const existing = prev.get(callId)
        const status: ToolCallItem['status'] = cancelled ? 'cancelled' : 'error'
        if (existing) {
          next.set(callId, { ...existing, status, durationMs, error })
        } else {
          next.set(callId, {
            callId,
            name,
            args: '',
            status,
            startedAt: Date.now() - durationMs,
            durationMs,
            error,
          })
        }
        return next
      })
    },
    onToolProgress: (callId, { textDelta, step, summary }) => {
      setToolCalls((prev) => {
        const existing = prev.get(callId)
        if (!existing) return prev
        const next = new Map(prev)
        const latestStep = step ?? summary
        next.set(callId, {
          ...existing,
          progressText: textDelta
            ? (existing.progressText ?? '') + textDelta
            : existing.progressText,
          progressStep: latestStep ?? existing.progressStep,
        })
        return next
      })
    },
    onToolCancelled: (callIds) => {
      setToolCalls((prev) => {
        let changed = false
        const next = new Map(prev)
        const startedAt = Date.now()
        for (const callId of callIds) {
          const existing = next.get(callId)
          if (!existing || existing.status !== 'in-progress') continue
          next.set(callId, {
            ...existing,
            status: 'cancelled',
            durationMs: startedAt - existing.startedAt,
          })
          changed = true
        }
        return changed ? next : prev
      })
    },
    onTranscriptDelta: (text, role) => {
      if (role === 'user') setIsUserSpeaking(false)
      setStreamingRole((prevRole) => {
        if (prevRole !== role) {
          setStreamingText(text)
        } else {
          setStreamingText(prev => (prev ?? '') + text)
        }
        return role
      })
    },
    onTranscriptDone: (text, role) => {
      setStreamingText(null)
      const convId = conversationIdRef.current
      if (convId && text) {
        addMessage(convId, role, text, undefined, activeProvidersRef.current ?? undefined).then(() => {
          loadMessagesRef.current()
          if (role === 'user') maybeGenerateTitle(convId)
        })
      }
    },
    onTurnStarted: () => {
      setIsThinking(false)
      setIsUserSpeaking(true)
    },
    onTurnEnded: () => {
      setIsThinking(false)
      setIsUserSpeaking(false)
    },

    onDisconnect: () => {
      if (pairNeededShownRef.current) {
        console.log('[Realtime] Disconnect after pair-needed; skipping auto-reconnect')
        setIsConnecting(false)
        return
      }
      console.log('[Realtime] Unexpected disconnect, triggering auto-reconnect')
      triggerReconnectRef.current?.()
    },
    onError: (message, code) => {
      console.error(`[Realtime] Error (${code}): ${message}`)
      const convId = conversationIdRef.current
      if (!convId) return
      if (code === 401) {
        cancelReconnectRef.current?.()
        if (pairNeededShownRef.current) return
        pairNeededShownRef.current = true
        addMessage(convId, 'assistant', PAIR_NEEDED_MESSAGE).then(() => loadMessagesRef.current())
        return
      }
      if (connectionErrorShownRef.current) return
      connectionErrorShownRef.current = true
      addMessage(convId, 'assistant', `Couldn't reach your VoiceClaw desktop. Check that it's running and on the same network, then try again.`).then(() => loadMessagesRef.current())
    },
    onRmsMetrics: (metrics) => {
      setRmsMetrics(metrics)
    },
  }

  const realtime = useRealtime(sharedCallbacks)
  const directGemini = useDirectGemini({
    ...sharedCallbacks,
    onDirectModeFailure: (reason) => {
      console.warn('[Chat] Direct mode failed, falling back to relay-proxy:', reason)
      fallbackToRelayRef.current?.(reason)
    },
  })

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    setMessages(await getMessages(conversationId))
  }, [conversationId])
  loadMessagesRef.current = loadMessages

  const reconnectCall = useCallback(async () => {
    console.log('[Chat] Reconnecting Realtime session')
    setIsConnecting(true)
    try {
      const success = await startRealtimeCallRef.current()
      if (!success) throw new Error('Realtime reconnect failed')
    } catch (e) {
      setIsConnecting(false)
      throw e
    }
  }, [])

  const { state: reconnectState, trigger: triggerReconnect, cancel: cancelReconnect, retry: manualRetry } = useAutoReconnect({
    onReconnect: reconnectCall,
  })
  cancelReconnectRef.current = cancelReconnect
  triggerReconnectRef.current = triggerReconnect

  const resetScrollAnchoring = useCallback(() => {
    initialLoadGraceRef.current = true
    isPinnedToBottomRef.current = true
  }, [])

  const startNewConversation = useCallback(async () => {
    resetScrollAnchoring()
    const conv = await createConversation()
    setConversationId(conv.id)
    setMessages([])
    setToolCalls(new Map())
    setStreamingText(null)
    setIsThinking(false)
  }, [resetScrollAnchoring])

  const loadConversation = useCallback(async (id: number) => {
    resetScrollAnchoring()
    setConversationId(id)
    setMessages(await getMessages(id))
    setToolCalls(new Map())
    setStreamingText(null)
    setIsThinking(false)
  }, [resetScrollAnchoring])

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
    getSetting('debug_mode').then((v) => { if (v === 'true') setDebugMode(true) }).catch(() => {})
  }, [])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    if (conversationId == null) return
    initialLoadGraceRef.current = true
    isPinnedToBottomRef.current = true
    const t = setTimeout(() => { initialLoadGraceRef.current = false }, 600)
    return () => clearTimeout(t)
  }, [conversationId])

  const handleListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height
    const pinned = distanceFromBottom <= 80
    isPinnedToBottomRef.current = pinned
    if (!pinned) initialLoadGraceRef.current = false
  }, [])

  const handleContentSizeChange = useCallback(() => {
    if (initialLoadGraceRef.current) {
      flatListRef.current?.scrollToEnd({ animated: false })
      return
    }
    if (isPinnedToBottomRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true })
    }
  }, [])

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !conversationId) return
    const userInput = inputText.trim()
    setInputText('')

    await addMessage(conversationId, 'user', userInput)
    await loadMessages()

    const serverUrl = (await getSetting('realtime_server_url')) || DEFAULT_REALTIME_SERVER_URL
    const apiKey = await getSetting('realtime_api_key')
    if (!apiKey) {
      await addMessage(conversationId, 'assistant', 'Configure your VoiceClaw Desktop URL in Settings to start chatting.')
      await loadMessages()
      return
    }

    const model = normalizeRealtimeModel(await getSetting('realtime_model'))
    const voice = normalizeRealtimeVoice(model, await getSetting('realtime_voice'))
    const provider = getProviderForRealtimeModel(model)
    const systemPrompt = (await getSetting('system_prompt')) || ''
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const locale = Intl.DateTimeFormat().resolvedOptions().locale

    const recentMessages = (await getMessages(conversationId))
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20, -1)
      .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content }))

    setIsThinking(true)
    streamRealtimeText(userInput, {
      serverUrl,
      apiKey,
      model,
      voice,
      provider,
      sessionKey: `voiceclaw:${conversationId}`,
      instructionsOverride: systemPrompt || undefined,
      conversationHistory: recentMessages.length > 0 ? recentMessages : undefined,
      deviceContext: { timezone, locale },
    }, {
      onToken: (text) => {
        setIsThinking(false)
        setStreamingRole('assistant')
        setStreamingText(text)
      },
      onDone: async (text) => {
        setStreamingText(null)
        setIsThinking(false)
        await addMessage(conversationId, 'assistant', text || 'No response received.')
        await loadMessages()
        maybeGenerateTitle(conversationId)
      },
      onError: async (error) => {
        setStreamingText(null)
        setIsThinking(false)
        await addMessage(conversationId, 'assistant', `Error: ${error}`)
        await loadMessages()
      },
    })
  }, [inputText, conversationId, loadMessages])

  const toggleCall = useCallback(async () => {
    if (isCallActive) {
      cancelReconnect()
      stopRealtimeCall()
      return
    }

    setIsConnecting(true)
    let callStarted = false

    try {
      if (!conversationId) {
        console.warn('[Chat] No active conversation, cannot start call')
        return
      }

      callStarted = await startRealtimeCall()
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
      }
    }
  }, [isCallActive, conversationId, loadMessages])

  const startRealtimeCall = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false
    pairNeededShownRef.current = false
    connectionErrorShownRef.current = false

    const serverUrl = (await getSetting('realtime_server_url')) || DEFAULT_REALTIME_SERVER_URL
    const model = normalizeRealtimeModel(await getSetting('realtime_model'))
    const voice = normalizeRealtimeVoice(model, await getSetting('realtime_voice'))
    const apiKey = await getSetting('realtime_api_key')
    const volumeStr = await getSetting('realtime_volume')
    const volume = volumeStr ? parseFloat(volumeStr) : 2.0
    const systemPrompt = (await getSetting('system_prompt')) || ''
    const tracingPref = await getSetting('tracing_enabled')
    const tracingEnabled = tracingPref === null || tracingPref === undefined
      ? __DEV__
      : tracingPref === 'true'
    const echoGatePref = await getSetting('echo_gate_enabled')
    const echoGateEnabled = echoGatePref === null ? true : echoGatePref === 'true'
    const echoGateThresholdPref = await getSetting('echo_gate_threshold')
    const echoGateThreshold = echoGateThresholdPref ? parseFloat(echoGateThresholdPref) : 0.06
    const debugPref = await getSetting('debug_mode')
    const isDebug = debugPref === 'true'

    if (!apiKey) {
      await addMessage(conversationId, 'assistant', 'Please configure your API key in VoiceClaw Desktop settings first.')
      await loadMessages()
      return false
    }

    const isGemini = model.startsWith('gemini-')
    const isXAI = model.startsWith('grok-voice-')
    const realtimeProvider = isGemini ? 'gemini-realtime' : isXAI ? 'xai-realtime' : 'openai-realtime'
    activeProvidersRef.current = {
      sttProvider: realtimeProvider,
      llmProvider: realtimeProvider,
      ttsProvider: realtimeProvider,
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    const deviceName = (await getSetting('device_name')) || undefined

    const allMessages = await getMessages(conversationId)
    // Cap at 200 messages so a runaway conversation can't inflate the
    // session.config payload past a reasonable wire-size budget — the relay
    // splits this into recent verbatim turns plus a summary of older ones.
    const recentMessages = allMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-200)
      .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content }))

    const directPref = await getSetting('direct_provider_mode')
    const directProviderModeEnabled = directPref === 'true'
    // Direct mode only applies to Gemini today — OpenAI and Grok stay on the
    // relay-proxy path until the relay learns to mint tokens for them too.
    const useDirect = directProviderModeEnabled && isGemini

    const startConfig: RealtimeConfig = {
      serverUrl,
      voice,
      model,
      brainAgent: 'enabled',
      apiKey,
      sessionKey: `voiceclaw:${conversationId}`,
      volume,
      echoGateEnabled,
      echoGateThreshold,
      debugMode: isDebug,
      deviceContext: {
        timezone,
        locale,
      },
      instructionsOverride: systemPrompt || undefined,
      conversationHistory: recentMessages.length > 0 ? recentMessages : undefined,
      tracingEnabled,
      deviceName,
    }
    lastConfigRef.current = startConfig
    console.log('[Realtime] Starting session with', { serverUrl, voice, model, historyMessages: recentMessages.length, echoGateEnabled, echoGateThreshold, mode: useDirect ? 'direct' : 'relay' })

    if (useDirect) {
      activeModeRef.current = 'direct'
      directGemini.start(startConfig)
    } else {
      activeModeRef.current = 'relay'
      realtime.start(startConfig)
    }

    return true
  }, [conversationId, loadMessages, realtime, directGemini])
  startRealtimeCallRef.current = startRealtimeCall

  // If direct-mode setup fails (token mint / Gemini WS / session.prep), reuse
  // the last config to bring the call up via the relay-proxy path so the user
  // doesn't end up stranded mid-tap. Mirrors the auto-reconnect contract: we
  // silently rotate the transport, the UI just sees a connecting → connected.
  fallbackToRelayRef.current = (reason: string) => {
    const config = lastConfigRef.current
    if (!config) {
      console.warn('[Chat] fallback requested but no last config; reason:', reason)
      setIsConnecting(false)
      return
    }
    activeModeRef.current = 'relay'
    setIsConnecting(true)
    realtime.start(config)
  }

  const stopRealtimeCall = useCallback(() => {
    cancelReconnect()
    if (activeModeRef.current === 'direct') directGemini.stop()
    else realtime.stop()
    activeProvidersRef.current = null
    setIsCallActive(false)
    setIsMuted(false)
    setIsThinking(false)
    setIsUserSpeaking(false)
    setToolCalls(settleInProgressToolCalls)
    soundsRef.current.playEnd()
  }, [realtime, directGemini, cancelReconnect])

  useEffect(() => {
    if (reconnectState.status === 'failed') {
      setToolCalls(settleInProgressToolCalls)
    }
  }, [reconnectState.status])

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted
    if (activeModeRef.current === 'direct') directGemini.setMuted(newMuted)
    else realtime.setMuted(newMuted)
    setIsMuted(newMuted)
  }, [isMuted, realtime, directGemini])

  let baseMessages = messages as Message[]
  if (streamingText !== null) {
    baseMessages = [...messages, { id: -1, conversation_id: conversationId ?? 0, role: streamingRole, content: streamingText, created_at: Date.now(), stt_latency_ms: null, llm_latency_ms: null, tts_latency_ms: null, stt_provider: null, llm_provider: null, tts_provider: null }]
  } else if (isUserSpeaking) {
    baseMessages = [...messages, { id: LISTENING_MESSAGE_ID, conversation_id: conversationId ?? 0, role: 'user' as const, content: '', created_at: Date.now(), stt_latency_ms: null, llm_latency_ms: null, tts_latency_ms: null, stt_provider: null, llm_provider: null, tts_provider: null }]
  } else if (isThinking) {
    baseMessages = [...messages, { id: THINKING_MESSAGE_ID, conversation_id: conversationId ?? 0, role: 'assistant' as const, content: '', created_at: Date.now(), stt_latency_ms: null, llm_latency_ms: null, tts_latency_ms: null, stt_provider: null, llm_provider: null, tts_provider: null }]
  }

  const displayItems = buildDisplayItems(baseMessages, toolCalls)

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
              <Pressable testID="new-conversation-button" onPress={startNewConversation} className="p-2">
                <PlusIcon size={22} color={palette.ink} />
              </Pressable>
            </View>
          ),
        }}
      />

      <FlatList
        testID="messages-list"
        ref={flatListRef}
        data={displayItems}
        keyExtractor={(item) => item.kind === 'tool_call' ? `tc:${item.item.callId}` : `msg:${item.message.id}`}
        renderItem={({ item }) => {
          if (item.kind === 'tool_call') {
            return <ToolCallRow item={item.item} />
          }
          return (
            <>
              <MessageBubble message={item.message} />
              {showLatency && item.message.id !== THINKING_MESSAGE_ID && item.message.id !== LISTENING_MESSAGE_ID && <LatencyBadge message={item.message} />}
            </>
          )
        }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleListScroll}
        scrollEventThrottle={64}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={11}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <View testID="empty-chat-placeholder" className="flex-1 items-center justify-center pt-40">
            <View className="mb-5 size-16 items-center justify-center rounded-md border border-border bg-card">
              <VoiceClawMark size={42} accent />
            </View>
            <Text className="text-xl font-semibold text-foreground">VoiceClaw</Text>
            <Text className="mt-2 max-w-72 text-center text-sm leading-5 text-muted-foreground">
              Type a message or tap the mic to speak with your agent.
            </Text>
          </View>
        }
      />

      {reconnectState.status === 'reconnecting' && (
        <View className="items-center gap-2 border-t border-border bg-muted/50 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color={palette.accent} />
            <Text className="text-sm font-medium text-primary">
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

      {debugMode && isCallActive && rmsMetrics && (
        <View testID="rms-debug-panel" className="gap-2 border-t border-dashed border-border bg-background px-4 py-3">
          <Text className="text-xs font-semibold text-muted-foreground">Audio Debug</Text>
          <View className="flex-row items-center gap-2">
            <Text className="w-12 text-xs text-muted-foreground">RMS</Text>
            <View className="h-4 flex-1 overflow-hidden rounded bg-muted">
              <View
                style={{
                  width: `${Math.min(rmsMetrics.rms * 500, 100)}%`,
                  backgroundColor: rmsMetrics.gated ? palette.destructive : rmsMetrics.playbackActive ? palette.accent : palette.sage,
                }}
                className="h-full rounded"
              />
              <View
                style={{
                  position: 'absolute',
                  left: `${Math.min(rmsMetrics.threshold * 500, 100)}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  backgroundColor: palette.ink,
                }}
              />
            </View>
            <Text className="w-16 text-right text-xs tabular-nums text-muted-foreground">
              {rmsMetrics.rms.toFixed(4)}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <Text className="text-xs text-muted-foreground">
              gate:{rmsMetrics.gated ? 'GATED' : 'open'}
            </Text>
            <Text className="text-xs text-muted-foreground">
              playback:{rmsMetrics.playbackActive ? 'on' : 'off'}
            </Text>
            <Text className="text-xs text-muted-foreground">
              threshold:{rmsMetrics.threshold.toFixed(3)}
            </Text>
            <Text className="text-xs text-muted-foreground">
              route:{rmsMetrics.route}
            </Text>
          </View>
        </View>
      )}

      <View testID="input-bar" className="flex-row items-center gap-2 border-t border-border bg-card/80 px-4 py-3">
        {!isCallActive && (
          <Button
            testID="call-button"
            variant={isConnecting ? 'default' : 'secondary'}
            size="icon"
            className="rounded-full"
            onPress={toggleCall}
            disabled={isConnecting}
          >
            {isConnecting
              ? <ActivityIndicator size="small" color={colorScheme === 'dark' ? palette.paper : '#FFFAF2'} />
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

function settleInProgressToolCalls(prev: Map<string, ToolCallItem>): Map<string, ToolCallItem> {
  let changed = false
  const next = new Map(prev)
  const now = Date.now()
  for (const [callId, item] of prev) {
    if (item.status !== 'in-progress') continue
    next.set(callId, {
      ...item,
      status: 'stopped',
      durationMs: now - item.startedAt,
    })
    changed = true
  }
  return changed ? next : prev
}

function buildDisplayItems(messages: Message[], toolCalls: Map<string, ToolCallItem>): DisplayItem[] {
  const items: DisplayItem[] = messages.map((m) => ({ kind: 'message' as const, message: m }))
  for (const tc of toolCalls.values()) {
    items.push({ kind: 'tool_call' as const, item: tc })
  }
  items.sort((a, b) => {
    const aTime = a.kind === 'message' ? a.message.created_at : a.item.startedAt
    const bTime = b.kind === 'message' ? b.message.created_at : b.item.startedAt
    return aTime - bTime
  })
  return items
}

function ThinkingDots() {
  const { colorScheme } = useColorScheme()
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light
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
            backgroundColor: palette.muted,
            opacity: dot,
          }}
        />
      ))}
    </View>
  )
}

function ListeningDots() {
  const { colorScheme } = useColorScheme()
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light
  const dotColor = colorScheme === 'dark' ? palette.paper : '#FFFAF2'
  const scale1 = useRef(new Animated.Value(0.4)).current
  const scale2 = useRef(new Animated.Value(0.4)).current
  const scale3 = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const pulse = (dot: Animated.Value) =>
      Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.4, duration: 300, useNativeDriver: true }),
      ])

    const loop = Animated.loop(
      Animated.stagger(150, [pulse(scale1), pulse(scale2), pulse(scale3)])
    )
    loop.start()
    return () => loop.stop()
  }, [scale1, scale2, scale3])

  return (
    <View className="flex-row items-center gap-2 py-0.5">
      {[scale1, scale2, scale3].map((s, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: dotColor,
            opacity: s,
            transform: [{ scale: s }],
          }}
        />
      ))}
    </View>
  )
}

function ChatImage({ url }: { url: string }) {
  const { colorScheme } = useColorScheme()
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <View className="my-2 items-center justify-center rounded-md bg-muted/50 p-4">
        <Text className="text-xs text-muted-foreground">Image failed to load</Text>
      </View>
    )
  }

  return (
    <View className="my-2">
      {loading && (
        <View className="absolute inset-0 z-10 items-center justify-center">
          <ActivityIndicator size="small" color={palette.muted} />
        </View>
      )}
      <Image
        source={{ uri: url }}
        className="w-full rounded-md"
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

  if (message.id === LISTENING_MESSAGE_ID) {
    return (
      <View testID="listening-indicator" className="mb-3 px-4 items-end">
        <View className="max-w-[80%] rounded-md bg-primary px-4 py-3">
          <ListeningDots />
        </View>
      </View>
    )
  }

  if (isThinkingPlaceholder) {
    return (
      <View testID="thinking-indicator" className="mb-3 px-4 items-start">
        <View className="max-w-[80%] rounded-md border border-border bg-card px-4 py-3">
          <ThinkingDots />
        </View>
      </View>
    )
  }

  const parts = parseContent(message.content)

  return (
    <View testID={`message-bubble-${isUser ? 'user' : 'assistant'}`} className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] rounded-md px-4 py-3 ${
          isUser ? 'bg-primary' : 'border border-border bg-card'
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
      <Text className="mt-1 text-[10px] text-muted-foreground/50">
        {formatMessageTime(message.created_at)}
      </Text>
    </View>
  )
}

// --- Helper Functions ---

function normalizeRealtimeModel(model: string | null): typeof REALTIME_MODELS[number] {
  return (REALTIME_MODELS as readonly string[]).includes(model ?? '')
    ? model as typeof REALTIME_MODELS[number]
    : DEFAULT_REALTIME_MODEL
}

function normalizeRealtimeVoice(model: typeof REALTIME_MODELS[number], voice: string | null): string {
  if (model.startsWith('grok-voice-')) {
    return voice && (XAI_VOICES as readonly string[]).includes(voice) ? voice : 'eve'
  }
  if (model.startsWith('gpt-realtime')) {
    return voice && (OPENAI_REALTIME_VOICES as readonly string[]).includes(voice) ? voice : 'marin'
  }

  return voice && (GEMINI_VOICES as readonly string[]).includes(voice) ? voice : 'Zephyr'
}

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

function formatMessageTime(epochMs: number): string {
  const d = new Date(epochMs)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
