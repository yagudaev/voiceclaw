import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { getSetting, setSetting, getLatencyAverages, type LatencyAverages } from '@/db'
import { BRAND } from '@/lib/brand'
import type { BrainConnectionMode } from '@/lib/chat'
import { connectPlugin, disconnectPlugin, getPluginStatus, addPluginStatusListener, type PluginConnectionStatus } from '@/lib/plugin-completion'
import { runPipelineTests, type TestResult } from '@/lib/pipeline-test-runner'
import { isOptedOut as isMobileOptedOut, setMobileOptedOut } from '@/lib/telemetry'
import { useAutoSave, type SaveStatus } from '@/lib/use-auto-save'
import { validateApiKey, type Provider, type ValidationStatus } from '@/lib/validate-api-key'
import ExpoCustomPipelineModule from '@/modules/expo-custom-pipeline/src/ExpoCustomPipelineModule'
import { AlertCircleIcon, CheckIcon, EyeIcon, EyeOffIcon, PlayIcon, RefreshCwIcon, WifiIcon, WifiOffIcon } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native'
import Slider from '@react-native-community/slider'
import { useColorScheme } from 'nativewind'

type VoiceMode = 'vapi' | 'custom' | 'realtime'
type STTProviderValue = 'apple' | 'deepgram'
type TTSProviderValue = 'apple' | 'elevenlabs' | 'openai' | 'kokoro'

const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const

const XAI_VOICES = ['eve', 'ara', 'rex', 'sal', 'leo'] as const
const XAI_VOICE_LABELS: Record<typeof XAI_VOICES[number], string> = {
  eve: 'Eve (F)',
  ara: 'Ara (F)',
  rex: 'Rex (M)',
  sal: 'Sal (N)',
  leo: 'Leo (M)',
}

const GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'] as const
const GEMINI_VOICE_LABELS: Record<typeof GEMINI_VOICES[number], string> = {
  Puck: 'Puck (M)',
  Charon: 'Charon (M)',
  Kore: 'Kore (F)',
  Fenrir: 'Fenrir (M)',
  Aoede: 'Aoede (F)',
  Leda: 'Leda (F)',
  Orus: 'Orus (M)',
  Zephyr: 'Zephyr (F)',
}

type RealtimeModel = 'gemini-3.1-flash-live-preview' | 'grok-voice-think-fast-1.0'
const DEFAULT_REALTIME_MODEL: RealtimeModel = 'gemini-3.1-flash-live-preview'

export default function SettingsScreen() {
  const { colorScheme } = useColorScheme()
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light
  const stageColors = getStageColors(colorScheme)
  const [vapiPublicKey, setVapiPublicKey] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [defaultModel, setDefaultModel] = useState('openclaw:voice')
  const [brainApiKey, setBrainApiKey] = useState('')
  const [brainApiUrl, setBrainApiUrl] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant. Keep responses concise. Use markdown for formatting and images when appropriate. Your identity, personality, and capabilities are defined in your system files.')

  // Brain agent connection mode
  const [connectionMode, setConnectionMode] = useState<BrainConnectionMode>('http')
  const [gatewayUrl, setGatewayUrl] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [pluginStatus, setPluginStatus] = useState<PluginConnectionStatus>('disconnected')

  // Voice Pipeline state
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('realtime')
  const [sttProvider, setSttProvider] = useState<STTProviderValue>('apple')
  const [ttsProvider, setTtsProvider] = useState<TTSProviderValue>('apple')
  const [deepgramApiKey, setDeepgramApiKey] = useState('')
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('')
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState('Awx8TeMHHpDzbm42nIB6')
  const [openaiTtsApiKey, setOpenaiTtsApiKey] = useState('')
  const [openaiTtsVoice, setOpenaiTtsVoice] = useState<typeof OPENAI_TTS_VOICES[number]>('alloy')

  // Realtime mode settings
  const [realtimeServerUrl, setRealtimeServerUrl] = useState('ws://localhost:8080/ws')
  const [realtimeVoice, setRealtimeVoice] = useState<string>('Zephyr')
  const [realtimeApiKey, setRealtimeApiKey] = useState('')
  const [realtimeVolume, setRealtimeVolume] = useState(2.0)
  const [realtimeModel, setRealtimeModel] = useState<RealtimeModel>('gemini-3.1-flash-live-preview')
  const [realtimeTestStatus, setRealtimeTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [realtimeTestError, setRealtimeTestError] = useState('')

  // Debug mode
  const [debugMode, setDebugMode] = useState(false)

  // Echo gate settings
  const [echoGateEnabled, setEchoGateEnabled] = useState(true)
  const [echoGateThreshold, setEchoGateThreshold] = useState(0.06)

  // Show latency
  const [showLatency, setShowLatencyState] = useState(false)

  // Langfuse tracing — defaults on in dev builds, off in release
  const [tracingEnabled, setTracingEnabled] = useState<boolean>(__DEV__)

  // PostHog telemetry — opted-in by default, user can turn off
  const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(true)

  // Kokoro model download state
  const [kokoroStatus, setKokoroStatus] = useState<'checking' | 'ready' | 'not-downloaded' | 'downloading' | 'error' | 'unavailable'>('checking')

  // Pipeline test state
  const [testRunning, setTestRunning] = useState(false)
  const [testProgress, setTestProgress] = useState('')
  const [testResults, setTestResults] = useState<TestResult[]>([])

  // Latency stats state
  const [latencyStats, setLatencyStats] = useState<LatencyAverages | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // API key validation state
  const [validationStatus, setValidationStatus] = useState<Record<Provider, ValidationStatus>>({
    brain: 'idle',
    elevenlabs: 'idle',
    deepgram: 'idle',
    openai_tts: 'idle',
    vapi: 'idle',
  })
  const [validationErrors, setValidationErrors] = useState<Record<Provider, string | undefined>>({
    brain: undefined,
    elevenlabs: undefined,
    deepgram: undefined,
    openai_tts: undefined,
    vapi: undefined,
  })

  // Auto-save: guard against saving during initial load
  const loadedRef = useRef(false)
  const { saveStatus, saveImmediate, saveDebounced } = useAutoSave()

  const checkKokoroStatus = useCallback(() => {
    setKokoroStatus('checking')
    try {
      const available = ExpoCustomPipelineModule.isKokoroAvailable()
      if (!available) {
        setKokoroStatus('unavailable')
        return
      }
      const ready = ExpoCustomPipelineModule.isKokoroModelReady()
      setKokoroStatus(ready ? 'ready' : 'not-downloaded')
    } catch {
      setKokoroStatus('unavailable')
    }
  }, [])

  const downloadKokoroModel = useCallback(async () => {
    setKokoroStatus('downloading')
    try {
      await ExpoCustomPipelineModule.prepareKokoroModel()
      setKokoroStatus('ready')
    } catch (err) {
      console.warn('[Settings] Kokoro download failed:', err)
      setKokoroStatus('error')
    }
  }, [])

  useEffect(() => {
    if (ttsProvider === 'kokoro') checkKokoroStatus()
  }, [ttsProvider, checkKokoroStatus])

  const loadLatencyStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const stats = await getLatencyAverages()
      setLatencyStats(stats)
    } catch (err) {
      console.warn('[Settings] Failed to load latency stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => { loadLatencyStats() }, [loadLatencyStats])

  // Subscribe to plugin connection status updates
  useEffect(() => {
    setPluginStatus(getPluginStatus())
    const unsubscribe = addPluginStatusListener((status) => setPluginStatus(status))
    return unsubscribe
  }, [])

  useEffect(() => {
    ;(async () => {
      const key = (await getSetting('vapi_public_key')) || (await getSetting('vapi_api_key'))
      const assistant = await getSetting('assistant_id')
      const model = await getSetting('default_model')
      const ocKey = (await getSetting('brain_api_key')) || (await getSetting('openclaw_api_key'))
      const ocUrl = (await getSetting('brain_api_url')) || (await getSetting('openclaw_api_url'))
      if (key) setVapiPublicKey(key)
      if (assistant) setAssistantId(assistant)
      if (model) setDefaultModel(model)
      if (ocKey) setBrainApiKey(ocKey)
      if (ocUrl) setBrainApiUrl(ocUrl)
      const cm = (await getSetting('brain_connection_mode')) || (await getSetting('openclaw_connection_mode'))
      if (cm === 'http' || cm === 'plugin') setConnectionMode(cm)
      const gw = (await getSetting('brain_gateway_url')) || (await getSetting('openclaw_gateway_url'))
      if (gw) setGatewayUrl(gw)
      const at = (await getSetting('brain_auth_token')) || (await getSetting('openclaw_auth_token'))
      if (at) setAuthToken(at)
      const sp = await getSetting('system_prompt')
      if (sp) setSystemPrompt(sp)

      // Load voice pipeline settings
      const vm = await getSetting('voice_mode')
      if (vm !== 'realtime') {
        setVoiceMode('realtime')
        await setSetting('voice_mode', 'realtime')
      } else {
        setVoiceMode('realtime')
      }
      const rtUrl = await getSetting('realtime_server_url')
      if (rtUrl) setRealtimeServerUrl(rtUrl)
      const rtVoice = await getSetting('realtime_voice')
      const rtKey = await getSetting('realtime_api_key')
      if (rtKey) setRealtimeApiKey(rtKey)
      const rtVol = await getSetting('realtime_volume')
      if (rtVol) setRealtimeVolume(parseFloat(rtVol))
      const rtModel = await getSetting('realtime_model')
      const loadedRealtimeModel = normalizeRealtimeModel(rtModel)
      setRealtimeModel(loadedRealtimeModel)
      if (rtModel && rtModel !== loadedRealtimeModel) await setSetting('realtime_model', loadedRealtimeModel)
      const loadedRealtimeVoice = normalizeRealtimeVoice(loadedRealtimeModel, rtVoice)
      setRealtimeVoice(loadedRealtimeVoice)
      if (rtVoice !== loadedRealtimeVoice) await setSetting('realtime_voice', loadedRealtimeVoice)
      const stt = await getSetting('stt_provider')
      if (stt === 'apple' || stt === 'deepgram') setSttProvider(stt)
      const tts = await getSetting('tts_provider')
      if (tts === 'apple' || tts === 'elevenlabs' || tts === 'openai' || tts === 'kokoro') setTtsProvider(tts)
      const dgKey = await getSetting('deepgram_api_key')
      if (dgKey) setDeepgramApiKey(dgKey)
      const elKey = await getSetting('elevenlabs_api_key')
      if (elKey) setElevenlabsApiKey(elKey)
      const elVoice = await getSetting('elevenlabs_voice_id')
      if (elVoice) setElevenlabsVoiceId(elVoice)
      const oaiKey = await getSetting('openai_tts_api_key')
      if (oaiKey) setOpenaiTtsApiKey(oaiKey)
      const oaiVoice = await getSetting('openai_tts_voice')
      if (oaiVoice && (OPENAI_TTS_VOICES as readonly string[]).includes(oaiVoice)) {
        setOpenaiTtsVoice(oaiVoice as typeof OPENAI_TTS_VOICES[number])
      }
      const dm = await getSetting('debug_mode')
      if (dm === 'true') setDebugMode(true)
      const ege = await getSetting('echo_gate_enabled')
      if (ege === 'false') setEchoGateEnabled(false)
      const egt = await getSetting('echo_gate_threshold')
      if (egt) setEchoGateThreshold(parseFloat(egt))
      const sl = await getSetting('show_latency')
      if (sl === 'true') setShowLatencyState(true)
      const tr = await getSetting('tracing_enabled')
      if (tr === 'true') setTracingEnabled(true)
      else if (tr === 'false') setTracingEnabled(false)

      const optedOut = await isMobileOptedOut()
      setTelemetryEnabled(!optedOut)

      loadedRef.current = true
    })()
  }, [])

  // --- Validation helpers ---
  const resetValidation = useCallback((provider: Provider) => {
    setValidationStatus((prev) => ({ ...prev, [provider]: 'idle' }))
    setValidationErrors((prev) => ({ ...prev, [provider]: undefined }))
  }, [])

  const testApiKey = useCallback(async (provider: Provider, apiKey: string, apiUrl?: string) => {
    setValidationStatus((prev) => ({ ...prev, [provider]: 'testing' }))
    setValidationErrors((prev) => ({ ...prev, [provider]: undefined }))
    const result = await validateApiKey(provider, apiKey, apiUrl)
    setValidationStatus((prev) => ({ ...prev, [provider]: result.status }))
    if (result.error) {
      setValidationErrors((prev) => ({ ...prev, [provider]: result.error }))
    }
  }, [])

  // --- Auto-saving wrappers ---
  // Immediate save for toggles/dropdowns
  const updateSttProvider = useCallback((v: STTProviderValue) => {
    setSttProvider(v)
    if (loadedRef.current) saveImmediate('stt_provider', v)
  }, [saveImmediate])

  const updateTtsProvider = useCallback((v: TTSProviderValue) => {
    setTtsProvider(v)
    if (loadedRef.current) saveImmediate('tts_provider', v)
  }, [saveImmediate])

  const updateOpenaiTtsVoice = useCallback((v: typeof OPENAI_TTS_VOICES[number]) => {
    setOpenaiTtsVoice(v)
    if (loadedRef.current) saveImmediate('openai_tts_voice', v)
  }, [saveImmediate])

  const updateRealtimeServerUrl = useCallback((v: string) => {
    setRealtimeServerUrl(v)
    if (loadedRef.current) saveDebounced('realtime_server_url', v)
  }, [saveDebounced])

  const updateRealtimeVoice = useCallback((v: string) => {
    setRealtimeVoice(v)
    if (loadedRef.current) saveImmediate('realtime_voice', v)
  }, [saveImmediate])

  const updateRealtimeApiKey = useCallback((v: string) => {
    setRealtimeApiKey(v)
    if (loadedRef.current) saveDebounced('realtime_api_key', v)
  }, [saveDebounced])

  const updateRealtimeVolume = useCallback((v: number) => {
    setRealtimeVolume(v)
    if (loadedRef.current) saveImmediate('realtime_volume', String(v))
  }, [saveImmediate])

  const updateRealtimeModel = useCallback((v: RealtimeModel) => {
    setRealtimeModel(v)
    if (loadedRef.current) saveImmediate('realtime_model', v)
    // Reset voice to a sensible default when switching providers
    const isGemini = v.startsWith('gemini-')
    const currentIsGemini = realtimeVoice.charAt(0) === realtimeVoice.charAt(0).toUpperCase() && GEMINI_VOICES.includes(realtimeVoice as typeof GEMINI_VOICES[number])
    const isXAI = v.startsWith('grok-voice-')
    const currentIsXAI = XAI_VOICES.includes(realtimeVoice as typeof XAI_VOICES[number])
    if (isGemini && !currentIsGemini) {
      updateRealtimeVoice('Zephyr')
    } else if (isXAI && !currentIsXAI) {
      updateRealtimeVoice('eve')
    }
  }, [saveImmediate, realtimeVoice, updateRealtimeVoice])

  const testRealtimeConnection = useCallback(async () => {
    setRealtimeTestStatus('testing')
    setRealtimeTestError('')
    const wsUrl = realtimeServerUrl
    const result = await new Promise<{ ok: boolean; detail: string }>((resolve) => {
      try {
        const ws = new WebSocket(wsUrl)
        const timer = setTimeout(() => {
          try { ws.close() } catch {}
          resolve({ ok: false, detail: 'Timeout (8s) — no response from server' })
        }, 8000)
        ws.onopen = () => {
          clearTimeout(timer)
          try { ws.close() } catch {}
          resolve({ ok: true, detail: 'ok' })
        }
        ws.onerror = (e: Event & { message?: string }) => {
          clearTimeout(timer)
          resolve({ ok: false, detail: `WebSocket error: ${e?.message || 'connection refused or unreachable'}` })
        }
        ws.onclose = (e: CloseEvent) => {
          clearTimeout(timer)
          resolve({ ok: false, detail: `WebSocket closed before open (code=${e.code}${e.reason ? ` reason=${e.reason}` : ''})` })
        }
      } catch (e) {
        resolve({ ok: false, detail: `Threw: ${e instanceof Error ? e.message : String(e)}` })
      }
    })
    console.log('[relay-test] ws:', result)
    if (result.ok) {
      setRealtimeTestStatus('ok')
    } else {
      setRealtimeTestStatus('error')
      setRealtimeTestError(`${result.detail}\nurl=${wsUrl}`)
    }
  }, [realtimeServerUrl])

  // Debounced save for text inputs
  const updateVapiPublicKey = useCallback((v: string) => {
    setVapiPublicKey(v)
    resetValidation('vapi')
    if (loadedRef.current) saveDebounced('vapi_public_key', v)
  }, [saveDebounced, resetValidation])

  const updateAssistantId = useCallback((v: string) => {
    setAssistantId(v)
    if (loadedRef.current) saveDebounced('assistant_id', v)
  }, [saveDebounced])

  const updateDefaultModel = useCallback((v: string) => {
    setDefaultModel(v)
    if (loadedRef.current) saveDebounced('default_model', v)
  }, [saveDebounced])

  const updateBrainApiKey = useCallback((v: string) => {
    setBrainApiKey(v)
    resetValidation('brain')
    if (loadedRef.current) saveDebounced('brain_api_key', v)
  }, [saveDebounced, resetValidation])

  const updateBrainApiUrl = useCallback((v: string) => {
    setBrainApiUrl(v)
    resetValidation('brain')
    if (loadedRef.current) saveDebounced('brain_api_url', v)
  }, [saveDebounced, resetValidation])

  const updateConnectionMode = useCallback((v: BrainConnectionMode) => {
    setConnectionMode(v)
    if (loadedRef.current) saveImmediate('brain_connection_mode', v)
  }, [saveImmediate])

  const updateGatewayUrl = useCallback((v: string) => {
    setGatewayUrl(v)
    if (loadedRef.current) saveDebounced('brain_gateway_url', v)
  }, [saveDebounced])

  const updateAuthToken = useCallback((v: string) => {
    setAuthToken(v)
    if (loadedRef.current) saveDebounced('brain_auth_token', v)
  }, [saveDebounced])

  const updateSystemPrompt = useCallback((v: string) => {
    setSystemPrompt(v)
    if (loadedRef.current) saveDebounced('system_prompt', v)
  }, [saveDebounced])

  const updateDeepgramApiKey = useCallback((v: string) => {
    setDeepgramApiKey(v)
    resetValidation('deepgram')
    if (loadedRef.current) saveDebounced('deepgram_api_key', v)
  }, [saveDebounced, resetValidation])

  const updateElevenlabsApiKey = useCallback((v: string) => {
    setElevenlabsApiKey(v)
    resetValidation('elevenlabs')
    if (loadedRef.current) saveDebounced('elevenlabs_api_key', v)
  }, [saveDebounced, resetValidation])

  const updateElevenlabsVoiceId = useCallback((v: string) => {
    setElevenlabsVoiceId(v)
    if (loadedRef.current) saveDebounced('elevenlabs_voice_id', v)
  }, [saveDebounced])

  const updateOpenaiTtsApiKey = useCallback((v: string) => {
    setOpenaiTtsApiKey(v)
    resetValidation('openai_tts')
    if (loadedRef.current) saveDebounced('openai_tts_api_key', v)
  }, [saveDebounced, resetValidation])

  const toggleDebugMode = useCallback((v: boolean) => {
    setDebugMode(v)
    setSetting('debug_mode', v ? 'true' : 'false')
  }, [])

  const toggleEchoGate = useCallback((v: boolean) => {
    setEchoGateEnabled(v)
    setSetting('echo_gate_enabled', v ? 'true' : 'false')
  }, [])

  const updateEchoGateThreshold = useCallback((v: number) => {
    setEchoGateThreshold(v)
    setSetting('echo_gate_threshold', v.toFixed(4))
  }, [])

  const toggleShowLatency = useCallback((v: boolean) => {
    setShowLatencyState(v)
    setSetting('show_latency', v ? 'true' : 'false')
  }, [])

  const toggleTracing = useCallback((v: boolean) => {
    setTracingEnabled(v)
    setSetting('tracing_enabled', v ? 'true' : 'false')
  }, [])

  const toggleTelemetry = useCallback(async (v: boolean) => {
    setTelemetryEnabled(v)
    await setMobileOptedOut(!v)
  }, [])

  return (
    <KeyboardAvoidingView
      testID="settings-screen"
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <ScrollView testID="settings-scroll" contentContainerStyle={{ padding: 16, gap: 16 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <Card testID="voice-pipeline-card" className="gap-4 p-4">
          <View className="gap-1">
            <Text className="text-lg font-semibold text-foreground">Brain Gateway</Text>
            <Text className="text-xs text-muted-foreground">
              The brain gateway URL and key are the only setup VoiceClaw needs. Point this at your relay server (the one that talks to your brain agent) and the rest of the app will use it.
            </Text>
          </View>

          <>
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">Brain Gateway URL</Text>
                <Input
                  placeholder="ws://localhost:8080/ws"
                  value={realtimeServerUrl}
                  onChangeText={updateRealtimeServerUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">API Key</Text>
                <SecretInput
                  value={realtimeApiKey}
                  onChangeText={updateRealtimeApiKey}
                  placeholder="Enter your API key"
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">Model</Text>
                <OptionGroup
                  options={[
                    { label: 'Gemini 3.1 Flash Live', value: 'gemini-3.1-flash-live-preview' as const },
                    { label: 'Grok Voice Think Fast 1.0', value: 'grok-voice-think-fast-1.0' as const },
                  ]}
                  value={realtimeModel}
                  onChange={updateRealtimeModel}
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">Voice</Text>
                {realtimeModel.startsWith('gemini-') ? (
                  <OptionGroup
                    options={GEMINI_VOICES.map((v) => ({ label: GEMINI_VOICE_LABELS[v], value: v }))}
                    value={realtimeVoice}
                    onChange={updateRealtimeVoice}
                  />
                ) : (
                  <OptionGroup
                    options={XAI_VOICES.map((v) => ({ label: XAI_VOICE_LABELS[v], value: v }))}
                    value={realtimeVoice}
                    onChange={updateRealtimeVoice}
                  />
                )}
              </View>

              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">Speaker Volume: {realtimeVolume.toFixed(1)}x</Text>
                <Slider
                  minimumValue={0.5}
                  maximumValue={3.0}
                  step={0.1}
                  value={realtimeVolume}
                  onSlidingComplete={(v) => updateRealtimeVolume(Math.round(v * 10) / 10)}
                  minimumTrackTintColor={palette.accent}
                  maximumTrackTintColor={palette.lineStrong}
                />
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">Quiet</Text>
                  <Text className="text-xs text-muted-foreground">Max</Text>
                </View>
              </View>

              <View className="rounded-lg border border-input bg-background/50 p-3 dark:bg-input/20">
                <Text className="mb-1 text-xs font-medium text-muted-foreground">Setup</Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  1. Run your brain gateway (relay-server): cd relay-server && yarn dev{'\n'}
                  2. Paste the gateway URL shown on startup into "Brain Gateway URL"{'\n'}
                  3. Paste the matching API key
                </Text>
              </View>

              <View className={`flex-row items-center gap-2 rounded-lg border px-3 py-2 ${
                realtimeTestStatus === 'ok' ? 'border-brand-sage/30 bg-brand-sage/10'
                : realtimeTestStatus === 'error' ? 'border-destructive/50 bg-destructive/5'
                : 'border-input'
              }`}>
                {realtimeTestStatus === 'testing' ? (
                  <ActivityIndicator size="small" color={palette.muted} />
                ) : (
                  <Icon
                    as={realtimeTestStatus === 'ok' ? WifiIcon : WifiOffIcon}
                    size={16}
                    className={
                      realtimeTestStatus === 'ok' ? 'text-brand-sage'
                      : realtimeTestStatus === 'error' ? 'text-destructive'
                      : 'text-muted-foreground'
                    }
                  />
                )}
                <Text
                  className={`flex-1 text-sm ${
                    realtimeTestStatus === 'ok' ? 'text-brand-sage'
                    : realtimeTestStatus === 'error' ? 'text-destructive'
                    : 'text-muted-foreground'
                  }`}
                  numberOfLines={12}
                  selectable
                >
                  {realtimeTestStatus === 'ok' ? 'Connected'
                  : realtimeTestStatus === 'testing' ? 'Testing...'
                  : realtimeTestStatus === 'error' ? realtimeTestError
                  : 'Not tested'}
                </Text>
                <Pressable
                  onPress={testRealtimeConnection}
                  disabled={realtimeTestStatus === 'testing'}
                  className={`rounded-md px-3 py-1 ${realtimeTestStatus === 'testing' ? 'opacity-50' : ''} bg-primary/10`}
                >
                  <Text className="text-sm font-medium text-primary">Test</Text>
                </Pressable>
              </View>
          </>
        </Card>

        <Card testID="debug-mode-card" className="gap-2 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground">Debug Mode</Text>
              <Text className="text-sm text-muted-foreground">
                Show pipeline debug panel and event counters during calls
              </Text>
            </View>
            <Switch
              testID="debug-mode-toggle"
              value={debugMode}
              onValueChange={toggleDebugMode}
            />
          </View>

          {debugMode && (
            <View className="mt-2 gap-3 border-t border-border pt-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">Echo Gate</Text>
                  <Text className="text-xs text-muted-foreground">
                    Client-side RMS gate during playback — disable to let Gemini&apos;s server VAD handle interruption
                  </Text>
                </View>
                <Switch
                  testID="echo-gate-toggle"
                  value={echoGateEnabled}
                  onValueChange={toggleEchoGate}
                />
              </View>

              {echoGateEnabled && (
                <View className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-foreground">Gate Threshold</Text>
                    <Text className="text-xs tabular-nums text-muted-foreground">{echoGateThreshold.toFixed(3)}</Text>
                  </View>
                  <Slider
                    testID="echo-gate-threshold-slider"
                    minimumValue={0.01}
                    maximumValue={0.2}
                    step={0.005}
                    value={echoGateThreshold}
                    onSlidingComplete={updateEchoGateThreshold}
                    minimumTrackTintColor={palette.accent}
                    maximumTrackTintColor={palette.lineStrong}
                  />
                  <Text className="text-xs text-muted-foreground">
                    Lower = more sensitive to voice during playback. Default: 0.060
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        <Card testID="show-latency-card" className="gap-2 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground">Show Latency</Text>
              <Text className="text-sm text-muted-foreground">
                Display STT, LLM, and TTS latency badges on chat messages
              </Text>
            </View>
            <Switch
              testID="show-latency-toggle"
              value={showLatency}
              onValueChange={toggleShowLatency}
            />
          </View>
        </Card>

        <Card testID="tracing-card" className="gap-2 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground">Send Latency Traces</Text>
              <Text className="text-sm text-muted-foreground">
                Post per-turn latency measurements to the relay so they
                show up in Langfuse. Dev builds default on; release
                builds default off.
              </Text>
            </View>
            <Switch
              testID="tracing-toggle"
              value={tracingEnabled}
              onValueChange={toggleTracing}
            />
          </View>
        </Card>

        <Card testID="telemetry-card" className="gap-2 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground">Share Anonymous Diagnostics</Text>
              <Text className="text-sm text-muted-foreground">
                PostHog telemetry: usage events + crash reports. Never sends voice, transcripts, or API keys.
              </Text>
            </View>
            <Switch
              testID="telemetry-toggle"
              value={telemetryEnabled}
              onValueChange={toggleTelemetry}
            />
          </View>
        </Card>

        <Card testID="pipeline-test-card" className="gap-4 p-4">
          <Text className="text-lg font-semibold text-foreground">Pipeline Tests</Text>
          <Button
            testID="run-pipeline-tests"
            variant="secondary"
            disabled={testRunning}
            onPress={async () => {
              setTestRunning(true)
              setTestResults([])
              setTestProgress('Starting...')
              try {
                const results = await runPipelineTests((msg) => setTestProgress(msg))
                setTestResults(results)
                setTestProgress('')
              } catch (e: any) {
                setTestProgress(`Error: ${e.message}`)
              } finally {
                setTestRunning(false)
              }
            }}
          >
            {testRunning
              ? <ActivityIndicator size="small" color={palette.muted} />
              : <Icon as={PlayIcon} size={16} className="text-foreground" />}
            <Text className="ml-2 text-foreground">{testRunning ? 'Running...' : 'Run Pipeline Tests'}</Text>
          </Button>
          {testProgress ? (
            <Text className="text-sm text-muted-foreground">{testProgress}</Text>
          ) : null}
          {testResults.map((r, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <Text className={r.passed ? 'text-brand-sage' : 'text-destructive'}>
                {r.passed ? 'PASS' : 'FAIL'}
              </Text>
              <Text className="flex-1 text-sm text-foreground">{r.name}</Text>
              <Text className="text-xs text-muted-foreground">{(r.durationMs / 1000).toFixed(1)}s</Text>
              {r.error ? <Text className="text-xs text-red-400">{r.error}</Text> : null}
            </View>
          ))}
        </Card>

        <Card testID="latency-stats-card" className="gap-4 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">Latency Stats</Text>
            <Pressable onPress={loadLatencyStats} className="p-2" disabled={loadingStats}>
              <Icon as={RefreshCwIcon} size={18} className="text-muted-foreground" />
            </Pressable>
          </View>
          {loadingStats ? (
            <ActivityIndicator size="small" color={palette.muted} />
          ) : latencyStats && latencyStats.turnCount > 0 ? (
            <View className="gap-4">
              <LatencyBreakdownBar
                avgStt={latencyStats.avgStt}
                avgLlm={latencyStats.avgLlm}
                avgTts={latencyStats.avgTts}
                colors={stageColors}
              />
              <View className="gap-3">
                <LatencyStageSection label="STT" color={stageColors.stt} avg={latencyStats.avgStt} min={latencyStats.minStt} max={latencyStats.maxStt} />
                <LatencyStageSection label="LLM" color={stageColors.llm} avg={latencyStats.avgLlm} min={latencyStats.minLlm} max={latencyStats.maxLlm} />
                <LatencyStageSection label="TTS" color={stageColors.tts} avg={latencyStats.avgTts} min={latencyStats.minTts} max={latencyStats.maxTts} />
                <View className="my-1 border-t border-input" />
                <LatencyStageSection label="Total" avg={latencyStats.avgTotal} min={latencyStats.minTotal} max={latencyStats.maxTotal} />
              </View>
              <Text className="text-xs text-muted-foreground/60">
                Based on {latencyStats.turnCount} turn{latencyStats.turnCount !== 1 ? 's' : ''} with latency data
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-muted-foreground">
              No latency data yet. Start a call to collect stats.
            </Text>
          )}
        </Card>

        <SavedIndicator status={saveStatus} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function isRealtimeModel(model: string | null): model is RealtimeModel {
  return model === 'gemini-3.1-flash-live-preview' || model === 'grok-voice-think-fast-1.0'
}

function normalizeRealtimeModel(model: string | null): RealtimeModel {
  return isRealtimeModel(model) ? model : DEFAULT_REALTIME_MODEL
}

function normalizeRealtimeVoice(model: RealtimeModel, voice: string | null): string {
  if (model.startsWith('grok-voice-')) {
    return voice && (XAI_VOICES as readonly string[]).includes(voice) ? voice : 'eve'
  }

  return voice && (GEMINI_VOICES as readonly string[]).includes(voice) ? voice : 'Zephyr'
}

// --- Helper Components ---

function SecretInput({
  value,
  onChangeText,
  placeholder,
  validationStatus = 'idle',
  validationError,
  onTest,
}: {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  validationStatus?: ValidationStatus
  validationError?: string
  onTest?: () => void
}) {
  const [visible, setVisible] = useState(false)
  const { colorScheme } = useColorScheme()
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1 flex-row items-center rounded-md border border-input bg-background dark:bg-input/30">
          <TextInput
            className="h-10 min-w-0 flex-1 px-3 py-2 text-base text-foreground"
            placeholder={placeholder}
            placeholderTextColor={palette.muted}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            numberOfLines={1}
            scrollEnabled
          />
          <Pressable
            onPress={() => setVisible((prev) => !prev)}
            className="h-10 shrink-0 items-center justify-center px-3"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              as={visible ? EyeOffIcon : EyeIcon}
              size={20}
              className="text-muted-foreground"
            />
          </Pressable>
        </View>
        {onTest && (
          <Pressable
            onPress={onTest}
            disabled={validationStatus === 'testing' || !value.trim()}
            className={`h-10 shrink-0 flex-row items-center justify-center rounded-md px-3 ${
              validationStatus === 'valid'
                ? 'bg-brand-sage/10'
                : validationStatus === 'invalid'
                  ? 'bg-destructive/10'
                  : 'bg-secondary'
            } ${(!value.trim() || validationStatus === 'testing') ? 'opacity-50' : ''}`}
          >
            {validationStatus === 'testing' ? (
              <ActivityIndicator size="small" color={palette.muted} />
            ) : validationStatus === 'valid' ? (
              <Icon as={CheckIcon} size={18} className="text-brand-sage" />
            ) : validationStatus === 'invalid' ? (
              <Icon as={AlertCircleIcon} size={18} className="text-destructive" />
            ) : (
              <Text className="text-sm font-medium text-foreground">Test</Text>
            )}
          </Pressable>
        )}
      </View>
      {validationStatus === 'invalid' && validationError && (
        <Text className="text-xs text-destructive">{validationError}</Text>
      )}
    </View>
  )
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string, value: T }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View className="flex-row rounded-lg border border-input bg-background dark:bg-input/30">
      {options.map((option, index) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          className={`flex-1 items-center px-3 py-2 ${
            value === option.value ? 'rounded-lg bg-primary' : ''
          } ${index > 0 ? 'border-l border-input' : ''}`}
        >
          <Text
            className={`text-sm font-medium ${
              value === option.value ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

function OptionGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string, value: T, disabled?: boolean, badge?: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View className="gap-1">
      {options.map((option) => {
        const isSelected = value === option.value
        const isDisabled = option.disabled === true
        return (
          <Pressable
            key={option.value}
            onPress={() => !isDisabled && onChange(option.value)}
            disabled={isDisabled}
            className={`flex-row items-center rounded-lg px-3 py-2 ${
              isSelected ? 'border border-primary bg-primary/10' : 'border border-input'
            } ${isDisabled ? 'opacity-50' : ''}`}
          >
            <View
              className={`mr-3 h-4 w-4 items-center justify-center rounded-full border ${
                isSelected ? 'border-primary' : 'border-muted-foreground'
              }`}
            >
              {isSelected && (
                <View className="h-2 w-2 rounded-full bg-primary" />
              )}
            </View>
            <Text
              className={`flex-1 text-sm ${
                isSelected ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}
            >
              {option.label}
            </Text>
            {option.badge && (
              <Text className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {option.badge}
              </Text>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

function KokoroModelStatus({
  status,
  onDownload,
  onRetry,
}: {
  status: 'checking' | 'ready' | 'not-downloaded' | 'downloading' | 'error' | 'unavailable'
  onDownload: () => void
  onRetry: () => void
}) {
  const { colorScheme } = useColorScheme()
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light

  if (status === 'unavailable') {
    return (
      <View className="flex-row items-center gap-2 rounded-lg border border-input px-3 py-2">
        <Text className="text-sm text-muted-foreground">Kokoro TTS is not available in this build. Requires KokoroSwift package.</Text>
      </View>
    )
  }

  if (status === 'checking') {
    return (
      <View className="flex-row items-center gap-2 rounded-lg border border-input px-3 py-2">
        <ActivityIndicator size="small" color={palette.muted} />
        <Text className="text-sm text-muted-foreground">Checking model...</Text>
      </View>
    )
  }

  if (status === 'ready') {
    return (
      <View className="flex-row items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
        <Icon as={CheckIcon} size={16} className="text-primary" />
        <Text className="text-sm text-primary">Model ready (~327 MB cached)</Text>
      </View>
    )
  }

  if (status === 'downloading') {
    return (
      <View className="flex-row items-center gap-2 rounded-lg border border-input px-3 py-2">
        <ActivityIndicator size="small" color={palette.muted} />
        <Text className="text-sm text-muted-foreground">Downloading model (~327 MB)...</Text>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <Pressable
        onPress={onRetry}
        className="flex-row items-center justify-between rounded-lg border border-destructive/50 bg-destructive/5 px-3 py-2"
      >
        <Text className="text-sm text-destructive">Download failed — tap to retry</Text>
      </Pressable>
    )
  }

  // not-downloaded
  return (
    <Pressable
      onPress={onDownload}
      className="flex-row items-center justify-between rounded-lg border border-input bg-background px-3 py-2 active:opacity-70 dark:bg-input/30"
    >
      <Text className="text-sm text-muted-foreground">Model not downloaded</Text>
      <Text className="text-sm font-medium text-primary">Download (~327 MB)</Text>
    </Pressable>
  )
}

function PluginConnectionStatusBar({
  status,
  onConnect,
  onDisconnect,
}: {
  status: PluginConnectionStatus
  onConnect: () => void
  onDisconnect: () => void
}) {
  const { colorScheme } = useColorScheme()
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'

  const statusColor = isConnected
    ? 'border-brand-sage/30 bg-brand-sage/10'
    : status === 'error'
      ? 'border-destructive/50 bg-destructive/5'
      : 'border-input'

  const statusLabel = isConnected
    ? 'Connected'
    : isConnecting
      ? 'Connecting...'
      : status === 'error'
        ? 'Connection failed'
        : 'Disconnected'

  const statusTextColor = isConnected
    ? 'text-brand-sage'
    : status === 'error'
      ? 'text-destructive'
      : 'text-muted-foreground'

  return (
    <View className={`flex-row items-center justify-between rounded-lg border px-3 py-2 ${statusColor}`}>
      <View className="flex-row items-center gap-2">
        {isConnecting ? (
          <ActivityIndicator size="small" color={palette.muted} />
        ) : (
          <Icon
            as={isConnected ? WifiIcon : WifiOffIcon}
            size={16}
            className={statusTextColor}
          />
        )}
        <Text className={`text-sm ${statusTextColor}`}>{statusLabel}</Text>
      </View>
      <Pressable
        onPress={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={`rounded-md px-3 py-1 ${isConnecting ? 'opacity-50' : ''} ${
          isConnected ? 'bg-destructive/10' : 'bg-primary/10'
        }`}
      >
        <Text className={`text-sm font-medium ${isConnected ? 'text-destructive' : 'text-primary'}`}>
          {isConnected ? 'Disconnect' : 'Connect'}
        </Text>
      </Pressable>
    </View>
  )
}

function SavedIndicator({ status }: { status: SaveStatus }) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (status === 'saved') {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start()
    } else if (status === 'idle') {
      opacity.setValue(0)
    }
  }, [status, opacity])

  if (status === 'idle') return null

  return (
    <Animated.View
      style={{ opacity }}
      className="flex-row items-center justify-center gap-2 py-2"
    >
      <Icon as={CheckIcon} size={16} className="text-primary" />
      <Text className="text-sm text-muted-foreground">Saved</Text>
    </Animated.View>
  )
}

function LatencyBreakdownBar({ avgStt, avgLlm, avgTts, colors }: {
  avgStt: number | null
  avgLlm: number | null
  avgTts: number | null
  colors: ReturnType<typeof getStageColors>
}) {
  const stt = avgStt ?? 0
  const llm = avgLlm ?? 0
  const tts = avgTts ?? 0
  const total = stt + llm + tts

  if (total === 0) return null

  const sttPct = (stt / total) * 100
  const llmPct = (llm / total) * 100
  const ttsPct = (tts / total) * 100

  return (
    <View className="gap-2">
      <View className="h-8 flex-row overflow-hidden rounded-full">
        {stt > 0 && (
          <View style={{ flex: stt, backgroundColor: colors.stt }} />
        )}
        {llm > 0 && (
          <View style={{ flex: llm, backgroundColor: colors.llm }} />
        )}
        {tts > 0 && (
          <View style={{ flex: tts, backgroundColor: colors.tts }} />
        )}
      </View>
      <View className="flex-row justify-center gap-4">
        {stt > 0 && <BarLegendItem color={colors.stt} label="STT" pct={sttPct} />}
        {llm > 0 && <BarLegendItem color={colors.llm} label="LLM" pct={llmPct} />}
        {tts > 0 && <BarLegendItem color={colors.tts} label="TTS" pct={ttsPct} />}
      </View>
    </View>
  )
}

function BarLegendItem({ color, label, pct }: { color: string, label: string, pct: number }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ backgroundColor: color }} className="h-2.5 w-2.5 rounded-full" />
      <Text className="text-xs text-muted-foreground">
        {label} {Math.round(pct)}%
      </Text>
    </View>
  )
}

function LatencyStageSection({ label, color, avg, min, max }: {
  label: string
  color?: string
  avg: number | null
  min: number | null
  max: number | null
}) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {color && <View style={{ backgroundColor: color }} className="h-3 w-3 rounded-full" />}
          <Text className="text-sm font-medium text-foreground">{label}</Text>
        </View>
        <Text className="text-sm font-semibold text-foreground">
          {avg != null ? formatLatencyMs(avg) : '--'}
        </Text>
      </View>
      <View className={`flex-row items-center justify-between ${color ? 'pl-7' : 'pl-2'}`}>
        <Text className="text-xs text-muted-foreground">Min / Max</Text>
        <Text className="text-xs text-muted-foreground">
          {min != null ? formatLatencyMs(min) : '--'} / {max != null ? formatLatencyMs(max) : '--'}
        </Text>
      </View>
    </View>
  )
}

// --- Helper Functions ---

function formatLatencyMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

function getStageColors(colorScheme: 'light' | 'dark' | undefined) {
  if (colorScheme === 'dark') {
    return {
      stt: BRAND.colors.dark.sage,
      llm: BRAND.colors.dark.muted,
      tts: '#7C6A5A',
    }
  }

  return {
    stt: BRAND.colors.light.sage,
    llm: BRAND.colors.light.muted,
    tts: BRAND.colors.light.ink,
  }
}
