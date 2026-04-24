import { MessageCircle, Clock, Settings } from 'lucide-react'
import { VoiceClawMark } from './brand/VoiceClawMark'

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
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/90 backdrop-blur">
      {/* macOS traffic light spacer */}
      <div className="w-16 drag-region" />

      <div className="no-drag mr-2 flex items-center gap-2 text-foreground">
        <span className="flex size-8 items-center justify-center rounded-md border border-border bg-background">
          <VoiceClawMark className="size-5" accent />
        </span>
        <span className="text-sm font-semibold">VoiceClaw</span>
      </div>

      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              no-drag flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium
              transition-colors duration-150
              ${isActive
                ? 'border-primary/40 bg-accent text-accent-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
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
