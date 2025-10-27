import React from 'react'
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius } from '../../theme/spacing'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: ViewStyle
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          props.editable === false && styles.inputDisabled,
          style,
        ]}
        placeholderTextColor={colors.text.light.tertiary}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.labelMedium,
    color: colors.text.light.primary,
    marginBottom: spacing.xxs,
  },
  input: {
    ...typography.bodyMedium,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.text.light.primary,
    minHeight: 44,
  },
  inputError: {
    borderColor: colors.error[500],
  },
  inputDisabled: {
    backgroundColor: colors.gray[100],
    color: colors.text.light.disabled,
  },
  errorText: {
    ...typography.caption,
    color: colors.error[500],
    marginTop: spacing.xxs,
  },
})
