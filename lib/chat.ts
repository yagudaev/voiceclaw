import { getSetting } from '@/db'
import EventSource from 'react-native-sse'

const SYSTEM_PROMPT = 'You are a helpful assistant. Keep responses concise and conversational.'

type ChatMessage = { role: string, content: string }

export function streamCompletion(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  apiUrl: string,
  {
    onToken,
    onDone,
    onError,
  }: {
    onToken: (fullText: string) => void
    onDone: (fullText: string) => void
    onError: (error: string) => void
  }
) {
  const chatMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ]

  const es = new EventSource(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages: chatMessages, stream: true }),
  })

  let fullText = ''

  es.addEventListener('message', (event: any) => {
    if (event.data === '[DONE]') {
      es.close()
      onDone(fullText)
      return
    }

    try {
      const delta = JSON.parse(event.data).choices?.[0]?.delta?.content
      if (delta) {
        fullText += delta
        onToken(fullText)
      }
    } catch {}
  })

  es.addEventListener('error', (event: any) => {
    es.close()
    onError(event?.message || 'Stream failed')
  })

  return () => es.close()
}

export async function getApiConfig() {
  const apiKey = await getSetting('openclaw_api_key')
  const model = (await getSetting('default_model')) || 'openclaw:voice'
  const apiUrl = await getSetting('openclaw_api_url')
  return { apiKey, model, apiUrl }
}
