import React, { memo, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated'
import type { ThemeTokens } from './types'

type SectionHeaderProps = {
  title: string
  count: number
  collapsed: boolean
  onToggle: () => void
  selectedCount: number
  totalCount: number
  onSelectVisible: () => void
  onClearVisible: () => void
  theme: ThemeTokens
  collapsible?: boolean
  isSticky?: boolean
}

// Category icon mapping with colorful emojis
const categoryIcons: Record<string, string> = {
  Social: '👥',
  Entertainment: '🎬',
  Games: '🎮',
  Productivity: '💼',
  Music: '🎵',
  'Photo & Video': '📸',
  Navigation: '🗺️',
  News: '📰',
  Other: '📱',
}

export const SectionHeader = memo(
  ({
    title,
    count,
    collapsed,
    onToggle,
    selectedCount,
    totalCount,
    onSelectVisible,
    onClearVisible,
    theme,
    collapsible = true,
    isSticky = false,
  }: SectionHeaderProps) => {
    const rotation = useSharedValue(collapsed ? 0 : 1)

    useEffect(() => {
      rotation.value = withSpring(collapsed ? 0 : 1, {
        damping: 18,
        stiffness: 320,
      })
    }, [collapsed, rotation])

    const chevronStyle = useAnimatedStyle(() => ({
      transform: [
        {
          rotate: `${interpolate(rotation.value, [0, 1], [0, 90])}deg`,
        },
      ],
    }))

    const allSelected = selectedCount === totalCount && totalCount > 0
    const someSelected = selectedCount > 0 && selectedCount < totalCount

    const handleCheckboxPress = () => {
      if (allSelected) {
        onClearVisible()
      } else {
        onSelectVisible()
      }
    }

    // Determine checkbox background based on light/dark theme
    const isLightTheme = theme.text === '#202425'
    const checkboxBgColor = isLightTheme
      ? allSelected || someSelected
        ? theme.primary
        : 'transparent'
      : allSelected || someSelected
      ? theme.primary
      : 'transparent'

    const categoryIcon = categoryIcons[title] || categoryIcons.Other

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: theme.shadow.low,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          },
        ]}
      >
        {/* Checkbox - isolated touch area */}
        <TouchableOpacity
          style={[
            styles.checkbox,
            {
              backgroundColor: checkboxBgColor,
              borderColor: allSelected || someSelected ? theme.primary : theme.border,
              opacity: totalCount === 0 ? 0.3 : 1,
            },
          ]}
          onPress={handleCheckboxPress}
          disabled={totalCount === 0}
          accessibilityRole="checkbox"
          accessibilityState={{
            checked: allSelected,
            disabled: totalCount === 0,
          }}
          accessibilityLabel={
            totalCount === 0
              ? 'No apps in category'
              : allSelected
              ? 'Deselect all'
              : someSelected
              ? 'Select all'
              : 'Select all'
          }
        >
          {allSelected && (
            <Text style={[styles.checkmark, { color: theme.background }]}>✓</Text>
          )}
          {someSelected && (
            <View
              style={[
                styles.indeterminate,
                {
                  backgroundColor: theme.background,
                },
              ]}
            />
          )}
        </TouchableOpacity>

        {/* Rest of header - tappable to toggle collapse */}
        <TouchableOpacity
          style={styles.toggleArea}
          onPress={onToggle}
          disabled={!collapsible}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${count} apps, ${collapsed ? 'collapsed' : 'expanded'}`}
        >
          {/* Category Icon */}
          <Text style={styles.categoryIcon}>{categoryIcon}</Text>

          {/* Title + Count */}
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                {
                  color: theme.text,
                  opacity: 0.85,
                },
              ]}
              numberOfLines={1}
            >
              {title.toUpperCase()}
            </Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isLightTheme
                    ? 'rgba(0,0,0,0.06)'
                    : 'rgba(255,255,255,0.08)',
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: theme.textMuted }]}>{count}</Text>
            </View>
          </View>

          {/* Chevron */}
          {collapsible && (
            <View style={styles.chevronContainer}>
              <Animated.Text style={[styles.chevron, { color: theme.textMuted }, chevronStyle]}>
                ›
              </Animated.Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Hairline divider inset 16 */}
        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.border,
            },
          ]}
        />
      </View>
    )
  }
)

SectionHeader.displayName = 'SectionHeader'

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    minHeight: 44,
    position: 'relative',
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: -0.5,
  },
  indeterminate: {
    width: 9,
    height: 2,
    borderRadius: 1,
  },
  toggleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 9,
  },
  categoryIcon: {
    fontSize: 17,
    lineHeight: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 7,
    marginLeft: 5,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    opacity: 0.7,
  },
  chevronContainer: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chevron: {
    fontSize: 17,
    fontWeight: '600',
    width: 17,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth,
  },
})
