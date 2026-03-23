import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-foreground text-xl">Settings</Text>
      <Text className="text-muted-foreground mt-2">API keys and configuration</Text>
    </View>
  );
}
