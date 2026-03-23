import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export default function ChatScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-foreground text-xl">Chat</Text>
      <Text className="text-muted-foreground mt-2">Voice chat will go here</Text>
    </View>
  );
}
