import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Plus, Phone, Monitor, MonitorOff } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { MessageBubble } from '../components/MessageBubble'
import { ThinkingDots } from '../components/ThinkingDots'
import { AudioLevelMeter } from '../components/AudioLevelMeter'
import { VoiceClawMark } from '../components/brand/VoiceClawMark'
import { ScreenSharePicker } from '../components/ScreenSharePicker'
import { VolumeControl } from '../components/VolumeControl'
import { ScreenCapture, type ScreenSource } from '../lib/screen-capture'
import { useRealtime, type RealtimeCallbacks } from '../lib/use-realtime'
import { useConversationContext } from '../lib/conversation-context'
import {
  addMessage,
  createConversation,
  getLatestConversation,
  getMessages,
  getSetting,
  setSetting,
  updateConversationTitle,
  type Message,
} from '../lib/db'

const DEFAULT_REALTIME_MODEL = 'gemini-3.1-flash-live-preview'
const REALTIME_MODELS = ['gemini-3.1-flash-live-preview', 'grok-voice-think-fast-1.0'] as const
const GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'] as const
const XAI_VOICES = ['eve', 'ara', 'rex', 'sal', 'leo'] as const

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const conversationIdRef = useRef<number | null>(null)
  const titleGeneratedRef = useRef(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [outputVolume, setOutputVolume] = useState(1)
  const [outputMuted, setOutputMuted] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamingRole, setStreamingRole] = useState<'user' | 'assistant'>('assistant')
  // Synchronously-readable mirror of streamingRole. Event callbacks must
  // decide reset-vs-append without a setState updater — StrictMode invokes
  // updaters twice in dev, so any side effect inside one runs twice.
  const streamingRoleRef = useRef<'user' | 'assistant'>('assistant')
  const [showLatency, setShowLatency] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [activeRealtimeModel, setActiveRealtimeModel] = useState('')
  const [showScreenPicker, setShowScreenPicker] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenSourceName, setScreenSourceName] = useState('')
  const screenCaptureRef = useRef<ScreenCapture | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { selectedConversationId, selectConversation } = useConversationContext()

  // Reload messages from DB — single source of truth, prevents duplicates.
  // Uses conversationIdRef so callbacks always see the latest ID.
  const loadMessages = useCallback(async () => {
    const convId = conversationIdRef.current
    if (!convId) return
    const msgs = await getMessages(convId)
    setMessages(msgs)
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText, isThinking])

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
    getSetting('realtime_volume').then((v) => {
      const parsed = parseFloat(v ?? '')
      if (!Number.isNaN(parsed)) setOutputVolume(Math.max(0, Math.min(1, parsed)))
    })
  }, [])

  const loadLatestConversation = async () => {
    const conv = await getLatestConversation()
    if (conv) {
      conversationIdRef.current = conv.id
      setConversationId(conv.id)
      const msgs = await getMessages(conv.id)
      setMessages(msgs)
      titleGeneratedRef.current = msgs.length > 0
    }
  }

  const loadConversation = async (id: number) => {
    conversationIdRef.current = id
    setConversationId(id)
    const msgs = await getMessages(id)
    setMessages(msgs)
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
      // Read the current role from the ref so reset-vs-append stays out of
      // a setState updater. StrictMode double-invokes updaters in dev, so
      // any side effect (setStreamingText) inside one would fire twice.
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
    onToolCall: async (_callId, name, args) => {
      // Handle displayText tool call locally
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
    onToolProgress: (_callId, summary) => {
      streamingRoleRef.current = 'assistant'
      setStreamingRole('assistant')
      setStreamingText(summary)
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
    onError: (message) => {
      console.error('[ChatPage] Relay error:', message)
      setConnectionError(message)
      setIsConnecting(false)
      setIsCallActive(false)
      realtimeRef.current?.stop()
    },
  }

  const realtime = useRealtime(realtimeCallbacks)
  const realtimeRef = useRef(realtime)
  realtimeRef.current = realtime

  useEffect(() => {
    realtime.setOutputVolume(outputVolume)
  }, [outputVolume, realtime])

  useEffect(() => {
    realtime.setOutputMuted(outputMuted)
  }, [outputMuted, realtime])

  const startCall = useCallback(async () => {
    setConnectionError('')
    setIsConnecting(true)
    const serverUrl = (await getSetting('realtime_server_url')) || 'ws://localhost:8080/ws'
    const model = normalizeRealtimeModel(await getSetting('realtime_model'))
    const voice = normalizeRealtimeVoice(model, await getSetting('realtime_voice'))
    const apiKey = (await getSetting('realtime_api_key')) || ''
    // Tavily key is only forwarded when the user hasn't explicitly disabled
    // web_search. The setting is undefined on first run, which we treat as
    // enabled — only the literal 'false' string disables.
    const tavilyEnabled = (await getSetting('tavily_enabled')) !== 'false'
    const tavilyApiKey = tavilyEnabled
      ? ((await getSetting('tavily_api_key')) || undefined)
      : undefined
    const volume = outputVolume
    const tracingEnabled = (await getSetting('tracing_enabled')) === 'true'
    const inputDeviceId = (await getSetting('input_device_id')) || undefined
    const outputDeviceId = (await getSetting('output_device_id')) || undefined

    const convId = conversationIdRef.current
    const conversationHistory = convId
      ? (await getMessages(convId))
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-200)
          .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content }))
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
  }, [realtime, outputVolume])

  const endCall = useCallback(() => {
    realtime.stop()
    setIsCallActive(false)
    setIsConnecting(false)
    setIsThinking(false)
    setStreamingText('')
    setIsMuted(false)
    setActiveRealtimeModel('')
  }, [realtime])

  const toggleMute = useCallback(() => {
    const next = !isMuted
    setIsMuted(next)
    realtime.setMuted(next)
  }, [isMuted, realtime])

  const handleOutputVolumeChange = useCallback((next: number) => {
    setOutputVolume(next)
    setSetting('realtime_volume', next.toString()).catch(() => {})
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

  const newConversation = useCallback(() => {
    if (isCallActive) endCall()
    conversationIdRef.current = null
    setConversationId(null)
    setMessages([])
    titleGeneratedRef.current = false
  }, [isCallActive, endCall])

  const startScreenShare = useCallback(async (source: ScreenSource) => {
    if (activeRealtimeModel.startsWith('grok-voice-')) return
    setShowScreenPicker(false)
    const capture = new ScreenCapture()
    capture.setSourceName(source.name)
    screenCaptureRef.current = capture
    try {
      await capture.start(source.id, (base64Jpeg) => {
        realtime.sendFrame(base64Jpeg)
      })
      setIsScreenSharing(true)
      setScreenSourceName(source.name)
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/65 backdrop-blur">
        <div className="text-sm text-muted-foreground">
          {messages.length > 0
            ? `${messages.length} messages`
            : 'Start a conversation'}
        </div>
        <Button variant="ghost" size="sm" onClick={newConversation}>
          <Plus size={16} className="mr-1" />
          New
        </Button>
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
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} showLatency={showLatency} />
        ))}
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

      {/* Screen sharing indicator */}
      {isScreenSharing && (
        <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-[var(--brand-sage)]">
          <Monitor size={14} />
          <span className="truncate">Sharing: {screenSourceName}</span>
          <button
            onClick={stopScreenShare}
            className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
          >
            Stop
          </button>
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
              volume={outputVolume}
              muted={outputMuted}
              onVolumeChange={handleOutputVolumeChange}
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function normalizeRealtimeVoice(model: typeof REALTIME_MODELS[number], voice: string | null): string {
  if (model.startsWith('grok-voice-')) {
    return voice && (XAI_VOICES as readonly string[]).includes(voice) ? voice : 'eve'
  }

  return voice && (GEMINI_VOICES as readonly string[]).includes(voice) ? voice : 'Zephyr'
}
