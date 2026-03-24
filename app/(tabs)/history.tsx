import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { deleteConversation, getConversationsWithPreview, type ConversationWithPreview } from '@/db'
import { useConversationContext } from '@/lib/conversation-context'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, FlatList, Pressable, View } from 'react-native'

export default function HistoryScreen() {
  const [conversations, setConversations] = useState<ConversationWithPreview[]>([])
  const { selectConversation } = useConversationContext()
  const router = useRouter()

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
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleTap(item.id)}
            onLongPress={() => handleDelete(item.id, getDisplayTitle(item))}
          >
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
        )}
      />
    </View>
  )
}

// --- Helper Functions ---

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
