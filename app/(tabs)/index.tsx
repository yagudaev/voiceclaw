import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { addMessage, createConversation, getConversation, getMessages, getSetting, updateConversationVapi, type Message } from '@/db'
import { getApiConfig, streamCompletion } from '@/lib/chat'
import { sendVapiChat, syncMessagesToVapi } from '@/lib/vapi-chat'
import ExpoVapiModule from '@/modules/expo-vapi'
import type { SpeechEvent, TranscriptEvent } from '@/modules/expo-vapi'
import { Stack } from 'expo-router'
import { MicIcon, MicOffIcon, PhoneOffIcon, PlusIcon, SendIcon } from 'lucide-react-native'
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
but never speak the URL aloud — just describe what you created or found.`

type ContentPart = { type: 'text', text: string } | { type: 'image', url: string, alt: string }

export default function ChatScreen() {
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
        setIsCallActive(true)
        setIsConnecting(false)
      }),
      ExpoVapiModule.addListener('onCallEnd', async () => {
        setIsCallActive(false)
        setIsMuted(false)
        setIsThinking(false)
        setIsConnecting(false)
        if (conversationId) {
          syncConversationToVapi(conversationId)
        }
      }),
      ExpoVapiModule.addListener('onTranscript', async (event: TranscriptEvent) => {
        if (event.type === 'final' && conversationId) {
          await addMessage(conversationId, event.role, event.text)
          loadMessages()
        }
      }),
      ExpoVapiModule.addListener('onSpeechStart', (event: SpeechEvent) => {
        if (event.role === 'assistant') setIsThinking(false)
      }),
      ExpoVapiModule.addListener('onSpeechEnd', (event: SpeechEvent) => {
        if (event.role === 'user') setIsThinking(true)
      }),
      ExpoVapiModule.addListener('onError', async (event) => {
        console.error('[Vapi]', event.message)
        setIsThinking(false)
        if (conversationId) {
          await addMessage(conversationId, 'assistant', `Error: ${event.message}`)
          loadMessages()
        }
      }),
    ]
    return () => subs.forEach((s) => s.remove())
  }, [conversationId])

  const startNewConversation = useCallback(async () => {
    const conv = await createConversation()
    setConversationId(conv.id)
    setMessages([])
  }, [])

  useEffect(() => { startNewConversation() }, [startNewConversation])

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    setMessages(await getMessages(conversationId))
  }, [conversationId])

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
    const allMessages = (await getMessages(conversationId)).map((m) => ({ role: m.role, content: m.content }))

    const systemPrompt = (await getSetting('system_prompt')) || ''
    streamCompletion(allMessages, apiKey, model, apiUrl, systemPrompt, {
      onToken: (text) => {
        setIsThinking(false)
        setStreamingText(text)
      },
      onDone: async (text) => {
        setStreamingText(null)
        await addMessage(conversationId, 'assistant', text || 'No response received.')
        await loadMessages()
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

    const { apiUrl, model } = await getApiConfig()
    const modelMessages: Array<{ role: string, content: string }> = [
      { role: 'system', content: VOICE_SYSTEM_PROMPT },
    ]

    if (conversationId) {
      const prevMessages = await getMessages(conversationId)
      if (prevMessages.length > 0) {
        const history = prevMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')
        modelMessages.push({
          role: 'system',
          content: `Previous conversation context:\n${history}\n\nContinue the conversation naturally from where we left off.`,
        })
      }
    }

    const overrides: Record<string, unknown> = {
      server: { timeoutSeconds: 45 },
      silenceTimeoutSeconds: 120,
      endCallPhrases: [],
      firstMessage: modelMessages.length > 1 ? 'Welcome back :)' : undefined,
      model: {
        url: apiUrl,
        provider: 'custom-llm',
        model,
        messages: modelMessages,
      },
    }

    try {
      setIsConnecting(true)
      await ExpoVapiModule.startCall(assistantId, Object.keys(overrides).length > 0 ? overrides : undefined)
    } catch (e: any) {
      setIsConnecting(false)
      const errorMsg = e?.message || String(e)
      console.error('Failed to start call:', errorMsg)
      await addMessage(conversationId!, 'assistant', `Call failed: ${errorMsg}`)
      await loadMessages()
    }
  }, [isCallActive, ensureVapiReady, conversationId, loadMessages])

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted
    await ExpoVapiModule.setMuted(newMuted)
    setIsMuted(newMuted)
  }, [isMuted])

  const displayMessages = streamingText !== null
    ? [...messages, { id: -1, conversation_id: conversationId ?? 0, role: 'assistant' as const, content: streamingText, created_at: Date.now() }]
    : messages

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={startNewConversation} className="mr-2 p-2">
              <PlusIcon size={22} color="#fff" />
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
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-40">
            <Text className="text-lg text-muted-foreground">Start a conversation</Text>
            <Text className="mt-1 text-sm text-muted-foreground">Type a message or tap the mic to speak</Text>
          </View>
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
