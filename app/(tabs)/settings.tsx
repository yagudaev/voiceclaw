import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { getSetting, setSetting, getLatencyAverages, type LatencyAverages } from '@/db'
import { EyeIcon, EyeOffIcon } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'

type VoiceMode = 'vapi' | 'custom'
type STTProviderValue = 'apple' | 'deepgram'
type TTSProviderValue = 'apple' | 'elevenlabs' | 'openai'

const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const

export default function SettingsScreen() {
  const [vapiApiKey, setVapiApiKey] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [defaultModel, setDefaultModel] = useState('openclaw:voice')
  const [openclawApiKey, setOpenclawApiKey] = useState('')
  const [openclawApiUrl, setOpenclawApiUrl] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant. Keep responses concise. Use markdown for formatting and images when appropriate. Your identity, personality, and capabilities are defined in your system files.')
  const [saved, setSaved] = useState(false)

  // Voice Pipeline state
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('vapi')
  const [sttProvider, setSttProvider] = useState<STTProviderValue>('apple')
  const [ttsProvider, setTtsProvider] = useState<TTSProviderValue>('apple')
  const [deepgramApiKey, setDeepgramApiKey] = useState('')
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('')
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState('Awx8TeMHHpDzbm42nIB6')
  const [openaiTtsApiKey, setOpenaiTtsApiKey] = useState('')
  const [openaiTtsVoice, setOpenaiTtsVoice] = useState('alloy')

  // Latency stats state
  const [latencyStats, setLatencyStats] = useState<LatencyAverages | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

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
      const key = await getSetting('vapi_api_key')
      const assistant = await getSetting('assistant_id')
      const model = await getSetting('default_model')
      const ocKey = await getSetting('openclaw_api_key')
      const ocUrl = await getSetting('openclaw_api_url')
      if (key) setVapiApiKey(key)
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
      if (tts === 'apple' || tts === 'elevenlabs' || tts === 'openai') setTtsProvider(tts)
      const dgKey = await getSetting('deepgram_api_key')
      if (dgKey) setDeepgramApiKey(dgKey)
      const elKey = await getSetting('elevenlabs_api_key')
      if (elKey) setElevenlabsApiKey(elKey)
      const elVoice = await getSetting('elevenlabs_voice_id')
      if (elVoice) setElevenlabsVoiceId(elVoice)
      const oaiKey = await getSetting('openai_tts_api_key')
      if (oaiKey) setOpenaiTtsApiKey(oaiKey)
      const oaiVoice = await getSetting('openai_tts_voice')
      if (oaiVoice) setOpenaiTtsVoice(oaiVoice)
    })()
  }, [])

  const handleSave = async () => {
    await setSetting('vapi_api_key', vapiApiKey)
    await setSetting('assistant_id', assistantId)
    await setSetting('default_model', defaultModel)
    await setSetting('openclaw_api_key', openclawApiKey)
    await setSetting('openclaw_api_url', openclawApiUrl)
    await setSetting('system_prompt', systemPrompt)

    // Save voice pipeline settings
    await setSetting('voice_mode', voiceMode)
    await setSetting('stt_provider', sttProvider)
    await setSetting('tts_provider', ttsProvider)
    await setSetting('deepgram_api_key', deepgramApiKey)
    await setSetting('elevenlabs_api_key', elevenlabsApiKey)
    await setSetting('elevenlabs_voice_id', elevenlabsVoiceId)
    await setSetting('openai_tts_api_key', openaiTtsApiKey)
    await setSetting('openai_tts_voice', openaiTtsVoice)

    setSaved(true)
    Alert.alert('Settings Saved', 'Your settings have been saved successfully.')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <Card className="gap-4 p-4">
          <Text className="text-lg font-semibold text-foreground">Voice Pipeline</Text>

          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">Voice Mode</Text>
            <SegmentedControl
              options={[
                { label: 'Vapi All-in-One', value: 'vapi' as const },
                { label: 'Custom Pipeline', value: 'custom' as const },
              ]}
              value={voiceMode}
              onChange={(v) => setVoiceMode(v)}
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
                  onChange={(v) => setSttProvider(v)}
                />
              </View>

              {sttProvider === 'deepgram' && (
                <View className="gap-2">
                  <Text className="text-sm text-muted-foreground">Deepgram API Key</Text>
                  <SecretInput
                    value={deepgramApiKey}
                    onChangeText={setDeepgramApiKey}
                    placeholder="Enter your Deepgram API key"
                  />
                </View>
              )}

              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">TTS Provider</Text>
                <OptionGroup
                  options={[
                    { label: 'Apple Zoe On-Device', value: 'apple' as const },
                    { label: 'ElevenLabs Cloud', value: 'elevenlabs' as const },
                    { label: 'OpenAI TTS Cloud', value: 'openai' as const },
                  ]}
                  value={ttsProvider}
                  onChange={(v) => setTtsProvider(v)}
                />
              </View>

              {ttsProvider === 'elevenlabs' && (
                <>
                  <View className="gap-2">
                    <Text className="text-sm text-muted-foreground">ElevenLabs API Key</Text>
                    <SecretInput
                      value={elevenlabsApiKey}
                      onChangeText={setElevenlabsApiKey}
                      placeholder="Enter your ElevenLabs API key"
                    />
                  </View>
                  <View className="gap-2">
                    <Text className="text-sm text-muted-foreground">ElevenLabs Voice ID</Text>
                    <Input
                      placeholder="Awx8TeMHHpDzbm42nIB6"
                      value={elevenlabsVoiceId}
                      onChangeText={setElevenlabsVoiceId}
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
                      onChangeText={setOpenaiTtsApiKey}
                      placeholder="Enter your OpenAI API key"
                    />
                  </View>
                  <View className="gap-2">
                    <Text className="text-sm text-muted-foreground">OpenAI TTS Voice</Text>
                    <OptionGroup
                      options={OPENAI_TTS_VOICES.map((v) => ({ label: v, value: v }))}
                      value={openaiTtsVoice}
                      onChange={setOpenaiTtsVoice}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </Card>

        {voiceMode === 'vapi' && (
          <Card className="gap-4 p-4">
            <Text className="text-lg font-semibold text-foreground">Vapi Configuration</Text>

            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">API Key</Text>
              <SecretInput
                value={vapiApiKey}
                onChangeText={setVapiApiKey}
                placeholder="Enter your Vapi API key"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">Assistant ID</Text>
              <Input
                placeholder="Enter your Vapi Assistant ID"
                value={assistantId}
                onChangeText={setAssistantId}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">Default Model</Text>
              <Input
                placeholder="e.g. gpt-4o, claude-3-opus"
                value={defaultModel}
                onChangeText={setDefaultModel}
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
                onChangeText={setSystemPrompt}
                multiline
                textAlignVertical="top"
              />
            </View>
          </Card>
        )}

        <Card className="gap-4 p-4">
          <Text className="text-lg font-semibold text-foreground">OpenClaw Configuration</Text>

          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">API URL</Text>
            <Input
              placeholder="https://your-server.com/v1/chat/completions"
              value={openclawApiUrl}
              onChangeText={setOpenclawApiUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">API Key</Text>
            <SecretInput
              value={openclawApiKey}
              onChangeText={setOpenclawApiKey}
              placeholder="Enter your OpenClaw API key"
            />
          </View>
        </Card>

        <Card className="gap-4 p-4">
          <Text className="text-lg font-semibold text-foreground">Latency Stats</Text>
          {loadingStats ? (
            <ActivityIndicator size="small" color="#888" />
          ) : latencyStats && latencyStats.turnCount > 0 ? (
            <View className="gap-2">
              <LatencyStatRow label="Avg STT" value={latencyStats.avgStt} />
              <LatencyStatRow label="Avg LLM" value={latencyStats.avgLlm} />
              <LatencyStatRow label="Avg TTS" value={latencyStats.avgTts} />
              <LatencyStatRow label="Avg Total" value={latencyStats.avgTotal} />
              <Text className="text-xs text-muted-foreground/60">
                Based on {latencyStats.turnCount} turn{latencyStats.turnCount !== 1 ? 's' : ''} with latency data
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-muted-foreground">
              No latency data yet. Use Custom Pipeline mode to collect stats.
            </Text>
          )}
        </Card>

        <Button onPress={handleSave}>
          <Text>{saved ? 'Saved!' : 'Save Settings'}</Text>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// --- Helper Components ---

function SecretInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <View className="flex-row items-center rounded-md border border-input bg-background dark:bg-input/30">
      <TextInput
        className="h-10 min-w-0 flex-1 px-3 text-base leading-[40px] text-foreground"
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
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      >
        <Icon
          as={visible ? EyeOffIcon : EyeIcon}
          size={20}
          className="text-muted-foreground"
        />
      </Pressable>
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

// --- Helper Components ---

function LatencyStatRow({ label, value }: { label: string, value: number | null }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium text-foreground">
        {value != null ? formatLatencyMs(value) : '--'}
      </Text>
    </View>
  )
}

// --- Helper Functions ---

function formatLatencyMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}
