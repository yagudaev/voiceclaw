import { SwipeableRow } from '@/components/swipeable-row'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { deleteAllConversations, deleteConversation, getConversations, type Conversation } from '@/db'
import { useCallback, useEffect, useState } from 'react'
import { Alert, FlatList, Pressable, View } from 'react-native'

export default function HistoryScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([])

  const loadConversations = useCallback(async () => {
    const result = await getConversations()
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
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <Pressable onPress={handleClearAll} className="mb-2 self-end">
            <Text className="text-sm font-medium text-destructive">Clear All</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <SwipeableRow onDelete={() => handleDelete(item.id, item.title)}>
            <Card className="p-4">
              <Text className="text-base font-medium text-foreground">{item.title}</Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                {formatDate(item.updated_at)}
              </Text>
            </Card>
          </SwipeableRow>
        )}
      />
    </View>
  )
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
