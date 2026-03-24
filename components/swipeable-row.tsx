import { Text } from '@/components/ui/text'
import { useRef } from 'react'
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native'

type SwipeableRowProps = {
  onDelete: () => void
  children: React.ReactNode
}

const DELETE_BUTTON_WIDTH = 80
const SWIPE_THRESHOLD = -60

export function SwipeableRow({ onDelete, children }: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current
  const isOpen = useRef(false)

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
      },
      onPanResponderMove: (_, gestureState) => {
        const base = isOpen.current ? -DELETE_BUTTON_WIDTH : 0
        const newValue = Math.min(0, Math.max(-DELETE_BUTTON_WIDTH, base + gestureState.dx))
        translateX.setValue(newValue)
      },
      onPanResponderRelease: (_, gestureState) => {
        const base = isOpen.current ? -DELETE_BUTTON_WIDTH : 0
        const finalPosition = base + gestureState.dx

        if (finalPosition < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -DELETE_BUTTON_WIDTH,
            useNativeDriver: true,
            bounciness: 0,
          }).start()
          isOpen.current = true
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start()
          isOpen.current = false
        }
      },
    })
  ).current

  const close = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start()
    isOpen.current = false
  }

  return (
    <View style={styles.container}>
      <View style={styles.deleteContainer}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => {
            close()
            onDelete()
          }}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.content, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  deleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    width: '100%',
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    backgroundColor: 'transparent',
  },
})
