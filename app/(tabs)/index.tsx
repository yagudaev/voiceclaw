import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { addMessage, createConversation, getMessages, type Message } from '@/db';
import { MicIcon, MicOffIcon, PhoneOffIcon, PlusIcon, SendIcon } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

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
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  const startNewConversation = useCallback(async () => {
    const conv = await createConversation();
    setConversationId(conv.id);
    setMessages([]);
  }, []);

  // Start a new conversation on mount
  useEffect(() => {
    startNewConversation();
  }, [startNewConversation]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const msgs = await getMessages(conversationId);
    setMessages(msgs);
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !conversationId) return;

    await addMessage(conversationId, 'user', inputText.trim());
    setInputText('');
    await loadMessages();

    // Fake assistant response (will be replaced by Vapi)
    setTimeout(async () => {
      await addMessage(
        conversationId,
        'assistant',
        'This is a placeholder response. Voice integration coming soon!',
      );
      await loadMessages();
    }, 1000);
  }, [inputText, conversationId, loadMessages]);

  const toggleCall = useCallback(() => {
    setIsCallActive((prev) => !prev);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

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
            <Text className="text-muted-foreground text-lg">Start a conversation</Text>
            <Text className="text-muted-foreground mt-1 text-sm">
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
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onPress={startNewConversation}>
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
  );
}
