import React, { useEffect } from 'react'
import { Text, StyleSheet, Animated } from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius, elevation } from '../../theme/spacing'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  visible: boolean
  duration?: number
  onHide?: () => void
}

export function Toast({
  message,
  type = 'info',
  visible,
  duration = 3000,
  onHide,
}: ToastProps) {
  const opacity = React.useRef(new Animated.Value(0)).current
  const translateY = React.useRef(new Animated.Value(-20)).current

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()

      // Auto-hide after duration
      const timer = setTimeout(() => {
        hideToast()
      }, duration)

      return () => clearTimeout(timer)
    } else {
      hideToast()
    }
  }, [visible])

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.()
    })
  }

  if (!visible && opacity._value === 0) return null

  return (
    <Animated.View
      style={[
        styles.container,
        typeStyles[type],
        elevation.high,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.icon}>{typeIcons[type]}</Text>
      <Text style={[styles.message, typeTextStyles[type]]}>{message}</Text>
    </Animated.View>
  )
}

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xxxxl,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    zIndex: 9999,
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  message: {
    ...typography.bodyMedium,
    flex: 1,
  },
})

const typeStyles: Record<ToastType, any> = {
  success: {
    backgroundColor: colors.success[500],
  },
  error: {
    backgroundColor: colors.error[500],
  },
  warning: {
    backgroundColor: colors.warning[500],
  },
  info: {
    backgroundColor: colors.primary[500],
  },
}

const typeTextStyles: Record<ToastType, any> = {
  success: {
    color: colors.gray[50],
  },
  error: {
    color: colors.gray[50],
  },
  warning: {
    color: colors.gray[900],
  },
  info: {
    color: colors.gray[50],
  },
}
