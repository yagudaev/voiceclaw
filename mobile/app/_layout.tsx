import '@/global.css'

import { runMigrations } from '@/db/migrations'
import { ConversationProvider } from '@/lib/conversation-context'
import { BRAND } from '@/lib/brand'
import { NAV_THEME } from '@/lib/theme'
import { ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { colorScheme } = useColorScheme()
  const [dbReady, setDbReady] = useState(false)
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light

  useEffect(() => {
    runMigrations()
      .then(() => setDbReady(true))
      .then(() => SplashScreen.hideAsync())
      .catch(console.error)
  }, [])

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.paper).catch(console.error)
  }, [palette.paper])

  if (!dbReady) {
    return <View className="flex-1 bg-background" />
  }

  return (
    <ConversationProvider>
      <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </ConversationProvider>
  )
}
