import { useEffect, useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { ChatPage } from './pages/ChatPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { ConversationProvider } from './lib/conversation-context'
import { useTheme } from './lib/use-theme'

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  // Initialize theme system (applies dark/light class to html)
  useTheme()

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return

      switch (e.key) {
        case ',':
          e.preventDefault()
          setActiveTab('settings')
          break
        case '1':
          e.preventDefault()
          setActiveTab('chat')
          break
        case '2':
          e.preventDefault()
          setActiveTab('history')
          break
        case '3':
          e.preventDefault()
          setActiveTab('settings')
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <ConversationProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'chat' && <ChatPage />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </ConversationProvider>
  )
}
