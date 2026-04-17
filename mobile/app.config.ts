import { ExpoConfig, ConfigContext } from 'expo/config'
import { execSync } from 'child_process'

type AppVariant = 'development' | 'staging' | 'production'

const APP_VARIANT = (process.env.APP_VARIANT as AppVariant) || 'production'

const VARIANT_CONFIG: Record<AppVariant, { displayName: string, bundleIdSuffix: string, scheme: string }> = {
  development: { displayName: 'VoiceClaw (Dev)', bundleIdSuffix: '.dev', scheme: 'voiceclaw-dev' },
  staging: { displayName: 'VoiceClaw (Stg)', bundleIdSuffix: '.staging', scheme: 'voiceclaw-staging' },
  production: { displayName: 'VoiceClaw', bundleIdSuffix: '', scheme: 'voiceclaw' },
}

const variant = VARIANT_CONFIG[APP_VARIANT]
const bundleId = `com.yagudaev.voiceclaw${variant.bundleIdSuffix}`
const buildNumber = execSync('git rev-list --count HEAD').toString().trim()

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'VoiceClaw',
  slug: 'voiceclaw',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: variant.scheme,
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F0B1E',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    buildNumber,
    infoPlist: {
      CFBundleDisplayName: variant.displayName,
      ITSAppUsesNonExemptEncryption: false,
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
    package: bundleId,
  },
  web: {
    bundler: 'metro',
    output: 'static' as const,
    favicon: './assets/images/favicon.png',
  },
  owner: 'yagudaev',
  extra: {
    appVariant: APP_VARIANT,
    eas: {
      projectId: '197182e2-21f9-4882-a82d-a78495b90699',
    },
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    ['./plugins/with-ios-icons', { variant: APP_VARIANT }],
    './plugins/with-ui-tests',
    './plugins/with-kokoro-swift',
    './plugins/with-broadcast-extension',
  ],
  experiments: {
    typedRoutes: true,
  },
})
