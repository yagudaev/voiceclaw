import { ExpoConfig, ConfigContext } from 'expo/config'

const IS_DEV = process.env.APP_VARIANT === 'development'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'VoiceClaw (Dev)' : 'VoiceClaw',
  slug: 'voiceclaw',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: IS_DEV ? 'voiceclaw-dev' : 'voiceclaw',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F0B1E',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? 'com.yagudaev.voiceclaw.dev' : 'com.yagudaev.voiceclaw',
    infoPlist: {
      NSMicrophoneUsageDescription: 'VoiceClaw needs microphone access for voice calls with your AI assistant.',
      NSSpeechRecognitionUsageDescription: 'VoiceClaw uses speech recognition to transcribe your voice for the AI assistant.',
      UIBackgroundModes: ['audio', 'voip'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0F0B1E',
    },
    package: IS_DEV ? 'com.yagudaev.voiceclaw.dev' : 'com.yagudaev.voiceclaw',
  },
  web: {
    bundler: 'metro',
    output: 'static' as const,
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    './plugins/with-ios-icons',
    './plugins/with-ui-tests',
  ],
  experiments: {
    typedRoutes: true,
  },
})
