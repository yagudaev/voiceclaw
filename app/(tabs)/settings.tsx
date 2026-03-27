import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { getSetting, setSetting, getLatencyAverages, type LatencyAverages } from '@/db'
import { EyeIcon, EyeOffIcon } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, TouchableWithoutFeedback, View } from 'react-native'

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
        className="h-10 min-w-0 flex-1 px-3 text-base text-foreground"
        placeholder={placeholder}
        placeholderTextColor="#888"
        value={visible ? value : value ? '\u2022'.repeat(Math.min(value.length, 30)) : ''}
        onChangeText={visible ? onChangeText : undefined}
        editable={visible}
        autoCapitalize="none"
        autoCorrect={false}
        numberOfLines={1}
        scrollEnabled
      />
      <Pressable onPress={() => setVisible((prev) => !prev)} className="shrink-0 px-3">
        <Icon
          as={visible ? EyeOffIcon : EyeIcon}
          size={20}
          className="text-muted-foreground"
        />
      </Pressable>
    </View>
  )
}

export default function SettingsScreen() {
  const [vapiApiKey, setVapiApiKey] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [defaultModel, setDefaultModel] = useState('openclaw:voice')
  const [openclawApiKey, setOpenclawApiKey] = useState('')
  const [openclawApiUrl, setOpenclawApiUrl] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant. Keep responses concise. Use markdown for formatting and images when appropriate. Your identity, personality, and capabilities are defined in your system files.')
  const [saved, setSaved] = useState(false)
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
    })()
  }, [])

  const handleSave = async () => {
    await setSetting('vapi_api_key', vapiApiKey)
    await setSetting('assistant_id', assistantId)
    await setSetting('default_model', defaultModel)
    await setSetting('openclaw_api_key', openclawApiKey)
    await setSetting('openclaw_api_url', openclawApiUrl)
    await setSetting('system_prompt', systemPrompt)
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
