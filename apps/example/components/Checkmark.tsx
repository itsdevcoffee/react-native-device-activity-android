import React, { memo, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'

const AnimatedPath = Animated.createAnimatedComponent(Path)

type CheckmarkProps = {
  checked: boolean
  color: string
  size?: number
}

export const Checkmark = memo(({ checked, color, size = 22 }: CheckmarkProps) => {
  const progress = useSharedValue(checked ? 1 : 0)
  const scale = useSharedValue(checked ? 1 : 0)

  useEffect(() => {
    if (checked) {
      progress.value = withTiming(1, {
        duration: 180,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      })
      scale.value = withSpring(1, {
        damping: 14,
        stiffness: 280,
      })
    } else {
      progress.value = withTiming(0, {
        duration: 120,
        easing: Easing.in(Easing.quad),
      })
      scale.value = withTiming(0, {
        duration: 100,
      })
    }
  }, [checked, progress, scale])

  const animatedProps = useAnimatedProps(() => {
    const pathLength = 24 // Approximate path length
    return {
      strokeDashoffset: pathLength * (1 - progress.value),
      opacity: scale.value,
      transform: [{ scale: scale.value }],
    }
  })

  // Checkmark path (optimized for 24x24 viewBox)
  const checkPath = 'M5 12l5 5L19 7'

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={styles.svg}>
      <AnimatedPath
        d={checkPath}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={24}
        animatedProps={animatedProps}
      />
    </Svg>
  )
})

Checkmark.displayName = 'Checkmark'

const styles = StyleSheet.create({
  svg: {},
})
