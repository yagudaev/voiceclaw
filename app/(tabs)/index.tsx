import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { addMessage, createConversation, getMessages, getSetting, type Message } from '@/db'
import { getApiConfig, streamCompletion } from '@/lib/chat'
import ExpoVapiModule from '@/modules/expo-vapi'
import type { SpeechEvent, TranscriptEvent } from '@/modules/expo-vapi'
import { Stack } from 'expo-router'
import { MicIcon, MicOffIcon, PhoneOffIcon, PlusIcon, SendIcon } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <View className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-muted'
          }`}>
        <Text className={`text-sm ${isUser ? 'text-primary-foreground' : 'text-foreground'}`}>
          {message.content}
        </Text>
      </View>
    </View>
  )
}

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
      ExpoVapiModule.addListener('onCallEnd', () => {
        setIsCallActive(false)
        setIsMuted(false)
        setIsThinking(false)
        setIsConnecting(false)
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
    const text = inputText.trim()
    setInputText('')

    await addMessage(conversationId, 'user', text)
    await loadMessages()

    if (isCallActive && vapiReady) {
      try { await ExpoVapiModule.sendMessage(text) }
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

    streamCompletion(allMessages, apiKey, model, apiUrl, {
      onToken: (text) => {
        setIsThinking(false)
        setStreamingText(text)
      },
      onDone: async (text) => {
        setStreamingText(null)
        await addMessage(conversationId, 'assistant', text || 'No response received.')
        await loadMessages()
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

    const overrides: Record<string, unknown> = {}
    if (conversationId) {
      const prevMessages = await getMessages(conversationId)
      if (prevMessages.length > 0) {
        const { apiUrl, model } = await getApiConfig()
        const history = prevMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')
        overrides.firstMessage = 'Welcome back :)'
        overrides.model = {
          url: apiUrl,
          provider: 'custom-llm',
          model,
          messages: [{ role: 'system', content: `Previous conversation context:\n${history}\n\nContinue the conversation naturally from where we left off.` }],
        }
      }
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
