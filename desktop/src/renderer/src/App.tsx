import { useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { ChatPage } from './pages/ChatPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { useTheme } from './lib/use-theme'

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  // Initialize theme system (applies dark/light class to html)
  useTheme()

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'chat' && <ChatPage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
