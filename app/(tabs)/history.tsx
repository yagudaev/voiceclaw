import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export default function HistoryScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-foreground text-xl">History</Text>
      <Text className="text-muted-foreground mt-2">Past conversations will appear here</Text>
    </View>
  );
}
