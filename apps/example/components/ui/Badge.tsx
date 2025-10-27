import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius } from '../../theme/spacing'

type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'neutral'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  size?: BadgeSize
  style?: ViewStyle
}

export function Badge({ label, variant = 'neutral', size = 'md', style }: BadgeProps) {
  return (
    <View style={[styles.base, sizeStyles[size], variantStyles[variant], style]}>
      <Text style={[typography.labelSmall, sizeTextStyles[size], variantTextStyles[variant]]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
})

const sizeStyles: Record<BadgeSize, ViewStyle> = {
  sm: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  md: {
    paddingVertical: spacing.xxs + 1,
    paddingHorizontal: spacing.sm,
  },
}

const sizeTextStyles: Record<BadgeSize, TextStyle> = {
  sm: { fontSize: 11 },
  md: typography.labelSmall,
}

const variantStyles: Record<BadgeVariant, ViewStyle> = {
  primary: {
    backgroundColor: `${colors.primary[500]}15`, // 8% opacity
  },
  success: {
    backgroundColor: `${colors.success[500]}15`,
  },
  error: {
    backgroundColor: `${colors.error[500]}15`,
  },
  warning: {
    backgroundColor: `${colors.warning[500]}15`,
  },
  neutral: {
    backgroundColor: colors.gray[100],
  },
}

const variantTextStyles: Record<BadgeVariant, TextStyle> = {
  primary: {
    color: colors.primary[600],
  },
  success: {
    color: colors.success[700],
  },
  error: {
    color: colors.error[600],
  },
  warning: {
    color: colors.warning[700],
  },
  neutral: {
    color: colors.text.light.secondary,
  },
}
