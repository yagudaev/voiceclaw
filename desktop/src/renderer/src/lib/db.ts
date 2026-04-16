// Typed wrapper around the Electron IPC bridge for database operations.
// Mirrors the mobile app's DB API (mobile/db/index.ts) so the same
// patterns work in both clients.

export type Conversation = {
  id: number
  title: string
  created_at: number
  updated_at: number
}

export type ConversationWithPreview = Conversation & {
  preview: string | null
  message_count: number
}

export type Message = {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: number
  stt_latency_ms: number | null
  llm_latency_ms: number | null
  tts_latency_ms: number | null
  stt_provider: string | null
  llm_provider: string | null
  tts_provider: string | null
}

export type LatencyData = {
  sttLatencyMs?: number
  llmLatencyMs?: number
  ttsLatencyMs?: number
}

export type ProviderInfo = {
  sttProvider?: string
  llmProvider?: string
  ttsProvider?: string
}

declare global {
  interface Window {
    electronAPI: {
      platform: string
      db: {
        createConversation: (title?: string) => Promise<Conversation>
        getLatestConversation: () => Promise<Conversation | null>
        getConversations: () => Promise<Conversation[]>
        getConversationsWithPreview: () => Promise<ConversationWithPreview[]>
        getConversation: (id: number) => Promise<Conversation | null>
        deleteConversation: (id: number) => Promise<void>
        updateConversationTitle: (id: number, title: string) => Promise<void>
        deleteAllConversations: () => Promise<void>
        addMessage: (
          conversationId: number,
          role: string,
          content: string,
          latency?: LatencyData,
          providers?: ProviderInfo,
        ) => Promise<Message>
        getMessages: (conversationId: number) => Promise<Message[]>
        getSetting: (key: string) => Promise<string | null>
        setSetting: (key: string, value: string) => Promise<void>
        getAllSettings: () => Promise<Record<string, string>>
      }
      net: {
        healthCheck: (url: string) => Promise<{ ok: boolean, error?: string }>
      }
    }
  }
}

const api = () => window.electronAPI.db

export async function createConversation(title?: string): Promise<Conversation> {
  return api().createConversation(title)
}

export async function getLatestConversation(): Promise<Conversation | null> {
  return api().getLatestConversation()
}

export async function getConversations(): Promise<Conversation[]> {
  return api().getConversations()
}

export async function getConversationsWithPreview(): Promise<ConversationWithPreview[]> {
  return api().getConversationsWithPreview()
}

export async function getConversation(id: number): Promise<Conversation | null> {
  return api().getConversation(id)
}

export async function deleteConversation(id: number): Promise<void> {
  return api().deleteConversation(id)
}

export async function updateConversationTitle(id: number, title: string): Promise<void> {
  return api().updateConversationTitle(id, title)
}

export async function deleteAllConversations(): Promise<void> {
  return api().deleteAllConversations()
}

export async function addMessage(
  conversationId: number,
  role: 'user' | 'assistant',
  content: string,
  latency?: LatencyData,
  providers?: ProviderInfo,
): Promise<Message> {
  return api().addMessage(conversationId, role, content, latency, providers)
}

export async function getMessages(conversationId: number): Promise<Message[]> {
  return api().getMessages(conversationId)
}

export async function getSetting(key: string): Promise<string | null> {
  return api().getSetting(key)
}

export async function setSetting(key: string, value: string): Promise<void> {
  return api().setSetting(key, value)
}

export async function getAllSettings(): Promise<Record<string, string>> {
  return api().getAllSettings()
}
