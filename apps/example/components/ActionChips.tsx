import React, { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { ThemeTokens } from './types'

type ActionChipsProps = {
  onSelectVisible: () => void
  onClearVisible: () => void
  theme: ThemeTokens
  selectLabel: string
  clearLabel: string
  visible: boolean
}

export const ActionChips = memo(
  ({
    onSelectVisible,
    onClearVisible,
    theme,
    selectLabel,
    clearLabel,
    visible,
  }: ActionChipsProps) => {
    if (!visible) return null

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.chip,
            styles.chipPrimary,
            {
              backgroundColor: `${theme.primary}15`,
              borderColor: theme.primary,
            },
          ]}
          onPress={onSelectVisible}
          accessibilityRole="button"
          accessibilityLabel={selectLabel}
        >
          <Text style={[styles.chipText, { color: theme.primary }]}>
            {selectLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={onClearVisible}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
        >
          <Text style={[styles.chipText, { color: theme.textMuted }]}>
            {clearLabel}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }
)

ActionChips.displayName = 'ActionChips'

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 7,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipPrimary: {},
  chipText: {
    fontSize: 12.5,
    fontWeight: '500',
    letterSpacing: 0,
  },
})
