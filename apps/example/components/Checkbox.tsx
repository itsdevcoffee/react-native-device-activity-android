import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

type CheckboxProps = {
  checked: boolean
  color: string
  size?: number
  style?: ViewStyle
}

export function Checkbox({ checked, color, size = 24, style }: CheckboxProps) {
  const scale = useSharedValue(checked ? 1 : 0.95)
  const opacity = useSharedValue(checked ? 1 : 0)

  useEffect(() => {
    scale.value = withSpring(checked ? 1 : 0.95, {
      damping: 12,
      stiffness: 280,
    })
    opacity.value = withTiming(checked ? 1 : 0, { duration: 110 })
  }, [checked, scale, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: checked ? color : '#242a33',
          backgroundColor: checked ? color : 'transparent',
        },
        animatedStyle,
        style,
      ]}
    >
      <Animated.View style={checkmarkStyle}>
        <Text style={[styles.checkmark, { fontSize: size * 0.58 }]}>✓</Text>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontWeight: 'bold',
  },
})
