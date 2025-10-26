import React, { useMemo, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Vibration,
  StatusBar,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ZenList } from './modes/ZenList'
import { CardGrid } from './modes/CardGrid'
import { ActionChips } from './ActionChips'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { mergeTheme } from './theme/tokens'
import { collapseStateStore } from './collapseStateStore'
import type { AppSelectorProps, AppItem, CollapsedState } from './types'

const defaultStrings = {
  searchPlaceholder: 'Search apps...',
  selectVisible: 'Select visible',
  clearVisible: 'Clear visible',
  collapseAll: 'Collapse all',
  expandAll: 'Expand all',
  done: 'Done',
  cancel: 'Cancel',
  noneFound: 'No apps found',
  addN: (n: number) => (n === 1 ? 'Select' : `Add ${n}`),
}

// Counter for generating unique instance IDs
let instanceCounter = 0

export function AppSelector({
  mode = 'list',
  apps,
  selectedIds,
  onChange,
  searchable = true,
  initialQuery = '',
  groupBy = 'category',
  showPackageName = false,
  selectionMode = 'multiple',
  maxSelection,
  disabledIds = [],
  theme: customTheme,
  density = 'compact',
  collapsibleSections = true,
  initiallyCollapsed,
  rememberCollapseState = true,
  onToggleSection,
  categoryOrder = 'default',
  showEmptyCategories = true,
  showCategoryFilterRail = true,
  columns,
  onSubmit,
  onCancel,
  renderFooter,
  strings: customStrings,
  onRefresh,
  refreshing = false,
}: AppSelectorProps) {
  const theme = useMemo(() => mergeTheme(customTheme), [customTheme])
  const strings = useMemo(() => ({ ...defaultStrings, ...customStrings }), [customStrings])
  const [query, setQuery] = useState(initialQuery)
  const debouncedQuery = useDebouncedValue(query, 200)

  // Generate stable instance ID for this component
  const instanceIdRef = useRef<string>(`app-selector-${++instanceCounter}`)
  const instanceId = instanceIdRef.current

  // Collapse state management - uses global store if rememberCollapseState is true
  const getInitialCollapseState = (): CollapsedState => {
    if (rememberCollapseState) {
      const stored = collapseStateStore.get(instanceId)
      // Merge with initiallyCollapsed to respect explicit initial values
      return { ...stored, ...initiallyCollapsed }
    }
    return initiallyCollapsed || {}
  }

  const [localCollapsedState, setLocalCollapsedState] = useState<CollapsedState>(getInitialCollapseState)

  // Read from store on mount if rememberCollapseState is true
  const collapsedState = useMemo(() => {
    if (rememberCollapseState) {
      const stored = collapseStateStore.get(instanceId)
      return Object.keys(stored).length > 0 ? stored : localCollapsedState
    }
    return localCollapsedState
  }, [rememberCollapseState, instanceId, localCollapsedState])

  // Handle section toggle
  const handleToggleSection = useCallback(
    (section: string, collapsed: boolean) => {
      const newState = { ...collapsedState, [section]: collapsed }

      if (rememberCollapseState) {
        collapseStateStore.set(instanceId, newState)
      }

      setLocalCollapsedState(newState)
      onToggleSection?.(section, collapsed)
    },
    [collapsedState, rememberCollapseState, instanceId, onToggleSection]
  )

  const filteredApps = useMemo(() => {
    if (!debouncedQuery) return apps

    const lowerQuery = debouncedQuery.toLowerCase()
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(lowerQuery) ||
        app.packageName?.toLowerCase().includes(lowerQuery)
    )
  }, [apps, debouncedQuery])

  const handleToggle = (id: string) => {
    if (selectionMode === 'single') {
      onChange([id])
      return
    }

    const isSelected = selectedIds.includes(id)

    if (isSelected) {
      onChange(selectedIds.filter((sid) => sid !== id))
    } else {
      if (maxSelection && selectedIds.length >= maxSelection) {
        // Light haptic feedback on max reached
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Vibration.vibrate(50)
        }
        return
      }
      onChange([...selectedIds, id])
    }

    // Light impact on toggle
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Vibration.vibrate(10)
    }
  }

  const handleSelectVisible = (ids: string[]) => {
    const validIds = ids.filter((id) => !disabledIds.includes(id))
    const uniqueIds = Array.from(new Set([...selectedIds, ...validIds]))

    if (maxSelection && uniqueIds.length > maxSelection) {
      onChange(uniqueIds.slice(0, maxSelection))
    } else {
      onChange(uniqueIds)
    }
  }

  const handleClearVisible = (ids: string[]) => {
    const idsSet = new Set(ids)
    onChange(selectedIds.filter((id) => !idsSet.has(id)))
  }

  const handleSelectAllVisible = () => {
    const visibleIds = filteredApps.map((app) => app.id)
    handleSelectVisible(visibleIds)
  }

  const handleClearAllVisible = () => {
    const visibleIds = filteredApps.map((app) => app.id)
    handleClearVisible(visibleIds)
  }

  const showActionChips = groupBy === 'none' || debouncedQuery.length > 0
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.text === '#202425' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.background}
        translucent={false}
      />

      {/* Unified Floating Bar - Top bar + Search */}
      <View style={[styles.topSection, { paddingTop: insets.top + 10 }]}>
        <View
          style={[
            styles.floatingBar,
            {
              backgroundColor: theme.surface,
              borderRadius: theme.radius,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: theme.shadow.med + 2,
              shadowOffset: { width: 0, height: 3 },
              elevation: 6,
            },
          ]}
        >
          {/* Top Row - Cancel / Badge / Done */}
          <View style={styles.topRow}>
            {onCancel && (
              <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, { color: theme.textMuted }]}>
                  {strings.cancel}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.headerCenter}>
              {selectedIds.length > 0 && (
                <View style={[styles.selectedBadge, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.selectedBadgeText, { color: theme.background }]}>
                    {selectedIds.length}
                  </Text>
                </View>
              )}
            </View>

            {onSubmit && (
              <TouchableOpacity onPress={() => onSubmit(selectedIds)} style={styles.headerButton}>
                <Text style={[styles.headerButtonTextBold, { color: theme.primary }]}>
                  {strings.done}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Row - integrated into the same floating card */}
          {searchable && (
            <View style={styles.searchRow}>
              <Text style={[styles.searchIcon, { color: theme.textMuted }]}>🔍</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={strings.searchPlaceholder}
                placeholderTextColor={theme.textMuted}
                style={[styles.searchText, { color: theme.text }]}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                  <Text style={[styles.clearIcon, { color: theme.textMuted }]}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Global Action Chips */}
      <ActionChips
        onSelectVisible={handleSelectAllVisible}
        onClearVisible={handleClearAllVisible}
        theme={theme}
        selectLabel={strings.selectVisible}
        clearLabel={strings.clearVisible}
        visible={showActionChips}
      />

      {/* Mode Renderer */}
      <View style={styles.content}>
        {mode === 'list' ? (
          <ZenList
            apps={filteredApps}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onSelectVisible={handleSelectVisible}
            onClearVisible={handleClearVisible}
            showPackageName={showPackageName}
            disabledIds={disabledIds}
            density={density}
            theme={theme}
            emptyText={strings.noneFound}
            collapsibleSections={collapsibleSections}
            initiallyCollapsed={collapsedState}
            onToggleSection={handleToggleSection}
            categoryOrder={categoryOrder}
            showEmptyCategories={showEmptyCategories}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        ) : (
          <CardGrid
            apps={filteredApps}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onSelectVisible={handleSelectVisible}
            onClearVisible={handleClearVisible}
            disabledIds={disabledIds}
            density={density}
            theme={theme}
            emptyText={strings.noneFound}
            columns={columns}
            showCategoryFilterRail={showCategoryFilterRail}
            groupBy={groupBy}
            collapsibleSections={collapsibleSections}
            initiallyCollapsed={collapsedState}
            onToggleSection={handleToggleSection}
            categoryOrder={categoryOrder}
            showEmptyCategories={showEmptyCategories}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}
      </View>

      {/* Bottom Bar - Floating Card Style */}
      {selectedIds.length > 0 && (
        <View
          style={[
            styles.bottomBarContainer,
            {
              paddingBottom: insets.bottom + 12,
              paddingHorizontal: 16,
            },
          ]}
        >
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: theme.surface,
                borderRadius: theme.radius,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: theme.shadow.med + 2,
                shadowOffset: { width: 0, height: -3 },
                elevation: 6,
              },
            ]}
          >
            <TouchableOpacity onPress={handleClearAllVisible} style={styles.bottomButton}>
              <Text style={[styles.bottomButtonText, { color: theme.textMuted }]}>
                {strings.clearVisible}
              </Text>
            </TouchableOpacity>
            {onSubmit && (
              <TouchableOpacity
                onPress={() => onSubmit(selectedIds)}
                style={[
                  styles.bottomButtonPrimary,
                  {
                    backgroundColor: theme.primary,
                    borderRadius: theme.radius - 3,
                  },
                ]}
              >
                <Text style={[styles.bottomButtonPrimaryText, { color: theme.background }]}>
                  {strings.addN(selectedIds.length)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Custom Footer */}
      {renderFooter}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  floatingBar: {
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerButtonTextBold: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  selectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  selectedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    opacity: 0.7,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 22,
    fontWeight: '300',
  },
  content: {
    flex: 1,
  },
  bottomBarContainer: {
    paddingTop: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bottomButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  bottomButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  bottomButtonPrimary: {
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  bottomButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
})

export { defaultTheme, lightTheme, darkTheme } from './theme/tokens'
export type { AppItem, AppSelectorProps, ThemeTokens, SelectorMode } from './types'

export function normalizeApps(apps: AppItem[]): AppItem[] {
  return apps.map((app) => ({
    ...app,
    id: app.id || app.packageName || `app-${Math.random()}`,
    category: app.category || 'Other',
  }))
}
