import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Plus, Phone, Monitor, MonitorOff } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { MessageBubble } from '../components/MessageBubble'
import { ThinkingDots } from '../components/ThinkingDots'
import { AudioLevelMeter } from '../components/AudioLevelMeter'
import { ScreenSharePicker } from '../components/ScreenSharePicker'
import { ScreenCapture, type ScreenSource } from '../lib/screen-capture'
import { useRealtime, type RealtimeCallbacks } from '../lib/use-realtime'
import { useConversationContext } from '../lib/conversation-context'
import {
  addMessage,
  createConversation,
  getLatestConversation,
  getMessages,
  getSetting,
  type Message,
} from '../lib/db'

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamingRole, setStreamingRole] = useState<'user' | 'assistant'>('assistant')
  const [showLatency, setShowLatency] = useState(false)
  const [showScreenPicker, setShowScreenPicker] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenSourceName, setScreenSourceName] = useState('')
  const screenCaptureRef = useRef<ScreenCapture | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { selectedConversationId, selectConversation } = useConversationContext()

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
  }, [])

  const loadLatestConversation = async () => {
    const conv = await getLatestConversation()
    if (conv) {
      setConversationId(conv.id)
      const msgs = await getMessages(conv.id)
      setMessages(msgs)
    }
  }

  const loadConversation = async (id: number) => {
    setConversationId(id)
    const msgs = await getMessages(id)
    setMessages(msgs)
  }

  const ensureConversation = async (): Promise<number> => {
    if (conversationId) return conversationId
    const conv = await createConversation()
    setConversationId(conv.id)
    return conv.id
  }

  const realtimeCallbacks: RealtimeCallbacks = {
    onSessionReady: () => {
      setIsConnecting(false)
      setIsCallActive(true)
    },
    onTranscriptDelta: (text, role) => {
      setStreamingRole(role)
      setStreamingText((prev) => prev + text)
      if (role === 'assistant') setIsThinking(false)
    },
    onTranscriptDone: async (text, role) => {
      setStreamingText('')
      if (!text.trim()) return
      const convId = await ensureConversation()
      const msg = await addMessage(convId, role, text)
      setMessages((prev) => [...prev, msg])
    },
    onTurnStarted: () => {
      setIsThinking(false)
      setStreamingText('')
      setStreamingRole('user')
    },
    onTurnEnded: () => {
      setIsThinking(true)
    },
    onToolCall: async (callId, name, args) => {
      // Handle displayText tool call locally
      if (name === 'displayText') {
        try {
          const parsed = JSON.parse(args)
          const convId = await ensureConversation()
          const msg = await addMessage(convId, 'assistant', parsed.text)
          setMessages((prev) => [...prev, msg])
        } catch {
          // ignore parse errors
        }
      }
    },
    onToolProgress: (_callId, summary) => {
      setStreamingRole('assistant')
      setStreamingText(summary)
    },
    onSessionEnded: () => {
      setIsCallActive(false)
      setIsThinking(false)
      setStreamingText('')
    },
    onDisconnect: () => {
      setIsCallActive(false)
      setIsConnecting(false)
      setIsThinking(false)
      setStreamingText('')
    },
    onError: (message) => {
      console.error('[ChatPage] Relay error:', message)
      setIsConnecting(false)
    },
  }

  const realtime = useRealtime(realtimeCallbacks)

  const startCall = useCallback(async () => {
    setIsConnecting(true)
    const serverUrl = (await getSetting('realtime_server_url')) || 'ws://localhost:8080/ws'
    const voice = (await getSetting('realtime_voice')) || 'Zephyr'
    const model = (await getSetting('realtime_model')) || 'gemini-3.1-flash-live-preview'
    const apiKey = (await getSetting('realtime_api_key')) || ''
    const volume = parseFloat((await getSetting('realtime_volume')) || '1.0')
    const tracingEnabled = (await getSetting('tracing_enabled')) === 'true'
    const inputDeviceId = (await getSetting('input_device_id')) || undefined
    const outputDeviceId = (await getSetting('output_device_id')) || undefined

    realtime.start({
      serverUrl,
      voice,
      model,
      brainAgent: 'enabled',
      apiKey,
      volume,
      inputDeviceId,
      outputDeviceId,
      deviceContext: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        deviceModel: 'Desktop (Electron)',
      },
      tracingEnabled,
    })
  }, [realtime])

  const endCall = useCallback(() => {
    realtime.stop()
    setIsCallActive(false)
    setIsConnecting(false)
    setIsThinking(false)
    setStreamingText('')
    setIsMuted(false)
  }, [realtime])

  const toggleMute = useCallback(() => {
    const next = !isMuted
    setIsMuted(next)
    realtime.setMuted(next)
  }, [isMuted, realtime])

  const newConversation = useCallback(() => {
    if (isCallActive) endCall()
    setConversationId(null)
    setMessages([])
  }, [isCallActive, endCall])

  const startScreenShare = useCallback(async (source: ScreenSource) => {
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
  }, [realtime])

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
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-4xl mb-4">🎙</div>
            <p className="text-lg font-medium">VoiceClaw Desktop</p>
            <p className="text-sm mt-1">Press the call button to start a voice conversation</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} showLatency={showLatency} />
        ))}
        {/* Streaming text */}
        {streamingText && (
          <div className={`flex ${streamingRole === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
            <div
              className={`
                max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                ${streamingRole === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
                }
              `}
            >
              <span className="whitespace-pre-wrap">{streamingText}</span>
              <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
            </div>
          </div>
        )}
        {/* Thinking indicator */}
        {isThinking && !streamingText && (
          <div className="flex justify-start mb-3">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
              <ThinkingDots />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Screen sharing indicator */}
      {isScreenSharing && (
        <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-green-500">
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

      {/* Call controls */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-3">
        {!isCallActive && !isConnecting ? (
          <Button
            onClick={startCall}
            className="bg-green-600 hover:bg-green-700 text-white px-6"
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
            <Button
              variant="ghost"
              size="icon"
              onClick={isScreenSharing ? stopScreenShare : () => setShowScreenPicker(true)}
              className={isScreenSharing ? 'text-green-500' : 'text-foreground'}
              disabled={isConnecting}
            >
              {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            </Button>
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
