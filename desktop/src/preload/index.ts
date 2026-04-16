import { contextBridge, ipcRenderer } from 'electron'

export type ElectronAPI = typeof electronAPI

const electronAPI = {
  platform: process.platform,
  db: {
    createConversation: (title?: string) => ipcRenderer.invoke('db:createConversation', title),
    getLatestConversation: () => ipcRenderer.invoke('db:getLatestConversation'),
    getConversations: () => ipcRenderer.invoke('db:getConversations'),
    getConversationsWithPreview: () => ipcRenderer.invoke('db:getConversationsWithPreview'),
    getConversation: (id: number) => ipcRenderer.invoke('db:getConversation', id),
    deleteConversation: (id: number) => ipcRenderer.invoke('db:deleteConversation', id),
    updateConversationTitle: (id: number, title: string) =>
      ipcRenderer.invoke('db:updateConversationTitle', id, title),
    deleteAllConversations: () => ipcRenderer.invoke('db:deleteAllConversations'),
    addMessage: (
      conversationId: number,
      role: string,
      content: string,
      latency?: { sttLatencyMs?: number, llmLatencyMs?: number, ttsLatencyMs?: number },
      providers?: { sttProvider?: string, llmProvider?: string, ttsProvider?: string },
    ) => ipcRenderer.invoke('db:addMessage', conversationId, role, content, latency, providers),
    getMessages: (conversationId: number) => ipcRenderer.invoke('db:getMessages', conversationId),
    getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
    setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),
    getAllSettings: () => ipcRenderer.invoke('db:getAllSettings'),
  },
  screen: {
    getSources: () => ipcRenderer.invoke('screen:getSources'),
  },
  net: {
    healthCheck: (url: string) => ipcRenderer.invoke('net:healthCheck', url) as Promise<{ ok: boolean, error?: string }>,
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
