import { MessageCircle, Clock, Settings } from 'lucide-react'

export type TabId = 'chat' | 'history' | 'settings'

interface TabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const tabs: { id: TabId, label: string, icon: typeof MessageCircle }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card">
      {/* macOS traffic light spacer */}
      <div className="w-16 drag-region" />

      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              no-drag flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-colors duration-150
              ${isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }
            `}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        )
      })}

      <div className="flex-1 drag-region h-full" />
    </div>
  )
}
