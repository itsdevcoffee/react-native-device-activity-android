import React, { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Platform,
} from 'react-native'
import { Icon } from '../Icon'
import { Checkbox } from '../Checkbox'
import { SectionHeader } from '../SectionHeader'
import type { AppItem, ThemeTokens, CollapsedState } from '../types'

type CompactSectionedListProps = {
  apps: AppItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onClearCategory: (ids: string[]) => void
  showPackageName: boolean
  showSelectAll: boolean
  disabledIds: string[]
  density: 'compact' | 'comfortable'
  theme: ThemeTokens
  emptyText: string
  collapsibleSections: boolean
  initiallyCollapsed?: Record<string, boolean>
  onToggleSection?: (section: string, collapsed: boolean) => void
}

type Section = {
  title: string
  data: AppItem[]
  fullData: AppItem[] // Keep original data for selection logic
}

export function CompactSectionedList({
  apps,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearCategory,
  showPackageName,
  showSelectAll,
  disabledIds,
  density,
  theme,
  emptyText,
  collapsibleSections,
  initiallyCollapsed = {},
  onToggleSection,
}: CompactSectionedListProps) {
  const [collapsedState, setCollapsedState] = useState<CollapsedState>(initiallyCollapsed)

  const sections = useMemo<Section[]>(() => {
    const grouped = new Map<string, AppItem[]>()

    for (const app of apps) {
      const category = app.category || 'Other'
      const existing = grouped.get(category) || []
      grouped.set(category, [...existing, app])
    }

    return Array.from(grouped.entries())
      .map(([title, data]) => {
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name))
        return {
          title,
          fullData: sorted,
          data: collapsibleSections && collapsedState[title] ? [] : sorted,
        }
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [apps, collapsedState, collapsibleSections])

  const toggleSection = useCallback(
    (title: string) => {
      const newCollapsed = !collapsedState[title]
      setCollapsedState((prev) => ({ ...prev, [title]: newCollapsed }))
      onToggleSection?.(title, newCollapsed)
    },
    [collapsedState, onToggleSection],
  )

  const rowHeight = density === 'compact' ? 52 : 64

  const renderItem = useCallback(
    ({ item }: { item: AppItem }) => {
      const isSelected = selectedIds.includes(item.id)
      const isDisabled = disabledIds.includes(item.id)

      return (
        <TouchableOpacity
          style={[
            styles.row,
            {
              height: rowHeight,
              backgroundColor: theme.surface,
              borderBottomColor: theme.border,
              opacity: isDisabled ? 0.4 : 1,
            },
          ]}
          onPress={() => !isDisabled && onToggle(item.id)}
          disabled={isDisabled}
          activeOpacity={0.6}
          accessible
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected, disabled: isDisabled }}
          accessibilityLabel={item.name}
        >
          <Icon
            uri={item.iconUri}
            name={item.name}
            size={density === 'compact' ? 24 : 28}
            backgroundColor={theme.border}
            textColor={theme.textMuted}
          />
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.appName,
                { color: theme.text },
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
          <Checkbox checked={isSelected} color={theme.primary} size={density === 'compact' ? 22 : 24} />
        </TouchableOpacity>
      )
    },
    [selectedIds, disabledIds, rowHeight, theme, density, showPackageName, onToggle],
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
          onSelectAll={() => onSelectAll(categoryIds)}
          onClearAll={() => onClearCategory(categoryIds)}
          theme={theme}
          collapsible={collapsibleSections}
        />
      )
    },
    [
      selectedIds,
      collapsedState,
      toggleSection,
      onSelectAll,
      onClearCategory,
      theme,
      collapsibleSections,
    ],
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
    />
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '400',
  },
  packageName: {
    fontSize: 13,
    marginTop: 2,
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
