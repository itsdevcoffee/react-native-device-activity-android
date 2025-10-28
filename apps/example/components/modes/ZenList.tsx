import React, { useMemo, useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { Icon } from '../Icon'
import { SectionHeader } from '../SectionHeader'
import type { AppItem, ThemeTokens, CollapsedState, CategoryOrder } from '../types'

type ZenListProps = {
  apps: AppItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectVisible: (ids: string[]) => void
  onClearVisible: (ids: string[]) => void
  showPackageName: boolean
  disabledIds: string[]
  density: 'compact' | 'comfortable'
  theme: ThemeTokens
  emptyText: string
  collapsibleSections: boolean
  initiallyCollapsed?: Record<string, boolean>
  onToggleSection?: (section: string, collapsed: boolean) => void
  categoryOrder?: CategoryOrder
  showEmptyCategories?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}

type Section = {
  title: string
  data: AppItem[]
  fullData: AppItem[]
}

const AnimatedRow = Animated.createAnimatedComponent(TouchableOpacity)

const ListRow = memo(
  ({
    item,
    isSelected,
    isDisabled,
    onPress,
    rowHeight,
    theme,
    density,
    showPackageName,
  }: {
    item: AppItem
    isSelected: boolean
    isDisabled: boolean
    onPress: () => void
    rowHeight: number
    theme: ThemeTokens
    density: 'compact' | 'comfortable'
    showPackageName: boolean
    index: number
  }) => {
    const scale = useSharedValue(1)

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      backgroundColor: theme.surface,
    }))

    const handlePressIn = () => {
      scale.value = withSpring(0.99, { damping: 20, stiffness: 300 })
    }

    const handlePressOut = () => {
      scale.value = withSpring(1.0, { damping: 20, stiffness: 300 })
    }

    return (
      <View>
        <AnimatedRow
          style={[
            styles.row,
            {
              height: rowHeight,
              opacity: isDisabled ? 0.4 : 1,
            },
            animatedStyle,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          activeOpacity={1}
          accessible
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected, disabled: isDisabled }}
          accessibilityLabel={item.name}
        >
        {/* Content - Checkbox on left */}
        <View style={styles.checkmarkContainer}>
          {isSelected && (
            <View
              style={[
                styles.checkedCircle,
                {
                  backgroundColor: theme.primary,
                },
              ]}
            >
              <Text style={[styles.checkmark, { color: theme.background }]}>✓</Text>
            </View>
          )}
          {!isSelected && (
            <View
              style={[
                styles.uncheckedCircle,
                {
                  borderColor: theme.border,
                },
              ]}
            />
          )}
        </View>

        <View style={styles.iconContainer}>
          <Icon
            uri={item.iconUri}
            name={item.name}
            size={density === 'compact' ? 24 : 28}
            backgroundColor={theme.surfaceElevated}
            textColor={theme.textMuted}
          />
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[
              styles.appName,
              {
                color: theme.text,
                fontSize: density === 'compact' ? 14 : 15,
              },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {showPackageName && item.packageName && (
            <Text style={[styles.packageName, { color: theme.textMuted }]} numberOfLines={1}>
              {item.packageName}
            </Text>
          )}
        </View>

        {/* Hairline divider */}
        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.border,
            },
          ]}
        />
      </AnimatedRow>
      </View>
    )
  }
)

ListRow.displayName = 'ListRow'

export function ZenList({
  apps,
  selectedIds,
  onToggle,
  onSelectVisible,
  onClearVisible,
  showPackageName,
  disabledIds,
  density,
  theme,
  emptyText,
  collapsibleSections,
  initiallyCollapsed = {},
  onToggleSection,
  categoryOrder = 'default',
  showEmptyCategories = true,
  onRefresh,
  refreshing = false,
}: ZenListProps) {
  const [collapsedState, setCollapsedState] = useState<CollapsedState>(initiallyCollapsed)

  // Sync with parent's collapse state when it changes
  useEffect(() => {
    setCollapsedState(initiallyCollapsed)
  }, [initiallyCollapsed])

  const sections = useMemo<Section[]>(() => {
    // Determine category order
    const DEFAULT_ORDER = [
      'Social',
      'Entertainment',
      'Games',
      'Productivity',
      'Music',
      'Photo & Video',
      'Navigation',
      'News',
      'Other',
    ]

    let orderedCategories: string[]
    let allowedCategories: Set<string> | null = null

    if (categoryOrder === 'default') {
      orderedCategories = DEFAULT_ORDER
    } else if (categoryOrder === 'alphabetical') {
      orderedCategories = DEFAULT_ORDER.slice().sort()
    } else {
      // Custom array - deduplicate and use as-is
      orderedCategories = Array.from(new Set(categoryOrder))
      allowedCategories = new Set(orderedCategories)
    }

    // Group apps by category
    const grouped = new Map<string, AppItem[]>()

    // Initialize all categories if showEmptyCategories is true
    if (showEmptyCategories) {
      orderedCategories.forEach((cat) => grouped.set(cat, []))
    }

    // Add apps to categories
    for (const app of apps) {
      const category = app.category || 'Other'

      // Skip if custom ordering and category not in allowed list
      if (allowedCategories && !allowedCategories.has(category)) {
        continue
      }

      const existing = grouped.get(category) || []
      grouped.set(category, [...existing, app])
    }

    // Convert to sections array in the desired order
    return orderedCategories
      .map((title) => {
        const data = grouped.get(title) || []
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name))
        return {
          title,
          fullData: sorted,
          data: collapsibleSections && collapsedState[title] ? [] : sorted,
        }
      })
      .filter((section) => showEmptyCategories || section.fullData.length > 0)
  }, [apps, collapsedState, collapsibleSections, categoryOrder, showEmptyCategories])

  const toggleSection = useCallback(
    (title: string) => {
      const newCollapsed = !collapsedState[title]
      setCollapsedState((prev) => ({ ...prev, [title]: newCollapsed }))
      onToggleSection?.(title, newCollapsed)
    },
    [collapsedState, onToggleSection]
  )

  const rowHeight = density === 'compact' ? 52 : 62

  const renderItem = useCallback(
    ({ item, index }: { item: AppItem; index: number }) => {
      const isSelected = selectedIds.includes(item.id)
      const isDisabled = disabledIds.includes(item.id)

      return (
        <ListRow
          item={item}
          isSelected={isSelected}
          isDisabled={isDisabled}
          onPress={() => !isDisabled && onToggle(item.id)}
          rowHeight={rowHeight}
          theme={theme}
          density={density}
          showPackageName={showPackageName}
          index={index}
        />
      )
    },
    [selectedIds, disabledIds, rowHeight, theme, density, showPackageName, onToggle]
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      const categoryIds = section.fullData.map((a) => a.id)
      const selectedCount = categoryIds.filter((id) => selectedIds.includes(id)).length
      const isCollapsed = collapsedState[section.title] || false

      return (
        <SectionHeader
          title={section.title}
          count={section.fullData.length}
          collapsed={isCollapsed}
          onToggle={() => toggleSection(section.title)}
          selectedCount={selectedCount}
          totalCount={section.fullData.length}
          onSelectVisible={() => onSelectVisible(categoryIds)}
          onClearVisible={() => onClearVisible(categoryIds)}
          theme={theme}
          collapsible={collapsibleSections}
        />
      )
    },
    [
      selectedIds,
      collapsedState,
      toggleSection,
      onSelectVisible,
      onClearVisible,
      theme,
      collapsibleSections,
    ]
  )

  if (sections.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>{emptyText}</Text>
      </View>
    )
  }

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled
      removeClippedSubviews={Platform.OS === 'android'}
      maxToRenderPerBatch={20}
      initialNumToRender={15}
      windowSize={11}
      getItemLayout={(_, index) => ({
        length: rowHeight,
        offset: rowHeight * index,
        index,
      })}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        ) : undefined
      }
      style={{ backgroundColor: theme.background }}
    />
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingLeft: 20,
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  checkedCircle: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: -0.5,
  },
  uncheckedCircle: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    borderWidth: 1.5,
  },
  iconContainer: {
    marginLeft: 10,
  },
  textContainer: {
    flex: 1,
    marginLeft: 11,
    justifyContent: 'center',
  },
  appName: {
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  packageName: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
    opacity: 0.7,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
  },
})

function memo<P>(Component: React.ComponentType<P>): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component)
}
