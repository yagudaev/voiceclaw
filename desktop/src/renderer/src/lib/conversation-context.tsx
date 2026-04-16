import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ConversationContextValue {
  selectedConversationId: number | null
  selectConversation: (id: number | null) => void
}

const ConversationContext = createContext<ConversationContextValue>({
  selectedConversationId: null,
  selectConversation: () => {},
})

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)

  const selectConversation = useCallback((id: number | null) => {
    setSelectedConversationId(id)
  }, [])

  return (
    <ConversationContext.Provider value={{ selectedConversationId, selectConversation }}>
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversationContext() {
  return useContext(ConversationContext)
}
