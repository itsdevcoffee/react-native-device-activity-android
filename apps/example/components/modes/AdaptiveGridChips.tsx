import React, { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ScrollView,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated'
import { Icon } from '../Icon'
import { SectionHeader } from '../SectionHeader'
import type { AppItem, ThemeTokens, CollapsedState } from '../types'

type AdaptiveGridChipsProps = {
  apps: AppItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onClearCategory: (ids: string[]) => void
  disabledIds: string[]
  density: 'compact' | 'comfortable'
  theme: ThemeTokens
  emptyText: string
  columns?: number
  showCategoryChipsInGrid?: boolean
  groupBy?: 'category' | 'none'
  collapsibleSections?: boolean
  initiallyCollapsed?: Record<string, boolean>
  onToggleSection?: (section: string, collapsed: boolean) => void
}

type Section = {
  title: string
  data: AppItem[][]
  fullData: AppItem[]
}

export function AdaptiveGridChips({
  apps,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearCategory,
  disabledIds,
  density,
  theme,
  emptyText,
  columns: columnsProp,
  showCategoryChipsInGrid = true,
  groupBy = 'category',
  collapsibleSections = true,
  initiallyCollapsed = {},
  onToggleSection,
}: AdaptiveGridChipsProps) {
  const { width } = useWindowDimensions()
  const [collapsedState, setCollapsedState] = useState<CollapsedState>(initiallyCollapsed)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const columns = useMemo(() => {
    if (columnsProp) return columnsProp
    if (width >= 768) return 5 // Tablet
    if (width >= 480) return 4 // Large phone
    return 3 // Standard phone
  }, [width, columnsProp])

  // Group into sections and chunk by columns
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

    const grouped = new Map<string, AppItem[]>()
    for (const app of filteredApps) {
      const category = app.category || 'Other'
      const existing = grouped.get(category) || []
      grouped.set(category, [...existing, app])
    }

    return Array.from(grouped.entries())
      .map(([title, data]) => {
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
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [apps, groupBy, columns, categoryFilter, collapsibleSections, collapsedState])

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
    [collapsedState, onToggleSection],
  )

  const renderRow = useCallback(
    ({ item }: { item: AppItem[] }) => (
      <View style={[styles.row, { gap: 8 }]}>
        {item.map((app) => {
          const isSelected = selectedIds.includes(app.id)
          const isDisabled = disabledIds.includes(app.id)
          return (
            <GridChip
              key={app.id}
              app={app}
              isSelected={isSelected}
              isDisabled={isDisabled}
              onPress={() => !isDisabled && onToggle(app.id)}
              density={density}
              theme={theme}
              columns={columns}
            />
          )
        })}
        {/* Fill empty slots */}
        {Array.from({ length: columns - item.length }).map((_, idx) => (
          <View key={`empty-${idx}`} style={styles.chipWrapper} />
        ))}
      </View>
    ),
    [selectedIds, disabledIds, onToggle, density, theme, columns],
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
          onSelectAll={() => onSelectAll(categoryIds)}
          onClearAll={() => onClearCategory(categoryIds)}
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
      onSelectAll,
      onClearCategory,
      theme,
      collapsibleSections,
    ],
  )

  if (apps.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>{emptyText}</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {showCategoryChipsInGrid && groupBy === 'category' && categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryChipsContainer, { paddingHorizontal: 16 }]}
          style={{ flexGrow: 0, backgroundColor: theme.background }}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              {
                backgroundColor: categoryFilter === null ? theme.primary : theme.card,
                borderColor: categoryFilter === null ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setCategoryFilter(null)}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: categoryFilter === null ? '#000' : theme.text },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: categoryFilter === cat ? theme.primary : theme.card,
                  borderColor: categoryFilter === cat ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: categoryFilter === cat ? '#000' : theme.text },
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
      />
    </View>
  )
}

type GridChipProps = {
  app: AppItem
  isSelected: boolean
  isDisabled: boolean
  onPress: () => void
  density: 'compact' | 'comfortable'
  theme: ThemeTokens
  columns: number
}

function GridChip({
  app,
  isSelected,
  isDisabled,
  onPress,
  density,
  theme,
  columns,
}: GridChipProps) {
  const scale = useSharedValue(isSelected ? 1 : 0.98)
  const badgeScale = useSharedValue(isSelected ? 1 : 0)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 14, stiffness: 280 }) }],
  }))

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(badgeScale.value, { damping: 12, stiffness: 300 }) }],
    opacity: withTiming(badgeScale.value, { duration: 150 }),
  }))

  React.useEffect(() => {
    scale.value = isSelected ? 1 : 0.98
    badgeScale.value = isSelected ? 1 : 0
  }, [isSelected, scale, badgeScale])

  const tileHeight = density === 'compact' ? 44 : 48
  const iconSize = density === 'compact' ? 24 : 26

  return (
    <Animated.View style={[styles.chipWrapper, animatedStyle]}>
      <TouchableOpacity
        style={[
          styles.chip,
          {
            height: tileHeight,
            backgroundColor: theme.surface,
            borderColor: isSelected ? theme.primary : theme.border,
            borderWidth: isSelected ? 2 : 1,
            opacity: isDisabled ? 0.4 : 1,
            shadowColor: isSelected ? theme.primary : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isSelected ? 0.3 : 0,
            shadowRadius: isSelected ? 8 : 0,
            elevation: isSelected ? 4 : 0,
          },
        ]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessible
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected, disabled: isDisabled }}
        accessibilityLabel={app.name}
      >
        <Icon
          uri={app.iconUri}
          name={app.name}
          size={iconSize}
          borderRadius={8}
          backgroundColor={theme.border}
          textColor={theme.textMuted}
        />
        <Text
          style={[
            styles.chipText,
            { color: theme.text },
          ]}
          numberOfLines={1}
        >
          {app.name}
        </Text>
        {isSelected && (
          <Animated.View style={[styles.checkBadge, { backgroundColor: theme.primary }, badgeStyle]}>
            <Text style={styles.checkmark}>✓</Text>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chipWrapper: {
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    position: 'relative',
  },
  chipText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  checkBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0b0c0f',
  },
  checkmark: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryChipsContainer: {
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
  },
})
