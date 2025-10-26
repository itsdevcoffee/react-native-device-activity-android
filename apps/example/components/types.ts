export type AppItem = {
  id: string // required, typically packageName
  name: string // "Instagram"
  packageName?: string // "com.instagram.android" (optional to render)
  iconUri?: string // http/file/asset
  category?: string // "Social"
}

export type CategoryName =
  | 'Social'
  | 'Entertainment'
  | 'Games'
  | 'Productivity'
  | 'Music'
  | 'Photo & Video'
  | 'Navigation'
  | 'News'
  | 'Other'

export type CategoryOrder = 'default' | 'alphabetical' | CategoryName[]

export type ThemeTokens = {
  background: string
  surface: string
  surfaceElevated: string
  text: string
  textMuted: string
  border: string
  focus: string
  primary: string // selection accent (default: #00f8a7)
  radius: number // default 14
  spacing: { xs: number; sm: number; md: number; lg: number }
  shadow: { low: number; med: number; high: number }
}

export type SelectorMode = 'list' | 'grid'

export type AppSelectorProps = {
  mode?: SelectorMode // 'list' (default) | 'grid'
  apps: AppItem[] // full dataset
  selectedIds: string[] // controlled selection
  onChange: (nextIds: string[]) => void // called on every toggle

  // UX
  searchable?: boolean // default true
  initialQuery?: string
  showPackageName?: boolean // default false
  groupBy?: 'category' | 'none' // default 'category'
  selectionMode?: 'multiple' | 'single' // default 'multiple'
  maxSelection?: number // undefined = no cap
  disabledIds?: string[] // ids that can't be selected
  density?: 'compact' | 'comfortable' // default 'compact'
  theme?: Partial<ThemeTokens>

  // Sections
  collapsibleSections?: boolean // default true
  initiallyCollapsed?: Record<string, boolean> // key = section title
  rememberCollapseState?: boolean // default true
  onToggleSection?: (section: string, collapsed: boolean) => void
  categoryOrder?: CategoryOrder // default 'default'
  showEmptyCategories?: boolean // default true

  // Grid extras
  showCategoryFilterRail?: boolean // default true (filter chips)
  columns?: number // optional override (auto by width otherwise)

  // Actions
  onSubmit?: (ids: string[]) => void // "Done" or bottom primary
  onCancel?: () => void // "Cancel"
  renderFooter?: React.ReactNode
  onRefresh?: () => void // pull-to-refresh callback
  refreshing?: boolean // pull-to-refresh loading state

  // Copy overrides
  strings?: Partial<{
    searchPlaceholder: string
    done: string
    cancel: string
    selectVisible: string
    clearVisible: string
    collapseAll: string
    expandAll: string
    noneFound: string
    addN: (n: number) => string
  }>
}

// Internal types for component communication
export type SectionData = {
  title: string
  data: AppItem[]
  index: number
}

export type CollapsedState = Record<string, boolean>
