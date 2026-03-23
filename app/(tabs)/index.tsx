import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { addMessage, createConversation, getMessages, getSetting, type Message } from '@/db'
import ExpoVapiModule from '@/modules/expo-vapi'
import type { TranscriptEvent } from '@/modules/expo-vapi'
import { MicIcon, MicOffIcon, PhoneOffIcon, PlusIcon, SendIcon } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native'

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <View className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-muted'
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
  const flatListRef = useRef<FlatList<Message>>(null)

  // Initialize Vapi lazily (called before starting a call)
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

  // Subscribe to Vapi events
  useEffect(() => {
    const subs = [
      ExpoVapiModule.addListener('onCallStart', () => {
        setIsCallActive(true)
      }),
      ExpoVapiModule.addListener('onCallEnd', () => {
        setIsCallActive(false)
        setIsMuted(false)
      }),
      ExpoVapiModule.addListener('onTranscript', async (event: TranscriptEvent) => {
        if (event.type === 'final' && conversationId) {
          await addMessage(conversationId, event.role, event.text)
          loadMessages()
        }
      }),
      ExpoVapiModule.addListener('onError', (event) => {
        console.error('[Vapi]', event.message)
      }),
    ]

    return () => subs.forEach((s) => s.remove())
  }, [conversationId])

  const startNewConversation = useCallback(async () => {
    const conv = await createConversation()
    setConversationId(conv.id)
    setMessages([])
  }, [])

  useEffect(() => {
    startNewConversation()
  }, [startNewConversation])

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    const msgs = await getMessages(conversationId)
    setMessages(msgs)
  }, [conversationId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !conversationId) return

    await addMessage(conversationId, 'user', inputText.trim())
    setInputText('')
    await loadMessages()

    // If Vapi is active, send via Vapi. Otherwise fake response.
    if (isCallActive && vapiReady) {
      try {
        await ExpoVapiModule.sendMessage(inputText.trim())
      } catch (e) {
        console.warn('Failed to send via Vapi:', e)
      }
    } else {
      setTimeout(async () => {
        await addMessage(
          conversationId,
          'assistant',
          'Voice integration is ready — configure your API key in Settings to start.'
        )
        await loadMessages()
      }, 1000)
    }
  }, [inputText, conversationId, loadMessages, isCallActive, vapiReady])

  const toggleCall = useCallback(async () => {
    if (isCallActive) {
      await ExpoVapiModule.stopCall()
    } else {
      const assistantId = await getSetting('assistant_id')
      const ready = await ensureVapiReady()
      if (!assistantId || !ready) {
        await addMessage(
          conversationId!,
          'assistant',
          'Please configure your Vapi API key and Assistant ID in Settings first.'
        )
        await loadMessages()
        return
      }
      const modelOverride = await getSetting('default_model')
      const overrides = modelOverride ? { model: { model: modelOverride } } : undefined
      try {
        await ExpoVapiModule.startCall(assistantId, overrides)
      } catch (e) {
        console.error('Failed to start call:', e)
      }
    }
  }, [isCallActive, ensureVapiReady, conversationId, loadMessages])

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted
    await ExpoVapiModule.setMuted(newMuted)
    setIsMuted(newMuted)
  }, [isMuted])

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-40">
            <Text className="text-lg text-muted-foreground">Start a conversation</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Type a message or tap the mic to speak
            </Text>
          </View>
        }
      />

      {/* Voice Controls */}
      {isCallActive && (
        <View className="flex-row items-center justify-center gap-4 border-t border-border bg-muted/50 px-4 py-3">
          <Button
            variant={isMuted ? 'destructive' : 'secondary'}
            size="icon"
            className="rounded-full"
            onPress={toggleMute}>
            <Icon as={isMuted ? MicOffIcon : MicIcon} size={20} className="text-foreground" />
          </Button>
          <Button variant="destructive" className="rounded-full px-6" onPress={toggleCall}>
            <Icon as={PhoneOffIcon} size={20} className="text-destructive-foreground" />
            <Text className="ml-2 text-destructive-foreground">End Call</Text>
          </Button>
        </View>
      )}

      {/* Input Bar */}
      <View className="flex-row items-center gap-2 border-t border-border px-4 py-3">
        <Button variant="ghost" size="icon" className="rounded-full" onPress={startNewConversation}>
          <Icon as={PlusIcon} size={20} className="text-foreground" />
        </Button>
        {!isCallActive && (
          <Button variant="secondary" size="icon" className="rounded-full" onPress={toggleCall}>
            <Icon as={MicIcon} size={20} className="text-foreground" />
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
        <Button
          size="icon"
          className="rounded-full"
          onPress={sendMessage}
          disabled={!inputText.trim()}>
          <Icon as={SendIcon} size={20} className="text-primary-foreground" />
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}
