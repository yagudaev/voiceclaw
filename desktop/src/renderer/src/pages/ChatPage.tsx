import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type MouseEvent,
} from 'react'
import {
  Clock,
  Copy,
  ImagePlus,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Phone,
  PhoneOff,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { AttachmentTray } from '../components/AttachmentTray'
import { ChatComposer } from '../components/ChatComposer'
import { MessageBubble } from '../components/MessageBubble'
import { MessageContextMenu, type MessageContextMenuItem } from '../components/MessageContextMenu'
import { MessageGroupSeparator } from '../components/MessageGroupSeparator'
import { ThinkingDots } from '../components/ThinkingDots'
import { AudioLevelMeter } from '../components/AudioLevelMeter'
import { VoiceClawMark } from '../components/brand/VoiceClawMark'
import { ScreenSharePicker } from '../components/ScreenSharePicker'
import { VolumeControl } from '../components/VolumeControl'
import { ToolCallRow } from '../components/ToolCallRow'
import { AdapterErrorBanner } from '../components/AdapterErrorBanner'
import {
  ScreenCapture,
  type DisplayBounds,
  type ScreenSource,
  type SourceContext,
  type Stroke,
  type WindowBounds,
} from '../lib/screen-capture'
import { useRealtime, type RealtimeCallbacks, type AdapterErrorPayload } from '../lib/use-realtime'
import { captureRenderer } from '../lib/telemetry'
import { useConversationContext } from '../lib/conversation-context'
import {
  applyToolCallStarted,
  applyToolCallCompleted,
  applyToolCallFailed,
  applyToolCallCancelled,
  applyToolCallProgress,
  type ToolCallEntry,
} from '../lib/tool-call-store'
import {
  addMessage,
  attachToMessage,
  createConversation,
  deleteMessage,
  getAttachmentsForConversation,
  getLatestConversation,
  getMessages,
  getSetting,
  pickImageAttachment,
  setSetting,
  updateConversationTitle,
  type Attachment,
  type Message,
} from '../lib/db'
import {
  fileToPendingAttachment,
  pendingToAttachmentInput,
  type PendingAttachment,
} from '../lib/attachments'
import { getVoiceForProvider, providerForModel } from '../lib/voice-prefs'
import { groupMessages } from '../lib/message-grouping'
import { streamTextChat } from '../lib/text-chat'

const DEFAULT_REALTIME_MODEL = 'gemini-3.1-flash-live-preview'
const REALTIME_MODELS = [
  'gemini-3.1-flash-live-preview',
  'grok-voice-think-fast-1.0',
  'gpt-realtime-2',
  'gpt-realtime-mini',
] as const

interface ChatPageProps {
  onNavigateToSettings?: () => void
}

export function ChatPage({ onNavigateToSettings }: ChatPageProps = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const conversationIdRef = useRef<number | null>(null)
  const titleGeneratedRef = useRef(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [outputGain, setOutputGain] = useState(1)
  const [baseVolume, setBaseVolume] = useState(1)
  const [outputMuted, setOutputMuted] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamingRole, setStreamingRole] = useState<'user' | 'assistant'>('assistant')
  // Synchronous mirror of streamingRole — IPC callbacks need to read the
  // current role outside of a setState updater since updaters must stay pure.
  const streamingRoleRef = useRef<'user' | 'assistant'>('assistant')
  const [showLatency, setShowLatency] = useState(false)
  const [showContextUsage, setShowContextUsage] = useState(false)
  const [usage, setUsage] = useState<{
    promptTokens?: number
    totalTokens?: number
    inputAudioTokens?: number
    outputAudioTokens?: number
  } | null>(null)
  const [connectionError, setConnectionError] = useState('')
  const [adapterError, setAdapterError] = useState<AdapterErrorPayload | null>(null)
  const [activeRealtimeModel, setActiveRealtimeModel] = useState('')
  const [showScreenPicker, setShowScreenPicker] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenSourceName, setScreenSourceName] = useState('')
  const screenCaptureRef = useRef<ScreenCapture | null>(null)
  const overlayStrokesRef = useRef<Stroke[]>([])
  const overlayDisplayBoundsRef = useRef<DisplayBounds | null>(null)
  const sourceContextRef = useRef<SourceContext | null>(null)
  const windowBoundsPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activeRelayUrlRef = useRef<string>('')
  const brainCallStartRef = useRef<Map<string, number>>(new Map())
  const textChatCancelRef = useRef<(() => void) | null>(null)
  const [messageMenu, setMessageMenu] = useState<{ x: number; y: number; message: Message } | null>(null)
  const [showTimes, setShowTimes] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [sendingAttachments, setSendingAttachments] = useState(false)
  const dragDepthRef = useRef(0)
  const [typedMessageIds, setTypedMessageIds] = useState<Set<number>>(() => new Set())
  const { selectedConversationId, selectConversation } = useConversationContext()

  const attachmentsByMessage = useMemo(() => {
    const map = new Map<number, Attachment[]>()
    for (const a of attachments) {
      const list = map.get(a.message_id) ?? []
      list.push(a)
      map.set(a.message_id, list)
    }
    return map
  }, [attachments])

  // Reload messages from DB — single source of truth, prevents duplicates.
  // Uses conversationIdRef so callbacks always see the latest ID.
  const loadMessages = useCallback(async () => {
    const convId = conversationIdRef.current
    if (!convId) return
    const [msgs, atts] = await Promise.all([
      getMessages(convId),
      getAttachmentsForConversation(convId),
    ])
    setMessages(msgs)
    setAttachments(atts)
  }, [])

  const handleMessageContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>, message: Message) => {
      setMessageMenu({ x: event.clientX, y: event.clientY, message })
    },
    [],
  )

  const closeMessageMenu = useCallback(() => setMessageMenu(null), [])

  const handleDeleteMessage = useCallback(async (message: Message) => {
    setMessageMenu(null)
    const ok = window.confirm(
      'Delete this message? This removes it from the conversation history and cannot be undone.',
    )
    if (!ok) return
    setMessages((prev) => prev.filter((m) => m.id !== message.id))
    try {
      const result = await deleteMessage(message.id)
      if (!result.ok) {
        console.warn('[ChatPage] Failed to delete message:', result.error)
        await loadMessages()
      }
    } catch (err) {
      console.warn('[ChatPage] Failed to delete message:', err)
      await loadMessages()
    }
  }, [loadMessages])

  const handleCopyMessage = useCallback(async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content)
    } catch (err) {
      console.warn('[ChatPage] Failed to copy message:', err)
    }
  }, [])

  const handleToggleShowTimes = useCallback(() => {
    setShowTimes((v) => !v)
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolCalls, streamingText, isThinking])

  // Load conversation when selected from History tab
  useEffect(() => {
    if (selectedConversationId != null) {
      loadConversation(selectedConversationId)
      selectConversation(null)
    }
  }, [selectedConversationId, selectConversation])

  // Load latest conversation on mount
  useEffect(() => {
    loadLatestConversation()
    getSetting('show_latency').then((v) => setShowLatency(v === 'true'))
    getSetting('show_context_usage').then((v) => setShowContextUsage(v === 'true'))
    getSetting('realtime_volume').then((v) => {
      const parsed = parseFloat(v ?? '')
      if (!Number.isNaN(parsed)) setBaseVolume(Math.max(0, parsed))
    })
    getSetting('realtime_output_gain').then((v) => {
      const parsed = parseFloat(v ?? '')
      if (!Number.isNaN(parsed)) setOutputGain(Math.max(0, Math.min(1, parsed)))
    })
  }, [])

  const greetingTriggeredRef = useRef(false)

  const loadLatestConversation = async () => {
    const conv = await getLatestConversation()
    if (conv) {
      conversationIdRef.current = conv.id
      setConversationId(conv.id)
      const [msgs, atts] = await Promise.all([
        getMessages(conv.id),
        getAttachmentsForConversation(conv.id),
      ])
      setMessages(msgs)
      setAttachments(atts)
      titleGeneratedRef.current = msgs.length > 0
    }
  }

  const loadConversation = async (id: number) => {
    conversationIdRef.current = id
    setConversationId(id)
    const [msgs, atts] = await Promise.all([
      getMessages(id),
      getAttachmentsForConversation(id),
    ])
    setMessages(msgs)
    setAttachments(atts)
    titleGeneratedRef.current = msgs.length > 0
  }

  const ensureConversation = async (): Promise<number> => {
    if (conversationIdRef.current) return conversationIdRef.current
    const conv = await createConversation()
    conversationIdRef.current = conv.id
    setConversationId(conv.id)
    return conv.id
  }

  const realtimeCallbacks: RealtimeCallbacks = {
    onSessionReady: () => {
      setIsConnecting(false)
      setIsCallActive(true)
    },
    onTranscriptDelta: (text, role) => {
      if (streamingRoleRef.current !== role) {
        streamingRoleRef.current = role
        setStreamingRole(role)
        setStreamingText(text)
      } else {
        setStreamingText((prev) => prev + text)
      }
      if (role === 'assistant') setIsThinking(false)
    },
    onTranscriptDone: async (text, role) => {
      setStreamingText('')
      if (!text.trim()) return
      const convId = await ensureConversation()
      await addMessage(convId, role, text)
      await loadMessages()

      if (role === 'user' && !titleGeneratedRef.current) {
        titleGeneratedRef.current = true
        const title = generateTitle(text)
        updateConversationTitle(convId, title).catch((err) =>
          console.warn('[ChatPage] Failed to update title:', err)
        )
      }
    },
    onTurnStarted: () => {
      setIsThinking(false)
      setStreamingText('')
      streamingRoleRef.current = 'user'
      setStreamingRole('user')
    },
    onTurnEnded: () => {
      setIsThinking(false)
    },
    onToolCall: async (callId, name, args) => {
      if (name === 'ask_brain') brainCallStartRef.current.set(callId, Date.now())
      setToolCalls((prev) => applyToolCallStarted(prev, callId, name, args))
      if (name === 'displayText') {
        try {
          const parsed = JSON.parse(args)
          const convId = await ensureConversation()
          await addMessage(convId, 'assistant', parsed.text)
          await loadMessages()
        } catch {
          // ignore parse errors
        }
      }
    },
    onToolCallCompleted: (callId, _name, durationMs, result) => {
      setToolCalls((prev) => applyToolCallCompleted(prev, callId, durationMs, result))
    },
    onToolCallFailed: (callId, _name, durationMs, error, cancelled) => {
      setToolCalls((prev) => applyToolCallFailed(prev, callId, durationMs, error, cancelled))
    },
    onToolCancelled: (callIds) => {
      setToolCalls((prev) => applyToolCallCancelled(prev, callIds))
    },
    onToolCallProgress: (callId, delta) => {
      setToolCalls((prev) => applyToolCallProgress(prev, callId, delta))
    },
    onBrainResult: async (callId, query, result, error) => {
      if (error) {
        const startedAt = brainCallStartRef.current.get(callId)
        const duration_ms = startedAt != null ? Date.now() - startedAt : 0
        brainCallStartRef.current.delete(callId)
        captureRenderer('brain_failed', { error_type: error, duration_ms })
      } else {
        brainCallStartRef.current.delete(callId)
      }
      const body = error
        ? `[Brain] Failed for "${query}": ${error}`
        : `[Brain] ${result ?? ''}`
      if (!body.trim()) return
      const convId = await ensureConversation()
      await addMessage(convId, 'assistant', body)
      await loadMessages()
    },
    onSessionEnded: () => {
      setIsCallActive(false)
      setIsThinking(false)
      setStreamingText('')
      streamingRoleRef.current = 'assistant'
    },
    onDisconnect: () => {
      setIsCallActive(false)
      setIsConnecting(false)
      setIsThinking(false)
      setStreamingText('')
      streamingRoleRef.current = 'assistant'
    },
    onError: (message, code, payload) => {
      console.error('[ChatPage] Relay error:', message)
      if (code === 401) {
        captureRenderer('relay_unauthorized', { relay_url: activeRelayUrlRef.current })
      }
      if (payload?.userMessage) {
        setAdapterError(payload)
      } else {
        setConnectionError(message)
      }
      setIsConnecting(false)
      setIsCallActive(false)
      realtimeRef.current?.stop()
    },
    onUsage: (snapshot) => {
      setUsage({
        promptTokens: snapshot.promptTokens,
        totalTokens: snapshot.totalTokens,
        inputAudioTokens: snapshot.inputAudioTokens,
        outputAudioTokens: snapshot.outputAudioTokens,
      })
    },
  }

  const realtime = useRealtime(realtimeCallbacks)
  const realtimeRef = useRef(realtime)
  realtimeRef.current = realtime

  useEffect(() => {
    realtime.setOutputVolume(baseVolume * outputGain)
  }, [baseVolume, outputGain, realtime])

  useEffect(() => {
    realtime.setOutputMuted(outputMuted)
  }, [outputMuted, realtime])

  const startCall = useCallback(async () => {
    setConnectionError('')
    setIsConnecting(true)
    setAdapterError(null)
    setOutputMuted(false)
    const serverUrl = (await getSetting('realtime_server_url')) || (await defaultRelayUrl())
    activeRelayUrlRef.current = serverUrl
    const model = normalizeRealtimeModel(await getSetting('realtime_model'))
    const voice = await getVoiceForProvider(providerForModel(model))
    const apiKey = (await getSetting('realtime_api_key')) || ''
    // Tavily key is only forwarded when the user hasn't explicitly disabled
    // web_search. The setting is undefined on first run, which we treat as
    // enabled — only the literal 'false' string disables.
    const tavilyEnabled = (await getSetting('tavily_enabled')) !== 'false'
    const tavilyApiKey = tavilyEnabled
      ? ((await getSetting('tavily_api_key')) || undefined)
      : undefined
    const baseRaw = await getSetting('realtime_volume')
    const baseParsed = parseFloat(baseRaw ?? '')
    const freshBaseVolume = Number.isNaN(baseParsed) ? 1 : Math.max(0, baseParsed)
    setBaseVolume(freshBaseVolume)
    const volume = freshBaseVolume * outputGain
    const tracingEnabled = (await getSetting('tracing_enabled')) === 'true'
    const inputDeviceId = (await getSetting('input_device_id')) || undefined
    const outputDeviceId = (await getSetting('output_device_id')) || undefined

    const convId = conversationIdRef.current
    const conversationHistory = convId
      ? (await getMessages(convId))
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-200)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            text: m.content,
            timestamp: m.created_at,
          }))
      : []

    setActiveRealtimeModel(model)
    realtime.start({
      serverUrl,
      voice,
      model,
      brainAgent: 'enabled',
      apiKey,
      tavilyApiKey,
      volume,
      inputDeviceId,
      outputDeviceId,
      deviceContext: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        deviceModel: 'Desktop (Electron)',
      },
      conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      tracingEnabled,
    })
  }, [realtime, outputGain])

  useEffect(() => {
    if (greetingTriggeredRef.current) return
    greetingTriggeredRef.current = true
    void (async () => {
      const pending = await getSetting('pending_greeting')
      if (pending !== 'true') return
      await setSetting('pending_greeting', 'false')
      setTimeout(() => {
        if (!isCallActive && !isConnecting) startCall()
      }, 600)
    })()
  }, [isCallActive, isConnecting, startCall])

  const endCall = useCallback(() => {
    realtime.stop()
    setIsCallActive(false)
    setIsConnecting(false)
    setIsThinking(false)
    setStreamingText('')
    setIsMuted(false)
    setOutputMuted(false)
    setActiveRealtimeModel('')
    window.electronAPI?.callBar?.sendMuted?.(false)
  }, [realtime])

  const toggleMute = useCallback(() => {
    const next = !isMuted
    setIsMuted(next)
    window.electronAPI?.callBar?.sendMuted?.(next)
    realtime.setMuted(next)
  }, [isMuted, realtime])

  const handleOutputGainChange = useCallback((next: number) => {
    setOutputGain(next)
    setSetting('realtime_output_gain', next.toString()).catch(() => {})
  }, [])

  const handleOutputMutedChange = useCallback((next: boolean) => {
    setOutputMuted(next)
  }, [])

  // The floating call bar's context menu forwards mute / end-call
  // requests through main. Wire them to the chat UI's existing actions.
  useEffect(() => {
    const api = (window as unknown as {
      electronAPI?: {
        callBar?: {
          onMuteToggleRequest: (h: () => void) => () => void
          onEndCallRequest: (h: () => void) => () => void
        }
      }
    }).electronAPI?.callBar
    if (!api) return
    const offMute = api.onMuteToggleRequest(() => toggleMute())
    const offEnd = api.onEndCallRequest(() => endCall())
    return () => {
      offMute()
      offEnd()
    }
  }, [toggleMute, endCall])

  // Image attachments depend on the active model accepting visual input.
  // Grok Voice is audio-only — surface that as a tooltip rather than
  // letting the user attach an image the model will silently ignore.
  const attachDisabledReason = activeRealtimeModel.startsWith('grok-voice-')
    ? 'Image attachments are only available with Gemini Live. Grok Voice does not support image input.'
    : undefined

  const handleComposerSubmit = useCallback(async (text: string) => {
    if (textChatCancelRef.current) {
      textChatCancelRef.current()
      textChatCancelRef.current = null
      setStreamingText('')
      setIsThinking(false)
    }
    const convId = await ensureConversation()
    // Snapshot + clear any pending image attachments at submit time so they
    // ride along with this turn rather than appearing as a separate
    // "Attached: …" placeholder. Persist them onto the same user message so
    // the chat history shows the image inline next to the text.
    const attachmentsToSend = pendingAttachments
    if (attachmentsToSend.length > 0 && attachDisabledReason) {
      setAttachmentError(attachDisabledReason)
      setPendingAttachments([])
      return
    }
    const persisted = await addMessage(convId, 'user', text)
    setTypedMessageIds((prev) => {
      const next = new Set(prev)
      next.add(persisted.id)
      return next
    })
    if (attachmentsToSend.length > 0) {
      const newAttachments: Attachment[] = []
      const failures: string[] = []
      for (const pending of attachmentsToSend) {
        const result = await attachToMessage(persisted.id, pendingToAttachmentInput(pending))
        if (result.ok) newAttachments.push(result.attachment)
        else failures.push(`${pending.originalName ?? 'attachment'}: ${result.error}`)
      }
      setAttachments((prev) => [...prev, ...newAttachments])
      setPendingAttachments([])
      if (failures.length > 0) setAttachmentError(failures.join('  '))
      else setAttachmentError(null)
    }
    await loadMessages()

    if (!titleGeneratedRef.current) {
      titleGeneratedRef.current = true
      const title = generateTitle(text)
      updateConversationTitle(convId, title).catch((err) =>
        console.warn('[ChatPage] Failed to update title:', err),
      )
    }

    if (realtimeRef.current?.isConnected) {
      // Active call — push images first so they're in the conversation
      // before the text turn triggers a response.
      for (const pending of attachmentsToSend) {
        try { realtimeRef.current.sendFrame(pending.base64, pending.mime) }
        catch (err) { console.warn('[ChatPage] sendFrame failed:', err) }
      }
      const ok = realtimeRef.current.sendUserText(text)
      if (!ok) console.warn('[ChatPage] sendUserText failed — websocket not open')
      return
    }

    const serverUrl = (await getSetting('realtime_server_url')) || (await defaultRelayUrl())
    const apiKey = (await getSetting('realtime_api_key')) || ''
    if (!apiKey) {
      await addMessage(
        convId,
        'assistant',
        'Add a Brain Gateway URL and API key in Settings to chat with the assistant.',
      )
      await loadMessages()
      return
    }
    const model = normalizeRealtimeModel(await getSetting('realtime_model'))
    const provider = providerForModel(model)
    const voice = await getVoiceForProvider(provider)
    const tavilyEnabled = (await getSetting('tavily_enabled')) !== 'false'
    const tavilyApiKey = tavilyEnabled
      ? ((await getSetting('tavily_api_key')) || undefined)
      : undefined
    const recent = (await getMessages(convId))
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20, -1)
      .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content, timestamp: m.created_at }))

    setIsThinking(true)
    streamingRoleRef.current = 'assistant'
    setStreamingRole('assistant')
    textChatCancelRef.current = streamTextChat(text, {
      serverUrl,
      apiKey,
      provider: provider === 'gemini' ? 'gemini' : provider === 'xai' ? 'xai' : 'openai',
      model,
      voice,
      tavilyApiKey,
      sessionKey: `voiceclaw-desktop:${convId}`,
      conversationHistory: recent.length > 0 ? recent : undefined,
      deviceContext: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        deviceModel: 'Desktop (Electron)',
      },
      images: attachmentsToSend.length > 0
        ? attachmentsToSend.map((p) => ({ base64: p.base64, mimeType: p.mime }))
        : undefined,
    }, {
      onToken: (full) => {
        setIsThinking(false)
        setStreamingText(full)
      },
      onDone: async (full) => {
        setStreamingText('')
        setIsThinking(false)
        textChatCancelRef.current = null
        if (full.trim()) {
          await addMessage(convId, 'assistant', full)
          await loadMessages()
        }
      },
      onError: async (err) => {
        setStreamingText('')
        setIsThinking(false)
        textChatCancelRef.current = null
        await addMessage(convId, 'assistant', `Error: ${err}`)
        await loadMessages()
      },
    })
  }, [loadMessages, pendingAttachments, attachDisabledReason])

  useEffect(() => {
    return () => {
      textChatCancelRef.current?.()
      textChatCancelRef.current = null
    }
  }, [])

  const newConversation = useCallback(() => {
    if (isCallActive) endCall()
    conversationIdRef.current = null
    setConversationId(null)
    setMessages([])
    setAttachments([])
    setPendingAttachments([])
    setAttachmentError(null)
    setToolCalls([])
    setTypedMessageIds(new Set())
    titleGeneratedRef.current = false
  }, [isCallActive, endCall])

  const startScreenShare = useCallback(async (source: ScreenSource) => {
    if (activeRealtimeModel.startsWith('grok-voice-')) return
    setShowScreenPicker(false)
    const sourceKind: 'display' | 'window' = source.id.startsWith('screen:')
      ? 'display'
      : 'window'
    const capture = new ScreenCapture()
    capture.setSourceName(source.name)
    capture.setAnnotationProvider({
      getStrokes: () => overlayStrokesRef.current,
      getSourceContext: () => sourceContextRef.current,
    })
    screenCaptureRef.current = capture
    try {
      await capture.start(source.id, (frame) => {
        if (frame.hasStrokes && frame.strokesPng) {
          realtime.sendFrame(frame.composite, {
            original: frame.original,
            strokesPng: frame.strokesPng,
          })
        } else {
          realtime.sendFrame(frame.composite)
        }
      })
      setIsScreenSharing(true)
      setScreenSourceName(source.name)
      // For display sources the chromeMediaSourceId is "screen:<displayId>:0";
      // pulling the displayId out and forwarding it to the overlay keeps the
      // transparent canvas on the same monitor as the captured frame so
      // strokes line up on multi-display setups.
      const displayId =
        sourceKind === 'display' ? parseDisplayIdFromSourceId(source.id) : null
      void window.electronAPI.drawOverlay.show(displayId ?? undefined)
      if (sourceKind === 'window') {
        const windowId = parseWindowIdFromSourceId(source.id)
        if (windowId !== null) {
          startWindowBoundsPolling(windowId)
        }
      }
    } catch (err) {
      console.error('[ChatPage] Screen capture failed:', err)
      screenCaptureRef.current = null
    }
  }, [activeRealtimeModel, realtime])

  const stopScreenShare = useCallback(() => {
    screenCaptureRef.current?.stop()
    screenCaptureRef.current = null
    setIsScreenSharing(false)
    setScreenSourceName('')
    setDrawMode(false)
    setHasStrokes(false)
    overlayStrokesRef.current = []
    overlayDisplayBoundsRef.current = null
    sourceContextRef.current = null
    if (windowBoundsPollRef.current) {
      clearInterval(windowBoundsPollRef.current)
      windowBoundsPollRef.current = null
    }
    // Clear before hide — the overlay window stays alive across shares,
    // so its own strokesRef would otherwise repaint stale annotations the
    // moment the next share starts and the user begins drawing again.
    void window.electronAPI.drawOverlay.clear()
    void window.electronAPI.drawOverlay.hide()
  }, [])

  const toggleDrawMode = useCallback(() => {
    void window.electronAPI.drawOverlay.setMode(drawMode ? 'idle' : 'draw')
  }, [drawMode])

  const clearStrokes = useCallback(() => {
    overlayStrokesRef.current = []
    setHasStrokes(false)
    void window.electronAPI.drawOverlay.clear()
  }, [])

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare()
    } else {
      setShowScreenPicker(true)
    }
  }, [isScreenSharing, stopScreenShare])

  useEffect(() => {
    const off = window.electronAPI.shortcuts?.onTriggered((action) => {
      if (action === 'toggleCall') {
        if (isCallActive) {
          endCall()
        } else if (!isConnecting) {
          void startCall()
        }
      } else if (action === 'mute') {
        if (isCallActive) toggleMute()
      } else if (action === 'annotate') {
        if (isScreenSharing) toggleDrawMode()
      } else if (action === 'clearAnnotations') {
        if (isScreenSharing) clearStrokes()
      } else if (action === 'screenShare') {
        if (isCallActive) toggleScreenShare()
      }
    })
    return off
  }, [
    isCallActive,
    isConnecting,
    isScreenSharing,
    startCall,
    endCall,
    toggleMute,
    toggleDrawMode,
    clearStrokes,
    toggleScreenShare,
  ])

  function startWindowBoundsPolling(windowId: number) {
    if (windowBoundsPollRef.current) {
      clearInterval(windowBoundsPollRef.current)
    }
    const refresh = async () => {
      const display = overlayDisplayBoundsRef.current
      if (!display) return
      const bounds = await window.electronAPI.screen.getWindowBounds(windowId)
      const winBounds: WindowBounds | null = bounds
        ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
        : null
      sourceContextRef.current = {
        kind: 'window',
        displayBounds: display,
        windowBounds: winBounds,
      }
    }
    void refresh()
    windowBoundsPollRef.current = setInterval(() => void refresh(), 1000)
  }

  useEffect(() => {
    const offStrokes = window.electronAPI.drawOverlay.onStrokes(({ strokes, bounds }) => {
      overlayStrokesRef.current = strokes
      overlayDisplayBoundsRef.current = bounds
      setHasStrokes(strokes.length > 0)
      if (sourceContextRef.current?.kind === 'window') {
        sourceContextRef.current = {
          ...sourceContextRef.current,
          displayBounds: bounds,
        }
      } else {
        sourceContextRef.current = { kind: 'display', displayBounds: bounds }
      }
    })
    const offBounds = window.electronAPI.drawOverlay.onDisplayBounds((bounds) => {
      overlayDisplayBoundsRef.current = bounds
      if (sourceContextRef.current?.kind === 'window') {
        sourceContextRef.current = {
          ...sourceContextRef.current,
          displayBounds: bounds,
        }
      } else {
        sourceContextRef.current = { kind: 'display', displayBounds: bounds }
      }
    })
    const offMode = window.electronAPI.drawOverlay.onModeChanged((mode) => {
      setDrawMode(mode === 'draw')
    })
    return () => {
      offStrokes()
      offBounds()
      offMode()
    }
  }, [])

  // Clean up screen capture when call ends
  useEffect(() => {
    if (!isCallActive && isScreenSharing) {
      stopScreenShare()
    }
  }, [isCallActive, isScreenSharing, stopScreenShare])

  const screenShareDisabled = isConnecting || (!isScreenSharing && activeRealtimeModel.startsWith('grok-voice-'))
  const screenShareTitle = isScreenSharing
    ? 'Stop screen sharing'
    : activeRealtimeModel.startsWith('grok-voice-')
      ? 'Screen sharing is only available with Gemini Live. Grok Voice does not support video input.'
      : 'Share screen'

  const timelineItems = useMemo(
    () => buildTimeline(messages, toolCalls),
    [messages, toolCalls],
  )

  const ingestFiles = useCallback(async (files: File[] | FileList) => {
    const list = Array.from(files)
    if (list.length === 0) return
    if (attachDisabledReason) {
      setAttachmentError(attachDisabledReason)
      return
    }
    const accepted: PendingAttachment[] = []
    const errors: string[] = []
    for (const file of list) {
      const result = await fileToPendingAttachment(file)
      if (result.ok) accepted.push(result.pending)
      else errors.push(`${file.name || 'attachment'}: ${result.error}`)
    }
    if (accepted.length > 0) {
      setPendingAttachments((prev) => [...prev, ...accepted])
      setAttachmentError(null)
    }
    if (errors.length > 0) setAttachmentError(errors.join('  '))
  }, [attachDisabledReason])

  const handlePickImage = useCallback(async () => {
    const result = await pickImageAttachment()
    if (!result.ok) {
      if ('cancelled' in result) return
      setAttachmentError(result.error)
      return
    }
    const file = result.file
    const previewUrl = `data:${file.mime};base64,${file.base64}`
    setPendingAttachments((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        base64: file.base64,
        mime: file.mime,
        byteSize: file.byteSize,
        originalName: file.originalName,
        previewUrl,
      },
    ])
    setAttachmentError(null)
  }, [])

  const handleRemovePending = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const handleSendAttachments = useCallback(async () => {
    if (pendingAttachments.length === 0) return
    // Catches the case where attachments were queued (via picker, drop,
    // or paste) and the user then switched to a model that can't accept
    // them before clicking send.
    if (attachDisabledReason) {
      setAttachmentError(attachDisabledReason)
      setPendingAttachments([])
      return
    }
    // Route through the same submit path as text + attachments. Use a
    // short placeholder as the user "message" so the model has a prompt
    // to act on (without it the model often replies with "I don't see
    // anything"). The image data rides along as `images` on streamTextChat
    // or as sendFrame() during an active call.
    await handleComposerSubmit(describePlaceholder(pendingAttachments))
  }, [pendingAttachments, attachDisabledReason, handleComposerSubmit])

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!hasFilePayload(e)) return
    e.preventDefault()
    dragDepthRef.current += 1
    setIsDraggingFile(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!hasFilePayload(e)) return
    e.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDraggingFile(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!hasFilePayload(e)) return
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!hasFilePayload(e)) return
      e.preventDefault()
      dragDepthRef.current = 0
      setIsDraggingFile(false)
      if (e.dataTransfer.files.length === 0) return
      void ingestFiles(e.dataTransfer.files)
    },
    [ingestFiles],
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
      if (files.length === 0) return
      e.preventDefault()
      void ingestFiles(files)
    },
    [ingestFiles],
  )

  // Keyboard shortcuts: Cmd+N (new), Cmd+M (mute), Cmd+E (end call)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return

      switch (e.key) {
        case 'n':
          e.preventDefault()
          newConversation()
          break
        case 'm':
          if (isCallActive) {
            e.preventDefault()
            toggleMute()
          }
          break
        case 'e':
          if (isCallActive) {
            e.preventDefault()
            endCall()
          }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isCallActive, newConversation, toggleMute, endCall])

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <AdapterErrorBanner
        error={adapterError}
        onDismiss={() => setAdapterError(null)}
        onNavigateToSettings={onNavigateToSettings}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/65 backdrop-blur">
        <div className="text-sm text-muted-foreground">
          {messages.length > 0
            ? `${messages.length} messages`
            : 'Start a conversation'}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={newConversation}>
            <Plus size={16} className="mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isCallActive && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <div className="mb-5 flex size-16 items-center justify-center rounded-md border border-border bg-card text-foreground vc-panel-shadow">
              <VoiceClawMark className="size-10" accent />
            </div>
            <p className="vc-font-serif text-2xl leading-none text-foreground">VoiceClaw Desktop</p>
            <p className="mt-3 max-w-sm text-sm leading-6">
              Start a call to speak with your agent through the precise voice layer.
            </p>
          </div>
        )}
        {timelineItems.map((item) => {
          if (item.kind === 'separator') {
            return (
              <MessageGroupSeparator
                key={`sep-${item.timestamp}-${item.label}`}
                label={item.label}
              />
            )
          }
          if (item.kind === 'tool') {
            return <ToolCallRow key={`tool-${item.data.callId}`} entry={item.data} />
          }
          return (
            <MessageBubble
              key={`msg-${item.data.id}`}
              message={item.data}
              attachments={attachmentsByMessage.get(item.data.id) ?? []}
              showLatency={showLatency}
              showTimestamp={showTimes}
              isLastInBurst={item.isLastInBurst}
              typed={typedMessageIds.has(item.data.id)}
              onContextMenu={handleMessageContextMenu}
            />
          )
        })}
        {/* Streaming text */}
        {streamingText.trim() && (
          <div className={`flex ${streamingRole === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
            <div
              className={`
                max-w-[80%] rounded-md px-4 py-2.5 text-sm leading-relaxed
                ${streamingRole === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground border border-border'
                }
              `}
            >
              <span className="whitespace-pre-wrap">{streamingText}</span>
              <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
            </div>
          </div>
        )}
        {/* Thinking indicator */}
        {isThinking && !streamingText.trim() && (
          <div className="flex justify-start mb-3">
            <div className="rounded-md border border-border bg-card px-4 py-2.5">
              <ThinkingDots />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context usage debug strip */}
      {showContextUsage && isCallActive && usage && (
        <div className="px-4 py-1 text-[11px] text-muted-foreground font-mono flex items-center justify-between border-t border-border">
          <span>
            context: {formatTokens(usage.promptTokens)} /{' '}
            {formatTokens(getContextWindowFor(activeRealtimeModel))}
            {' '}
            ({formatPercent(usage.promptTokens, getContextWindowFor(activeRealtimeModel))})
          </span>
          <span className="text-muted-foreground/70">
            audio in {formatTokens(usage.inputAudioTokens)} · out {formatTokens(usage.outputAudioTokens)}
          </span>
        </div>
      )}

      {/* Screen sharing indicator */}
      {isScreenSharing && (
        <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-[var(--brand-sage)]">
          <Monitor size={14} />
          <span className="truncate">Sharing: {screenSourceName}</span>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={toggleDrawMode}
              className={`transition-colors ${
                drawMode
                  ? 'text-[var(--brand-rust)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={drawMode ? 'Stop drawing' : 'Draw on screen'}
            >
              {drawMode ? 'Drawing' : 'Draw'}
            </button>
            <button
              type="button"
              onClick={clearStrokes}
              disabled={!hasStrokes}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear strokes"
            >
              Clear
            </button>
            <button
              onClick={stopScreenShare}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Audio level meter */}
      {isCallActive && (
        <div className="px-4">
          <AudioLevelMeter getLevel={realtime.getInputLevel} active={isCallActive && !isMuted} />
        </div>
      )}

      {/* Connection error */}
      {connectionError && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-md bg-destructive/10 text-destructive text-sm text-center">
          {connectionError}
        </div>
      )}

      {/* Attachment validation error */}
      {attachmentError && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-md bg-destructive/10 text-destructive text-sm text-center flex items-start justify-between gap-2">
          <span className="flex-1 text-left">{attachmentError}</span>
          <button
            type="button"
            onClick={() => setAttachmentError(null)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Dismiss attachment error"
          >
            <Plus size={14} className="rotate-45" />
          </button>
        </div>
      )}

      {/* Pending attachments tray */}
      <AttachmentTray
        pending={pendingAttachments}
        onRemove={handleRemovePending}
        onSend={handleSendAttachments}
        sending={sendingAttachments}
      />

      {/* Typed text composer — always visible, works in and out of call */}
      <ChatComposer
        onSubmit={handleComposerSubmit}
        onAttach={handlePickImage}
        attachDisabledReason={attachDisabledReason}
      />

      {/* Call controls */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-3">
        {!isCallActive && !isConnecting ? (
          <Button
            onClick={startCall}
            className="px-6"
          >
            <Phone size={18} className="mr-2" />
            Start Call
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className={isMuted ? 'text-destructive' : 'text-foreground'}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>
            <span title={screenShareTitle} className="inline-flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={isScreenSharing ? stopScreenShare : () => setShowScreenPicker(true)}
                className={isScreenSharing ? 'text-[var(--brand-sage)]' : screenShareDisabled ? 'text-muted-foreground opacity-50' : 'text-foreground'}
                disabled={screenShareDisabled}
              >
                {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
              </Button>
            </span>
            <VolumeControl
              volume={outputGain}
              muted={outputMuted}
              onVolumeChange={handleOutputGainChange}
              onMutedChange={handleOutputMutedChange}
            />

            <Button
              variant="destructive"
              size="icon"
              onClick={endCall}
              disabled={isConnecting}
            >
              <PhoneOff size={20} />
            </Button>
            {isConnecting && (
              <span className="text-sm text-muted-foreground animate-pulse">Connecting...</span>
            )}
            {realtime.isReconnecting && (
              <span className="text-sm text-[var(--brand-sage)] animate-pulse">Reconnecting...</span>
            )}
          </>
        )}
      </div>

      {/* Screen share picker modal */}
      {showScreenPicker && (
        <ScreenSharePicker
          onSelect={startScreenShare}
          onCancel={() => setShowScreenPicker(false)}
        />
      )}

      {messageMenu && (
        <MessageContextMenu
          x={messageMenu.x}
          y={messageMenu.y}
          onClose={closeMessageMenu}
          items={buildMessageMenuItems(
            messageMenu.message,
            showTimes,
            handleCopyMessage,
            handleDeleteMessage,
            handleToggleShowTimes,
          )}
        />
      )}

      {isDraggingFile && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-md">
          <div className="text-center">
            <ImagePlus size={36} className="mx-auto text-primary mb-3" />
            <p className="text-base font-medium text-foreground">Drop image to attach</p>
            <p className="text-xs text-muted-foreground mt-1">PNG · JPG · WEBP · up to 10MB</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TimelineItem =
  | { kind: 'message'; ts: number; data: Message; isFirstInBurst: boolean; isLastInBurst: boolean }
  | { kind: 'tool'; ts: number; data: ToolCallEntry }
  | { kind: 'separator'; ts: number; timestamp: number; label: string }

function buildMessageMenuItems(
  message: Message,
  showTimes: boolean,
  onCopy: (m: Message) => void,
  onDelete: (m: Message) => void,
  onToggleShowTimes: () => void,
): MessageContextMenuItem[] {
  return [
    {
      label: 'Copy',
      icon: <Copy size={14} />,
      onSelect: () => onCopy(message),
    },
    {
      label: showTimes ? 'Hide times' : 'Show times',
      icon: <Clock size={14} />,
      onSelect: onToggleShowTimes,
    },
    {
      label: 'Delete message',
      icon: <Trash2 size={14} />,
      destructive: true,
      onSelect: () => onDelete(message),
    },
  ]
}

function buildTimeline(messages: Message[], toolCalls: ToolCallEntry[]): TimelineItem[] {
  const grouped = groupMessages(messages)
  const messageMeta = new Map<number, { isFirstInBurst: boolean; isLastInBurst: boolean }>()
  const separators: TimelineItem[] = []

  for (const item of grouped) {
    if (item.kind === 'separator') {
      separators.push({
        kind: 'separator',
        ts: item.timestamp,
        timestamp: item.timestamp,
        label: item.label,
      })
    } else {
      messageMeta.set(item.message.id, {
        isFirstInBurst: item.isFirstInBurst,
        isLastInBurst: item.isLastInBurst,
      })
    }
  }

  const items: TimelineItem[] = [
    ...separators,
    ...messages.map((m) => {
      const meta = messageMeta.get(m.id) ?? { isFirstInBurst: true, isLastInBurst: true }
      return {
        kind: 'message' as const,
        ts: m.created_at,
        data: m,
        isFirstInBurst: meta.isFirstInBurst,
        isLastInBurst: meta.isLastInBurst,
      }
    }),
    ...toolCalls.map((t) => ({ kind: 'tool' as const, ts: t.startedAt, data: t })),
  ]

  items.sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts
    if (a.kind === 'separator' && b.kind !== 'separator') return -1
    if (b.kind === 'separator' && a.kind !== 'separator') return 1
    return 0
  })
  return items
}

function generateTitle(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= 50) return trimmed

  const truncated = trimmed.slice(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')
  const title = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated
  return title.trim() + '...'
}

function normalizeRealtimeModel(model: string | null): typeof REALTIME_MODELS[number] {
  return (REALTIME_MODELS as readonly string[]).includes(model ?? '')
    ? model as typeof REALTIME_MODELS[number]
    : DEFAULT_REALTIME_MODEL
}

function hasFilePayload(e: DragEvent<HTMLDivElement>): boolean {
  const types = e.dataTransfer?.types
  if (!types) return false
  for (const t of types) if (t === 'Files') return true
  return false
}

function describePlaceholder(pending: PendingAttachment[]): string {
  if (pending.length === 1) {
    const name = pending[0].originalName
    return name ? `Attached: ${name}` : 'Attached an image.'
  }
  return `Attached ${pending.length} images.`
}

async function defaultRelayUrl(): Promise<string> {
  // Bundled relay listens on a kernel-picked port when 8080 is taken;
  // the IPC tells us where it actually landed.
  try {
    const ports = await window.electronAPI?.app?.getServicePorts?.()
    const port = ports?.relay
    if (typeof port === 'number' && port > 0) return `ws://127.0.0.1:${port}/ws`
  } catch {
    // fall through
  }
  return 'ws://localhost:8080/ws'
}

// Mirrors relay-server/src/adapters/gemini.ts MODEL_CONTEXT_WINDOWS. Kept in
// sync manually — when Google bumps a model, update both. The renderer only
// needs entries for models the user can actually pick (set in REALTIME_MODELS).
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'gemini-3.1-flash-live-preview': 131_072,
  'gpt-realtime-2': 32_000,
  'gpt-realtime-mini': 32_000,
  'grok-voice-think-fast-1.0': 131_072,
}
const FALLBACK_CONTEXT_WINDOW = 131_072

function getContextWindowFor(model: string): number {
  return MODEL_CONTEXT_WINDOWS[model] ?? FALLBACK_CONTEXT_WINDOW
}

function formatTokens(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '?'
  if (n < 1000) return String(n)
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n / 1000)}k`
}

function formatPercent(used: number | undefined, limit: number): string {
  if (used == null || !Number.isFinite(used) || limit <= 0) return '?%'
  return `${Math.round((used / limit) * 100)}%`
}

function parseDisplayIdFromSourceId(sourceId: string): number | null {
  // chromeMediaSourceId for screens is "screen:<electronDisplayId>:0".
  const match = /^screen:(\d+):/.exec(sourceId)
  if (!match) return null
  const id = Number.parseInt(match[1], 10)
  return Number.isFinite(id) ? id : null
}

function parseWindowIdFromSourceId(sourceId: string): number | null {
  // chromeMediaSourceId for windows is "window:<CGWindowID>:<displayId>" on
  // macOS. We need the CGWindowID to look up live screen-rect via get-windows.
  const match = /^window:(\d+):/.exec(sourceId)
  if (!match) return null
  const id = Number.parseInt(match[1], 10)
  return Number.isFinite(id) ? id : null
}
