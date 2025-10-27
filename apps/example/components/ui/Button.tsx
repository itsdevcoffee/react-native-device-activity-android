import React from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius } from '../../theme/spacing'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'danger'
              ? colors.gray[50]
              : colors.primary[500]
          }
        />
      ) : (
        <Text
          style={[
            typography.buttonMedium,
            sizeTextStyles[size],
            variantTextStyles[variant],
            isDisabled && styles.disabledText,
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
})

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 32,
  },
  md: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
}

const sizeTextStyles: Record<ButtonSize, TextStyle> = {
  sm: typography.buttonSmall,
  md: typography.buttonMedium,
  lg: typography.buttonLarge,
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.primary[500],
  },
  secondary: {
    backgroundColor: colors.gray[100],
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.border.light,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error[500],
  },
}

const variantTextStyles: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: colors.gray[50],
  },
  secondary: {
    color: colors.text.light.primary,
  },
  outline: {
    color: colors.primary[500],
  },
  ghost: {
    color: colors.primary[500],
  },
  danger: {
    color: colors.gray[50],
  },
}
