import { getConversation, getMessages, updateConversationTitle } from '@/db'
import { getApiConfig } from './chat'

const TITLE_PROMPT = `Summarize this conversation in 3-5 words as a title. Return only the title, nothing else. No quotes, no punctuation at the end.`

export async function maybeGenerateTitle(conversationId: number) {
  try {
    const conv = await getConversation(conversationId)
    if (!conv || conv.title !== 'New Conversation') return

    const msgs = await getMessages(conversationId)
    if (msgs.length < 3) return

    const { apiKey, model, apiUrl } = await getApiConfig()
    if (!apiKey || !apiUrl) return

    const title = await generateTitle(
      msgs.slice(0, 6).map((m) => ({ role: m.role, content: m.content })),
      apiKey,
      model,
      apiUrl,
    )

    await updateConversationTitle(conversationId, title)
  } catch (e) {
    console.warn('[TitleGen] Failed, falling back to timestamp:', e)
    try {
      const fallback = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      await updateConversationTitle(conversationId, fallback)
    } catch {}
  }
}

// --- Helper Functions ---

async function generateTitle(
  messages: Array<{ role: string, content: string }>,
  apiKey: string,
  model: string,
  apiUrl: string,
): Promise<string> {
  const body = {
    model,
    messages: [
      { role: 'system', content: TITLE_PROMPT },
      ...messages,
      { role: 'user', content: 'Generate a short title for this conversation.' },
    ],
    stream: false,
    max_tokens: 30,
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Title API returned ${response.status}`)
  }

  const data = await response.json()
  const title = data.choices?.[0]?.message?.content?.trim()

  if (!title) {
    throw new Error('No title in response')
  }

  return title.replace(/^["']|["']$/g, '').replace(/\.+$/, '')
}
