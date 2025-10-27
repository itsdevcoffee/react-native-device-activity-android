import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors } from '../../theme/colors'
import { spacing, borderRadius, elevation } from '../../theme/spacing'

interface CardProps {
  children: React.ReactNode
  elevated?: boolean
  padding?: keyof typeof spacing
  style?: ViewStyle
}

export function Card({ children, elevated = true, padding = 'md', style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && elevation.medium,
        { padding: spacing[padding] },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.light,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
})
