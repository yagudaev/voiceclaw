import { getSummary, saveSummary } from '@/db'
import type { Message } from '@/db'

type ChatMessage = { role: string, content: string }

const COMPACT_THRESHOLD = 20
const KEEP_RECENT = 10

export async function compactMessages(
  conversationId: number,
  messages: Message[],
  apiKey: string,
  model: string,
  apiUrl: string
): Promise<ChatMessage[]> {
  const chatMessages = messages.map((m) => ({ role: m.role, content: m.content }))

  if (chatMessages.length <= COMPACT_THRESHOLD) {
    return prependCachedSummary(conversationId, chatMessages)
  }

  try {
    const cached = await getSummary(conversationId)
    if (cached && cached.message_count === messages.length) {
      return buildCompactedMessages(cached.summary, chatMessages.slice(-KEEP_RECENT))
    }

    const recentMessages = chatMessages.slice(-KEEP_RECENT)

    if (cached) {
      const prevSummarizedUpTo = cached.message_count - KEEP_RECENT
      const newSummarizedUpTo = messages.length - KEEP_RECENT
      const newOldMessages = chatMessages.slice(prevSummarizedUpTo, newSummarizedUpTo)

      if (newOldMessages.length === 0) {
        return buildCompactedMessages(cached.summary, recentMessages)
      }

      const summary = await generateSummary(cached.summary, newOldMessages, apiKey, model, apiUrl, conversationId)
      await saveSummary(conversationId, summary, messages.length)
      return buildCompactedMessages(summary, recentMessages)
    }

    const oldMessages = chatMessages.slice(0, -KEEP_RECENT)
    const summary = await generateSummary('', oldMessages, apiKey, model, apiUrl, conversationId)
    await saveSummary(conversationId, summary, messages.length)

    return buildCompactedMessages(summary, recentMessages)
  } catch (e) {
    console.warn('Compaction failed, sending full history:', e)
    return chatMessages
  }
}

// --- Helper Functions ---

async function prependCachedSummary(
  conversationId: number,
  chatMessages: ChatMessage[]
): Promise<ChatMessage[]> {
  const cached = await getSummary(conversationId)
  if (!cached) return chatMessages
  return buildCompactedMessages(cached.summary, chatMessages)
}

function buildCompactedMessages(summary: string, recentMessages: ChatMessage[]): ChatMessage[] {
  return [
    { role: 'system', content: `Previous conversation summary: ${summary}` },
    ...recentMessages,
  ]
}

async function generateSummary(
  existingSummary: string,
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  apiUrl: string,
  conversationId: number
): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')

  const prompt = existingSummary
    ? `Here is an existing summary of an earlier part of the conversation:\n${existingSummary}\n\nHere are additional messages to incorporate:\n${transcript}\n\nProvide a concise updated summary of the full conversation so far. Focus on key topics, decisions, and any important context. Keep it under 300 words.`
    : `Summarize this conversation concisely. Focus on key topics, decisions, and important context. Keep it under 300 words.\n\n${transcript}`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes conversations. Be concise and preserve key details.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
      user: `voiceclaw:${conversationId}`,
    }),
  })

  if (!response.ok) {
    throw new Error(`Summary API returned ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'Unable to generate summary.'
}
