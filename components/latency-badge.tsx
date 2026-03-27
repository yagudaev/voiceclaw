import { Text } from '@/components/ui/text'
import { View } from 'react-native'
import type { Message } from '@/db'

type LatencyBadgeProps = {
  message: Message
}

export function LatencyBadge({ message }: LatencyBadgeProps) {
  if (!hasLatencyData(message)) return null

  const parts: string[] = []
  if (message.stt_latency_ms != null) parts.push(`STT: ${formatMs(message.stt_latency_ms)}`)
  if (message.llm_latency_ms != null) parts.push(`LLM: ${formatMs(message.llm_latency_ms)}`)
  if (message.tts_latency_ms != null) parts.push(`TTS: ${formatMs(message.tts_latency_ms)}`)

  return (
    <View className="mt-1 px-4">
      <Text className="text-xs text-muted-foreground/60">
        {parts.join(' | ')}
      </Text>
    </View>
  )
}

// --- Helper Functions ---

function hasLatencyData(message: Message): boolean {
  return (
    message.stt_latency_ms != null ||
    message.llm_latency_ms != null ||
    message.tts_latency_ms != null
  )
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}
