import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type ConversationContextType = {
  selectedConversationId: number | null
  selectConversation: (id: number) => void
  clearSelection: () => void
}

const ConversationContext = createContext<ConversationContextType>({
  selectedConversationId: null,
  selectConversation: () => {},
  clearSelection: () => {},
})

export function useConversationContext() {
  return useContext(ConversationContext)
}

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)

  const selectConversation = useCallback((id: number) => {
    setSelectedConversationId(id)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedConversationId(null)
  }, [])

  return (
    <ConversationContext.Provider value={{ selectedConversationId, selectConversation, clearSelection }}>
      {children}
    </ConversationContext.Provider>
  )
}
