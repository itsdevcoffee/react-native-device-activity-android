import React, { useMemo, useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ScrollView,
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

type CardGridProps = {
  apps: AppItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectVisible: (ids: string[]) => void
  onClearVisible: (ids: string[]) => void
  disabledIds: string[]
  density: 'compact' | 'comfortable'
  theme: ThemeTokens
  emptyText: string
  columns?: number
  showCategoryFilterRail?: boolean
  groupBy?: 'category' | 'none'
  collapsibleSections?: boolean
  initiallyCollapsed?: Record<string, boolean>
  onToggleSection?: (section: string, collapsed: boolean) => void
  categoryOrder?: CategoryOrder
  showEmptyCategories?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}

type Section = {
  title: string
  data: AppItem[][]
  fullData: AppItem[]
}

const AnimatedTile = Animated.createAnimatedComponent(TouchableOpacity)

const GridTile = React.memo(
  ({
    app,
    isSelected,
    isDisabled,
    onPress,
    density,
    theme,
  }: {
    app: AppItem
    isSelected: boolean
    isDisabled: boolean
    onPress: () => void
    density: 'compact' | 'comfortable'
    theme: ThemeTokens
    index: number
  }) => {
    const scale = useSharedValue(1)

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }))

    const handlePressIn = () => {
      scale.value = withSpring(0.98, { damping: 20, stiffness: 300 })
    }

    const handlePressOut = () => {
      scale.value = withSpring(1.0, { damping: 20, stiffness: 300 })
    }

    const iconSize = density === 'compact' ? 60 : 68

    return (
      <AnimatedTile
        style={[styles.tileWrapper, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        accessible
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected, disabled: isDisabled }}
        accessibilityLabel={app.name}
      >
        <View style={styles.tileContent}>
          <View
            style={[
              styles.iconContainer,
              {
                opacity: isDisabled ? 0.4 : 1,
              },
            ]}
          >
            <Icon
              uri={app.iconUri}
              name={app.name}
              size={iconSize}
              borderRadius={iconSize * 0.225}
              backgroundColor={theme.surfaceElevated}
              textColor={theme.textMuted}
            />

            {/* Checkbox badge overlay - top right corner */}
            {isSelected && (
              <View
                style={[
                  styles.checkboxBadge,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={[styles.checkmark, { color: theme.background }]}>✓</Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedTile>
    )
  }
)

GridTile.displayName = 'GridTile'

export function CardGrid({
  apps,
  selectedIds,
  onToggle,
  onSelectVisible,
  onClearVisible,
  disabledIds,
  density,
  theme,
  emptyText,
  columns: columnsProp,
  showCategoryFilterRail = true,
  groupBy = 'category',
  collapsibleSections = true,
  initiallyCollapsed = {},
  onToggleSection,
  categoryOrder = 'default',
  showEmptyCategories = true,
  onRefresh,
  refreshing = false,
}: CardGridProps) {
  const { width } = useWindowDimensions()
  const [collapsedState, setCollapsedState] = useState<CollapsedState>(initiallyCollapsed)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Sync with parent's collapse state when it changes
  useEffect(() => {
    setCollapsedState(initiallyCollapsed)
  }, [initiallyCollapsed])

  const columns = useMemo(() => {
    if (columnsProp) return columnsProp
    // Icon grid: 4 per row on all sizes
    return 4
  }, [width, columnsProp])

  const sections = useMemo<Section[]>(() => {
    const filteredApps = categoryFilter
      ? apps.filter((a) => a.category === categoryFilter)
      : apps

    if (groupBy === 'none') {
      const sorted = filteredApps.sort((a, b) => a.name.localeCompare(b.name))
      const chunks: AppItem[][] = []
      for (let i = 0; i < sorted.length; i += columns) {
        chunks.push(sorted.slice(i, i + columns))
      }
      return [{ title: 'All', data: chunks, fullData: sorted }]
    }

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
    for (const app of filteredApps) {
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
        const isCollapsed = collapsibleSections && collapsedState[title]
        const chunks: AppItem[][] = []
        if (!isCollapsed) {
          for (let i = 0; i < sorted.length; i += columns) {
            chunks.push(sorted.slice(i, i + columns))
          }
        }
        return { title, data: chunks, fullData: sorted }
      })
      .filter((section) => showEmptyCategories || section.fullData.length > 0)
  }, [
    apps,
    groupBy,
    columns,
    categoryFilter,
    collapsibleSections,
    collapsedState,
    categoryOrder,
    showEmptyCategories,
  ])

  const categories = useMemo(() => {
    const cats = new Set(apps.map((a) => a.category || 'Other'))
    return Array.from(cats).sort()
  }, [apps])

  const toggleSection = useCallback(
    (title: string) => {
      const newCollapsed = !collapsedState[title]
      setCollapsedState((prev) => ({ ...prev, [title]: newCollapsed }))
      onToggleSection?.(title, newCollapsed)
    },
    [collapsedState, onToggleSection]
  )

  const renderRow = useCallback(
    ({ item, index }: { item: AppItem[]; index: number }) => (
      <View style={styles.row}>
        {item.map((app, tileIndex) => {
          const isSelected = selectedIds.includes(app.id)
          const isDisabled = disabledIds.includes(app.id)
          return (
            <GridTile
              key={app.id}
              app={app}
              isSelected={isSelected}
              isDisabled={isDisabled}
              onPress={() => !isDisabled && onToggle(app.id)}
              density={density}
              theme={theme}
              index={index * columns + tileIndex}
            />
          )
        })}
        {Array.from({ length: columns - item.length }).map((_, idx) => (
          <View key={`empty-${idx}`} style={styles.tileWrapper} />
        ))}
      </View>
    ),
    [selectedIds, disabledIds, onToggle, density, theme, columns]
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      if (groupBy === 'none') return null

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
      groupBy,
      selectedIds,
      collapsedState,
      toggleSection,
      onSelectVisible,
      onClearVisible,
      theme,
      collapsibleSections,
    ]
  )

  if (apps.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>{emptyText}</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {showCategoryFilterRail && groupBy === 'category' && categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContainer}
          style={[styles.rail, { backgroundColor: theme.background }]}
        >
          <TouchableOpacity
            style={[
              styles.railChip,
              {
                backgroundColor: categoryFilter === null ? theme.surfaceElevated : 'transparent',
                borderBottomColor: categoryFilter === null ? theme.primary : 'transparent',
              },
            ]}
            onPress={() => setCategoryFilter(null)}
          >
            <Text
              style={[
                styles.railChipText,
                {
                  color: categoryFilter === null ? theme.text : theme.textMuted,
                  fontWeight: categoryFilter === null ? '600' : '500',
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.railChip,
                {
                  backgroundColor: categoryFilter === cat ? theme.surfaceElevated : 'transparent',
                  borderBottomColor: categoryFilter === cat ? theme.primary : 'transparent',
                },
              ]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text
                style={[
                  styles.railChipText,
                  {
                    color: categoryFilter === cat ? theme.text : theme.textMuted,
                    fontWeight: categoryFilter === cat ? '600' : '500',
                  },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <SectionList
        sections={sections}
        renderItem={renderRow}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => `row-${index}`}
        stickySectionHeadersEnabled={groupBy === 'category'}
        contentContainerStyle={styles.container}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={20}
        initialNumToRender={15}
        windowSize={11}
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
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'flex-start',
  },
  tileWrapper: {
    flex: 1,
    maxWidth: '25%',
    aspectRatio: 1,
    paddingHorizontal: 6,
  },
  tileContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  checkmark: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: -0.5,
  },
  rail: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  railContainer: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 7,
  },
  railChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 7,
    borderBottomWidth: 2,
  },
  railChipText: {
    fontSize: 12.5,
    letterSpacing: 0,
    fontWeight: '500',
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
