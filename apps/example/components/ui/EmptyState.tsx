import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="outline"
          style={styles.button}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxxl,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headingMedium,
    color: colors.text.light.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    marginTop: spacing.md,
  },
})
