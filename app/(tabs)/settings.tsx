import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { getSetting, setSetting } from '@/db'
import { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'

export default function SettingsScreen() {
  const [vapiApiKey, setVapiApiKey] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [defaultModel, setDefaultModel] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    ;(async () => {
      const key = await getSetting('vapi_api_key')
      const assistant = await getSetting('assistant_id')
      const model = await getSetting('default_model')
      if (key) setVapiApiKey(key)
      if (assistant) setAssistantId(assistant)
      if (model) setDefaultModel(model)
    })()
  }, [])

  const handleSave = async () => {
    await setSetting('vapi_api_key', vapiApiKey)
    await setSetting('assistant_id', assistantId)
    await setSetting('default_model', defaultModel)
    setSaved(true)
    Alert.alert('Settings Saved', 'Your settings have been saved successfully.')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card className="gap-4 p-4">
          <Text className="text-lg font-semibold text-foreground">Vapi Configuration</Text>

          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">API Key</Text>
            <Input
              placeholder="Enter your Vapi API key"
              value={vapiApiKey}
              onChangeText={setVapiApiKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
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
        </Card>

        <Button onPress={handleSave}>
          <Text>{saved ? 'Saved!' : 'Save Settings'}</Text>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
