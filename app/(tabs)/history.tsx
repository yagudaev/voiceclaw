import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { getConversations, deleteConversation, type Conversation } from '@/db'
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

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
          <Pressable onLongPress={() => handleDelete(item.id, item.title)}>
            <Card className="p-4">
              <Text className="text-base font-medium text-foreground">{item.title}</Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                {formatDate(item.updated_at)}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  )
}
