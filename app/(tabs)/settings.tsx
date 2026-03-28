import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { getSetting, setSetting, getLatencyAverages, type LatencyAverages } from '@/db'
import { runPipelineTests, type TestResult } from '@/lib/pipeline-test-runner'
import { useAutoSave, type SaveStatus } from '@/lib/use-auto-save'
import { validateApiKey, type Provider, type ValidationStatus } from '@/lib/validate-api-key'
import ExpoCustomPipelineModule from '@/modules/expo-custom-pipeline/src/ExpoCustomPipelineModule'
import { AlertCircleIcon, CheckIcon, EyeIcon, EyeOffIcon, PlayIcon, RefreshCwIcon } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native'

type VoiceMode = 'vapi' | 'custom'
type STTProviderValue = 'apple' | 'deepgram'
type TTSProviderValue = 'apple' | 'elevenlabs' | 'openai' | 'kokoro'

const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const

const STAGE_COLORS = {
  stt: '#3b82f6',  // blue-500
  llm: '#a855f7',  // purple-500
  tts: '#22c55e',  // green-500
} as const

export default function SettingsScreen() {
  const [vapiPublicKey, setVapiPublicKey] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [defaultModel, setDefaultModel] = useState('openclaw:voice')
  const [openclawApiKey, setOpenclawApiKey] = useState('')
  const [openclawApiUrl, setOpenclawApiUrl] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant. Keep responses concise. Use markdown for formatting and images when appropriate. Your identity, personality, and capabilities are defined in your system files.')

  // Voice Pipeline state
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('vapi')
  const [sttProvider, setSttProvider] = useState<STTProviderValue>('apple')
  const [ttsProvider, setTtsProvider] = useState<TTSProviderValue>('apple')
  const [deepgramApiKey, setDeepgramApiKey] = useState('')
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('')
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState('Awx8TeMHHpDzbm42nIB6')
  const [openaiTtsApiKey, setOpenaiTtsApiKey] = useState('')
  const [openaiTtsVoice, setOpenaiTtsVoice] = useState<typeof OPENAI_TTS_VOICES[number]>('alloy')

  // Debug mode
  const [debugMode, setDebugMode] = useState(false)

  // Show latency
  const [showLatency, setShowLatencyState] = useState(false)

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
    openclaw: 'idle',
    elevenlabs: 'idle',
    deepgram: 'idle',
    openai_tts: 'idle',
    vapi: 'idle',
  })
  const [validationErrors, setValidationErrors] = useState<Record<Provider, string | undefined>>({
    openclaw: undefined,
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


  useEffect(() => {
    ;(async () => {
      const key = (await getSetting('vapi_public_key')) || (await getSetting('vapi_api_key'))
      const assistant = await getSetting('assistant_id')
      const model = await getSetting('default_model')
      const ocKey = await getSetting('openclaw_api_key')
      const ocUrl = await getSetting('openclaw_api_url')
      if (key) setVapiPublicKey(key)
      if (assistant) setAssistantId(assistant)
      if (model) setDefaultModel(model)
      if (ocKey) setOpenclawApiKey(ocKey)
      if (ocUrl) setOpenclawApiUrl(ocUrl)
      const sp = await getSetting('system_prompt')
      if (sp) setSystemPrompt(sp)

      // Load voice pipeline settings
      const vm = await getSetting('voice_mode')
      if (vm === 'vapi' || vm === 'custom') setVoiceMode(vm)
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
      const sl = await getSetting('show_latency')
      if (sl === 'true') setShowLatencyState(true)

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
  const updateVoiceMode = useCallback((v: VoiceMode) => {
    setVoiceMode(v)
    if (loadedRef.current) saveImmediate('voice_mode', v)
  }, [saveImmediate])

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

  const updateOpenclawApiKey = useCallback((v: string) => {
    setOpenclawApiKey(v)
    resetValidation('openclaw')
    if (loadedRef.current) saveDebounced('openclaw_api_key', v)
  }, [saveDebounced, resetValidation])

  const updateOpenclawApiUrl = useCallback((v: string) => {
    setOpenclawApiUrl(v)
    resetValidation('openclaw')
    if (loadedRef.current) saveDebounced('openclaw_api_url', v)
  }, [saveDebounced, resetValidation])

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

  const toggleShowLatency = useCallback((v: boolean) => {
    setShowLatencyState(v)
    setSetting('show_latency', v ? 'true' : 'false')
  }, [])

  return (
    <KeyboardAvoidingView
      testID="settings-screen"
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <ScrollView testID="settings-scroll" contentContainerStyle={{ padding: 16, gap: 16 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <Card testID="voice-pipeline-card" className="gap-4 p-4">
          <Text className="text-lg font-semibold text-foreground">Voice Pipeline</Text>

          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">Voice Mode</Text>
            <SegmentedControl
              options={[
                { label: 'Vapi All-in-One', value: 'vapi' as const },
                { label: 'Custom Pipeline', value: 'custom' as const },
              ]}
              value={voiceMode}
              onChange={updateVoiceMode}
            />
          </View>

          {voiceMode === 'custom' && (
            <>
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">STT Provider</Text>
                <SegmentedControl
                  options={[
                    { label: 'Apple On-Device', value: 'apple' as const },
                    { label: 'Deepgram Cloud', value: 'deepgram' as const },
                  ]}
                  value={sttProvider}
                  onChange={updateSttProvider}
                />
              </View>

              {sttProvider === 'deepgram' && (
                <View className="gap-2">
                  <Text className="text-sm text-muted-foreground">Deepgram API Key</Text>
                  <SecretInput
                    value={deepgramApiKey}
                    onChangeText={updateDeepgramApiKey}
                    placeholder="Enter your Deepgram API key"
                    validationStatus={validationStatus.deepgram}
                    validationError={validationErrors.deepgram}
                    onTest={() => testApiKey('deepgram', deepgramApiKey)}
                  />
                </View>
              )}

              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">TTS Provider</Text>
                <OptionGroup
                  options={[
                    { label: 'Apple Zoe On-Device', value: 'apple' as const },
                    { label: 'Kokoro On-Device (iOS 18+)', value: 'kokoro' as const },
                    { label: 'ElevenLabs Cloud', value: 'elevenlabs' as const },
                    { label: 'OpenAI TTS Cloud', value: 'openai' as const },
                  ]}
                  value={ttsProvider}
                  onChange={updateTtsProvider}
                />
              </View>

              {ttsProvider === 'kokoro' && (
                <KokoroModelStatus status={kokoroStatus} onDownload={downloadKokoroModel} onRetry={checkKokoroStatus} />
              )}

              {ttsProvider === 'elevenlabs' && (
                <>
                  <View className="gap-2">
                    <Text className="text-sm text-muted-foreground">ElevenLabs API Key</Text>
                    <SecretInput
                      value={elevenlabsApiKey}
                      onChangeText={updateElevenlabsApiKey}
                      placeholder="Enter your ElevenLabs API key"
                      validationStatus={validationStatus.elevenlabs}
                      validationError={validationErrors.elevenlabs}
                      onTest={() => testApiKey('elevenlabs', elevenlabsApiKey)}
                    />
                  </View>
                  <View className="gap-2">
                    <Text className="text-sm text-muted-foreground">ElevenLabs Voice ID</Text>
                    <Input
                      placeholder="Awx8TeMHHpDzbm42nIB6"
                      value={elevenlabsVoiceId}
                      onChangeText={updateElevenlabsVoiceId}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </>
              )}

              {ttsProvider === 'openai' && (
                <>
                  <View className="gap-2">
                    <Text className="text-sm text-muted-foreground">OpenAI TTS API Key</Text>
                    <SecretInput
                      value={openaiTtsApiKey}
                      onChangeText={updateOpenaiTtsApiKey}
                      placeholder="Enter your OpenAI API key"
                      validationStatus={validationStatus.openai_tts}
                      validationError={validationErrors.openai_tts}
                      onTest={() => testApiKey('openai_tts', openaiTtsApiKey)}
                    />
                  </View>
                  <View className="gap-2">
                    <Text className="text-sm text-muted-foreground">OpenAI TTS Voice</Text>
                    <OptionGroup
                      options={OPENAI_TTS_VOICES.map((v) => ({ label: v, value: v }))}
                      value={openaiTtsVoice}
                      onChange={updateOpenaiTtsVoice}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </Card>

        {voiceMode === 'vapi' && (
          <Card testID="vapi-config-card" className="gap-4 p-4">
            <Text className="text-lg font-semibold text-foreground">Vapi Configuration</Text>

            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">Public Key</Text>
              <SecretInput
                value={vapiPublicKey}
                onChangeText={updateVapiPublicKey}
                placeholder="Enter your Vapi public key"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">Assistant ID</Text>
              <Input
                placeholder="Enter your Vapi Assistant ID"
                value={assistantId}
                onChangeText={updateAssistantId}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">Default Model</Text>
              <Input
                placeholder="e.g. gpt-4o, claude-3-opus"
                value={defaultModel}
                onChangeText={updateDefaultModel}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">System Prompt</Text>
              <TextInput
                className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-base text-foreground dark:bg-input/30"
                placeholder="Default: Keep responses concise. Use markdown for formatting and images when appropriate."
                placeholderTextColor="#888"
                value={systemPrompt}
                onChangeText={updateSystemPrompt}
                multiline
                textAlignVertical="top"
              />
            </View>
          </Card>
        )}

        <Card testID="openclaw-config-card" className="gap-4 p-4">
          <Text className="text-lg font-semibold text-foreground">OpenClaw Configuration</Text>

          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">API URL</Text>
            <Input
              placeholder="https://your-server.com/v1/chat/completions"
              value={openclawApiUrl}
              onChangeText={updateOpenclawApiUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">API Key</Text>
            <SecretInput
              value={openclawApiKey}
              onChangeText={updateOpenclawApiKey}
              placeholder="Enter your OpenClaw API key"
              validationStatus={validationStatus.openclaw}
              validationError={validationErrors.openclaw}
              onTest={() => testApiKey('openclaw', openclawApiKey, openclawApiUrl)}
            />
          </View>
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
              ? <ActivityIndicator size="small" color="#888" />
              : <Icon as={PlayIcon} size={16} className="text-foreground" />}
            <Text className="ml-2 text-foreground">{testRunning ? 'Running...' : 'Run Pipeline Tests'}</Text>
          </Button>
          {testProgress ? (
            <Text className="text-sm text-muted-foreground">{testProgress}</Text>
          ) : null}
          {testResults.map((r, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <Text className={r.passed ? 'text-green-500' : 'text-red-500'}>
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
            <ActivityIndicator size="small" color="#888" />
          ) : latencyStats && latencyStats.turnCount > 0 ? (
            <View className="gap-4">
              <LatencyBreakdownBar
                avgStt={latencyStats.avgStt}
                avgLlm={latencyStats.avgLlm}
                avgTts={latencyStats.avgTts}
              />
              <View className="gap-3">
                <LatencyStageSection label="STT" color={STAGE_COLORS.stt} avg={latencyStats.avgStt} min={latencyStats.minStt} max={latencyStats.maxStt} />
                <LatencyStageSection label="LLM" color={STAGE_COLORS.llm} avg={latencyStats.avgLlm} min={latencyStats.minLlm} max={latencyStats.maxLlm} />
                <LatencyStageSection label="TTS" color={STAGE_COLORS.tts} avg={latencyStats.avgTts} min={latencyStats.minTts} max={latencyStats.maxTts} />
                <View className="my-1 border-t border-input" />
                <LatencyStageSection label="Total" avg={latencyStats.avgTotal} min={latencyStats.minTotal} max={latencyStats.maxTotal} />
              </View>
              <Text className="text-xs text-muted-foreground/60">
                Based on {latencyStats.turnCount} turn{latencyStats.turnCount !== 1 ? 's' : ''} with latency data
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-muted-foreground">
              No latency data yet. Use Custom Pipeline or Vapi mode to collect stats.
            </Text>
          )}
        </Card>

        <SavedIndicator status={saveStatus} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
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

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1 flex-row items-center rounded-md border border-input bg-background dark:bg-input/30">
          <TextInput
            className="h-10 min-w-0 flex-1 px-3 py-2 text-base text-foreground"
            placeholder={placeholder}
            placeholderTextColor="#888"
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
                ? 'bg-green-500/10'
                : validationStatus === 'invalid'
                  ? 'bg-destructive/10'
                  : 'bg-secondary'
            } ${(!value.trim() || validationStatus === 'testing') ? 'opacity-50' : ''}`}
          >
            {validationStatus === 'testing' ? (
              <ActivityIndicator size="small" color="#888" />
            ) : validationStatus === 'valid' ? (
              <Icon as={CheckIcon} size={18} className="text-green-500" />
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
  options: Array<{ label: string, value: T }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View className="gap-1">
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          className={`flex-row items-center rounded-lg px-3 py-2 ${
            value === option.value ? 'border border-primary bg-primary/10' : 'border border-input'
          }`}
        >
          <View
            className={`mr-3 h-4 w-4 items-center justify-center rounded-full border ${
              value === option.value ? 'border-primary' : 'border-muted-foreground'
            }`}
          >
            {value === option.value && (
              <View className="h-2 w-2 rounded-full bg-primary" />
            )}
          </View>
          <Text
            className={`text-sm ${
              value === option.value ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
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
        <ActivityIndicator size="small" color="#888" />
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
        <ActivityIndicator size="small" color="#888" />
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

function LatencyBreakdownBar({ avgStt, avgLlm, avgTts }: {
  avgStt: number | null
  avgLlm: number | null
  avgTts: number | null
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
          <View style={{ flex: stt, backgroundColor: STAGE_COLORS.stt }} className="items-center justify-center">
            {sttPct >= 15 && <Text className="text-xs font-semibold text-white">{Math.round(sttPct)}%</Text>}
          </View>
        )}
        {llm > 0 && (
          <View style={{ flex: llm, backgroundColor: STAGE_COLORS.llm }} className="items-center justify-center">
            {llmPct >= 15 && <Text className="text-xs font-semibold text-white">{Math.round(llmPct)}%</Text>}
          </View>
        )}
        {tts > 0 && (
          <View style={{ flex: tts, backgroundColor: STAGE_COLORS.tts }} className="items-center justify-center">
            {ttsPct >= 15 && <Text className="text-xs font-semibold text-white">{Math.round(ttsPct)}%</Text>}
          </View>
        )}
      </View>
      <View className="flex-row justify-center gap-4">
        {stt > 0 && <BarLegendItem color={STAGE_COLORS.stt} label="STT" pct={sttPct} />}
        {llm > 0 && <BarLegendItem color={STAGE_COLORS.llm} label="LLM" pct={llmPct} />}
        {tts > 0 && <BarLegendItem color={STAGE_COLORS.tts} label="TTS" pct={ttsPct} />}
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
