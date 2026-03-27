import { SwipeableRow } from '@/components/swipeable-row'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { deleteAllConversations, deleteConversation, getConversationsWithPreview, type ConversationWithPreview } from '@/db'
import { useConversationContext } from '@/lib/conversation-context'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, SectionList, View } from 'react-native'

type ConversationSection = {
  title: string
  data: ConversationWithPreview[]
}

export default function HistoryScreen() {
  const [conversations, setConversations] = useState<ConversationWithPreview[]>([])
  const { selectConversation } = useConversationContext()
  const router = useRouter()

  const sections = useMemo(() => groupConversationsByDate(conversations), [conversations])

  const loadConversations = useCallback(async () => {
    const result = await getConversationsWithPreview()
    setConversations(result)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Reload when screen comes into focus
  useEffect(() => {
    const interval = setInterval(loadConversations, 2000)
    return () => clearInterval(interval)
  }, [loadConversations])

  const handleTap = useCallback(
    (id: number) => {
      selectConversation(id)
      router.navigate('/(tabs)')
    },
    [selectConversation, router]
  )

  const handleDelete = useCallback(
    (id: number, title: string) => {
      Alert.alert('Delete Conversation', `Delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteConversation(id)
            loadConversations()
          },
        },
      ])
    },
    [loadConversations]
  )

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all conversations and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllConversations()
            loadConversations()
          },
        },
      ]
    )
  }, [loadConversations])

  if (conversations.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-lg text-muted-foreground">No conversations yet</Text>
        <Text className="mt-1 text-sm text-muted-foreground">Start a chat to see your history</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <Pressable onPress={handleClearAll} className="mb-2 self-end">
            <Text className="text-sm font-medium text-destructive">Clear All</Text>
          </Pressable>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View className="bg-background pb-2 pt-4">
            <Text className="text-sm font-semibold text-muted-foreground">{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View className="py-1">
            <SwipeableRow onDelete={() => handleDelete(item.id, getDisplayTitle(item))}>
              <Pressable onPress={() => handleTap(item.id)}>
                <Card className="p-4">
                  <Text className="text-base font-medium text-foreground" numberOfLines={1}>
                    {getDisplayTitle(item)}
                  </Text>
                  {item.preview && (
                    <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
                      {item.preview}
                    </Text>
                  )}
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {formatDate(item.updated_at)}
                    {item.message_count > 0 ? ` \u00B7 ${item.message_count} message${item.message_count === 1 ? '' : 's'}` : ''}
                  </Text>
                </Card>
              </Pressable>
            </SwipeableRow>
          </View>
        )}
      />
    </View>
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
