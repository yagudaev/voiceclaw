import { BRAND } from '@/lib/brand'
import { Tabs } from 'expo-router'
import { HistoryIcon, MessageCircleIcon, SettingsIcon } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'

export default function TabLayout() {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const palette = isDark ? BRAND.colors.dark : BRAND.colors.light

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.panel,
          borderTopColor: palette.lineStrong,
        },
        headerStyle: {
          backgroundColor: palette.panel,
        },
        headerTintColor: palette.ink,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircleIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <HistoryIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
