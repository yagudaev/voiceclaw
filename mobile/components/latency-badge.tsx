import { Text } from '@/components/ui/text'
import { View } from 'react-native'
import type { Message } from '@/db'

type LatencyBadgeProps = {
  message: Message
}

export function LatencyBadge({ message }: LatencyBadgeProps) {
  if (message.role !== 'assistant') return null
  if (!hasLatencyData(message)) return null

  const totalMs = computeTotalLatency(message)
  const parts: string[] = []
  if (message.stt_latency_ms != null) parts.push(`STT ${formatMs(message.stt_latency_ms)}`)
  if (message.llm_latency_ms != null) parts.push(`LLM ${formatMs(message.llm_latency_ms)}`)
  if (message.tts_latency_ms != null) parts.push(`TTS ${formatMs(message.tts_latency_ms)}`)

  return (
    <View className="mt-1 items-start px-4">
      <Text className="text-xs text-muted-foreground/60">
        {totalMs != null ? formatMs(totalMs) : ''}
        {parts.length > 1 && totalMs != null ? ` (${parts.join(' · ')})` : ''}
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

function computeTotalLatency(message: Message): number | null {
  const values = [
    message.stt_latency_ms,
    message.llm_latency_ms,
    message.tts_latency_ms,
  ].filter((v): v is number => v != null)

  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0)
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}
