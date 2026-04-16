import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useConversationContext } from '../lib/conversation-context'
import {
  deleteAllConversations,
  deleteConversation,
  getConversationsWithPreview,
  type ConversationWithPreview,
} from '../lib/db'

type ConversationSection = {
  title: string
  data: ConversationWithPreview[]
}

export function HistoryPage() {
  const [conversations, setConversations] = useState<ConversationWithPreview[]>([])
  const { selectConversation } = useConversationContext()

  const sections = useMemo(() => groupConversationsByDate(conversations), [conversations])

  const loadConversations = useCallback(async () => {
    const result = await getConversationsWithPreview()
    setConversations(result)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Reload periodically, but skip when the window is hidden to avoid wasted DB calls
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadConversations()
      }
    }, 10_000)
    return () => clearInterval(interval)
  }, [loadConversations])

  const handleTap = useCallback(
    (id: number) => {
      selectConversation(id)
    },
    [selectConversation]
  )

  const handleDelete = useCallback(
    async (id: number, title: string) => {
      if (!confirm(`Delete "${title}"?`)) return
      await deleteConversation(id)
      loadConversations()
    },
    [loadConversations]
  )

  const handleClearAll = useCallback(async () => {
    if (!confirm('This will permanently delete all conversations and messages. This cannot be undone.')) return
    await deleteAllConversations()
    loadConversations()
  }, [loadConversations])

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-lg">No conversations yet</p>
        <p className="text-sm mt-1">Start a chat to see your history</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="text-sm text-muted-foreground">
          {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
        </div>
        <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-destructive hover:text-destructive">
          <Trash2 size={14} className="mr-1" />
          Clear All
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="sticky top-0 bg-background py-2 z-10">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {section.title}
              </span>
            </div>
            <div className="space-y-1.5">
              {section.data.map((conv) => (
                <Card
                  key={conv.id}
                  className="p-3 cursor-pointer hover:bg-accent transition-colors group"
                  onClick={() => handleTap(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {getDisplayTitle(conv)}
                      </p>
                      {conv.preview && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {conv.preview}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDate(conv.updated_at)}
                        {conv.message_count > 0 && ` \u00B7 ${conv.message_count} message${conv.message_count === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(conv.id, getDisplayTitle(conv))
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Helper Functions ---

function groupConversationsByDate(conversations: ConversationWithPreview[]): ConversationSection[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86_400_000

  const groups = new Map<string, ConversationWithPreview[]>()

  for (const conversation of conversations) {
    const label = getDateLabel(conversation.updated_at, todayStart, yesterdayStart)
    const existing = groups.get(label)
    if (existing) {
      existing.push(conversation)
    } else {
      groups.set(label, [conversation])
    }
  }

  return Array.from(groups, ([title, data]) => ({ title, data }))
}

function getDateLabel(timestamp: number, todayStart: number, yesterdayStart: number): string {
  if (timestamp >= todayStart) return 'Today'
  if (timestamp >= yesterdayStart) return 'Yesterday'

  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getDisplayTitle(conversation: ConversationWithPreview): string {
  if (conversation.title && conversation.title !== 'New Conversation') {
    return conversation.title
  }
  if (conversation.preview) {
    return conversation.preview.length > 60
      ? conversation.preview.slice(0, 60) + '...'
      : conversation.preview
  }
  return 'New Conversation'
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
