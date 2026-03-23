import { getSetting } from '@/db'

const VAPI_BASE_URL = 'https://api.vapi.ai'

export type VapiChatResponse = {
  id: string
  assistantId?: string
  sessionId?: string
  messages?: Array<{ role: string, content: string }>
  output?: Array<{ role: string, content: string }>
  createdAt?: string
  updatedAt?: string
}

export type VapiSessionResponse = {
  id: string
  assistantId?: string
  name?: string
  createdAt?: string
}

export async function createVapiSession(assistantId: string): Promise<VapiSessionResponse | null> {
  const token = await getVapiToken()
  if (!token) return null

  try {
    const response = await fetch(`${VAPI_BASE_URL}/session`, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify({ assistantId }),
    })

    if (!response.ok) {
      console.warn('[VapiChat] Failed to create session:', response.status)
      return null
    }

    return await response.json()
  } catch (e) {
    console.warn('[VapiChat] Error creating session:', e)
    return null
  }
}

export async function sendVapiChat(
  input: string,
  opts: {
    assistantId?: string
    sessionId?: string
    previousChatId?: string
  } = {}
): Promise<VapiChatResponse | null> {
  const token = await getVapiToken()
  if (!token) return null

  const assistantId = opts.assistantId || (await getSetting('assistant_id'))
  if (!assistantId) {
    console.warn('[VapiChat] No assistant ID configured')
    return null
  }

  const body: Record<string, unknown> = {
    assistantId,
    input,
  }

  if (opts.sessionId) body.sessionId = opts.sessionId
  if (opts.previousChatId) body.previousChatId = opts.previousChatId

  try {
    const response = await fetch(`${VAPI_BASE_URL}/chat`, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.warn('[VapiChat] Failed to send chat:', response.status)
      return null
    }

    return await response.json()
  } catch (e) {
    console.warn('[VapiChat] Error sending chat:', e)
    return null
  }
}

export async function getVapiChat(chatId: string): Promise<VapiChatResponse | null> {
  const token = await getVapiToken()
  if (!token) return null

  try {
    const response = await fetch(`${VAPI_BASE_URL}/chat/${chatId}`, {
      headers: buildHeaders(token),
    })

    if (!response.ok) return null
    return await response.json()
  } catch (e) {
    console.warn('[VapiChat] Error fetching chat:', e)
    return null
  }
}

export async function syncMessagesToVapi(
  messages: Array<{ role: string, content: string }>,
  opts: {
    assistantId?: string
    sessionId?: string
  } = {}
): Promise<{ sessionId: string | null, lastChatId: string | null }> {
  const token = await getVapiToken()
  if (!token) return { sessionId: null, lastChatId: null }

  const assistantId = opts.assistantId || (await getSetting('assistant_id'))
  if (!assistantId) return { sessionId: null, lastChatId: null }

  let sessionId = opts.sessionId || null
  let lastChatId: string | null = null

  // Create session if we don't have one
  if (!sessionId) {
    const session = await createVapiSession(assistantId)
    sessionId = session?.id || null
  }

  // Send each user message to build the conversation chain
  const userMessages = messages.filter((m) => m.role === 'user')
  for (const msg of userMessages) {
    const chatResponse = await sendVapiChat(msg.content, {
      assistantId,
      sessionId: sessionId || undefined,
      previousChatId: lastChatId || undefined,
    })

    if (chatResponse?.id) {
      lastChatId = chatResponse.id
      if (!sessionId && chatResponse.sessionId) {
        sessionId = chatResponse.sessionId
      }
    }
  }

  return { sessionId, lastChatId }
}

// --- Helper Functions ---

async function getVapiToken(): Promise<string | null> {
  return getSetting('vapi_api_key')
}

function buildHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}
