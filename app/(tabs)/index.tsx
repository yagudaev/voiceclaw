import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { addMessage, createConversation, getConversation, getLatestConversation, getMessages, getSetting, updateConversationVapi, type Message } from '@/db'
import { getApiConfig, streamCompletion } from '@/lib/chat'
import { compactMessages } from '@/lib/compact'
import { useConversationContext } from '@/lib/conversation-context'
import { maybeGenerateTitle } from '@/lib/title'
import { useCallSounds } from '@/lib/sounds'
import { useTranscriptBuffer } from '@/lib/use-transcript-buffer'
import { useAutoReconnect } from '@/lib/use-auto-reconnect'
import { sendVapiChat, syncMessagesToVapi } from '@/lib/vapi-chat'
import ExpoVapiModule from '@/modules/expo-vapi'
import type { FunctionCallEvent, SpeechEvent, TranscriptEvent } from '@/modules/expo-vapi'
import { Stack } from 'expo-router'
import { MicIcon, MicOffIcon, PhoneOffIcon, PlusIcon, RefreshCwIcon, SendIcon, XIcon } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'

const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g
const URL_IMAGE_REGEX = /(?:^|\s)(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?)/gi

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
  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    setMessages(await getMessages(conversationId))
  }, [conversationId])

  const handleTranscriptFlush = useCallback(async (role: 'user' | 'assistant', text: string) => {
    if (!conversationId) return
    if (__DEV__) console.log('[Chat] Transcript flush:', role, text.substring(0, 50))
    try {
      await addMessage(conversationId, role, text)
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
    try {
      await ExpoVapiModule.startCall(assistantId, overrides ?? undefined)
    } catch (e) {
      setIsConnecting(false)
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
        setIsCallActive(true)
        setIsConnecting(false)
        wasCallActiveRef.current = true
        cancelReconnect()
        soundsRef.current.playJoin()
      }),
      ExpoVapiModule.addListener('onCallEnd', async () => {
        console.log('[Chat] onCallEnd fired')
        const wasActive = wasCallActiveRef.current
        const wasUserInitiated = userInitiatedEndRef.current

        // Flush any in-progress transcript buffers before cleanup
        if (conversationId) {
          const pending = transcriptBufferRef.current.flushAll()
          for (const { role, text } of pending) {
            console.log('[Chat] Flushing buffered transcript on call end:', role, text.substring(0, 50))
            await addMessage(conversationId, role, text)
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
      }),
      ExpoVapiModule.addListener('onSpeechStart', (event: SpeechEvent) => {
        transcriptBufferRef.current.onSpeechStart(event.role)
        if (event.role === 'assistant') {
          setIsThinking(false)
          soundsRef.current.stopThinking()
        }
      }),
      ExpoVapiModule.addListener('onSpeechEnd', (event: SpeechEvent) => {
        transcriptBufferRef.current.onSpeechEnd(event.role)
        if (event.role === 'user') {
          setIsThinking(true)
          soundsRef.current.startThinking()
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

  const toggleCall = useCallback(async () => {
    if (isCallActive) {
      userInitiatedEndRef.current = true
      cancelReconnect()
      await ExpoVapiModule.stopCall()
      return
    }

    const assistantId = await getSetting('assistant_id')
    const ready = await ensureVapiReady()
    if (!assistantId || !ready) {
      await addMessage(conversationId!, 'assistant', 'Please configure your Vapi API key and Assistant ID in Settings first.')
      await loadMessages()
      return
    }

    const { apiKey, apiUrl, model } = await getApiConfig()
    const modelMessages: Array<{ role: string, content: string }> = [
      { role: 'system', content: VOICE_SYSTEM_PROMPT },
    ]

    if (conversationId) {
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

    try {
      setIsConnecting(true)
      await ExpoVapiModule.startCall(assistantId, callOverrides)
    } catch (e: any) {
      setIsConnecting(false)
      const errorMsg = e?.message || String(e)
      console.error('Failed to start call:', errorMsg)
      await addMessage(conversationId!, 'assistant', `Call failed: ${errorMsg}`)
      await loadMessages()
    }
  }, [isCallActive, ensureVapiReady, conversationId, loadMessages, cancelReconnect])

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted
    await ExpoVapiModule.setMuted(newMuted)
    setIsMuted(newMuted)
  }, [isMuted])

  const displayMessages = streamingText !== null
    ? [...messages, { id: -1, conversation_id: conversationId ?? 0, role: 'assistant' as const, content: streamingText, created_at: Date.now() }]
    : messages

  const { partials } = transcriptBuffer

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={startNewConversation} className="mr-2 p-2">
              <PlusIcon size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
        onContentSizeChange={() => {
          const animated = hasScrolledRef.current
          hasScrolledRef.current = true
          flatListRef.current?.scrollToEnd({ animated })
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-40">
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

      {isThinking && (
        <View className="flex-row items-center gap-2 px-4 py-2">
          <View className="flex-row items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
            <ActivityIndicator size="small" color="#888" />
            <Text className="text-sm text-muted-foreground">Thinking...</Text>
          </View>
        </View>
      )}

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
        <View className="flex-row items-center justify-center gap-4 border-t border-border bg-muted/50 px-4 py-3">
          <Button variant={isMuted ? 'destructive' : 'secondary'} size="icon" className="rounded-full" onPress={toggleMute}>
            <Icon as={isMuted ? MicOffIcon : MicIcon} size={20} className="text-foreground" />
          </Button>
          <Button variant="destructive" className="rounded-full px-6" onPress={toggleCall}>
            <Icon as={PhoneOffIcon} size={20} className="text-destructive-foreground" />
            <Text className="ml-2 text-destructive-foreground">End Call</Text>
          </Button>
        </View>
      )}

      <View className="flex-row items-center gap-2 border-t border-border px-4 py-3">
        {!isCallActive && (
          <Button variant="secondary" size="icon" className="rounded-full" onPress={toggleCall} disabled={isConnecting}>
            {isConnecting
              ? <ActivityIndicator size="small" color="#888" />
              : <Icon as={MicIcon} size={20} className="text-foreground" />}
          </Button>
        )}
        <Input
          className="flex-1"
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <Button size="icon" className="rounded-full" onPress={sendMessage} disabled={!inputText.trim()}>
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
  const parts = parseContent(message.content)

  return (
    <View className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
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
