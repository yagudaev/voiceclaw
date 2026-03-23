import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { MicIcon, MicOffIcon, PhoneOffIcon, SendIcon } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const FAKE_MESSAGES: Message[] = [
  { id: '1', role: 'assistant', content: 'Hello! How can I help you today?', timestamp: new Date() },
  { id: '2', role: 'user', content: 'Tell me about voice AI assistants.', timestamp: new Date() },
  {
    id: '3',
    role: 'assistant',
    content:
      'Voice AI assistants use speech recognition and natural language processing to understand and respond to spoken commands. They can be powered by various LLMs and voice engines.',
    timestamp: new Date(),
  },
  { id: '4', role: 'user', content: 'Can you give me an example?', timestamp: new Date() },
  {
    id: '5',
    role: 'assistant',
    content:
      'Sure! Vapi is a platform that lets you build voice AI agents. You can configure different models, voices, and behaviors for your assistant.',
    timestamp: new Date(),
  },
];

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
  const [messages, setMessages] = useState<Message[]>(FAKE_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    // Fake assistant response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'This is a placeholder response. Voice integration coming soon!',
          timestamp: new Date(),
        },
      ]);
    }, 1000);
  }, [inputText]);

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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
        <Button size="icon" className="rounded-full" onPress={sendMessage} disabled={!inputText.trim()}>
          <Icon as={SendIcon} size={20} className="text-primary-foreground" />
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
