import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'

interface LoadingProps {
  message?: string
  size?: 'small' | 'large'
}

export function Loading({ message, size = 'large' }: LoadingProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary[500]} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  )
}

// Inline loading spinner for buttons and smaller components
export function LoadingSpinner({ size = 'small' }: { size?: 'small' | 'large' }) {
  return <ActivityIndicator size={size} color={colors.primary[500]} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
    marginTop: spacing.md,
  },
})
