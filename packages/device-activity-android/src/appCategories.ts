/**
 * Android ApplicationInfo category constants.
 * Available from Android API 26 (Oreo) and above.
 *
 * @see https://developer.android.com/reference/android/content/pm/ApplicationInfo#category
 */
export enum AppCategory {
  /** Category not specified or unknown */
  UNDEFINED = -1,
  /** Game apps */
  GAME = 0,
  /** Audio/Music apps */
  AUDIO = 1,
  /** Video apps */
  VIDEO = 2,
  /** Image/Photo apps */
  IMAGE = 3,
  /** Social media apps */
  SOCIAL = 4,
  /** News apps */
  NEWS = 5,
  /** Maps/Navigation apps */
  MAPS = 6,
  /** Productivity apps (browsers, tools, etc.) */
  PRODUCTIVITY = 7,
}

/**
 * Human-readable category labels.
 * Matches iOS Screen Time category names where possible.
 */
export const APP_CATEGORY_LABELS: Record<AppCategory, string> = {
  [AppCategory.UNDEFINED]: 'Other',
  [AppCategory.GAME]: 'Games',
  [AppCategory.AUDIO]: 'Music',
  [AppCategory.VIDEO]: 'Entertainment',
  [AppCategory.IMAGE]: 'Photo & Video',
  [AppCategory.SOCIAL]: 'Social',
  [AppCategory.NEWS]: 'News',
  [AppCategory.MAPS]: 'Navigation',
  [AppCategory.PRODUCTIVITY]: 'Productivity',
}

/**
 * Get human-readable label for a category ID.
 */
export function getCategoryLabel(categoryId: number): string {
  const category = categoryId as AppCategory
  return APP_CATEGORY_LABELS[category] || APP_CATEGORY_LABELS[AppCategory.UNDEFINED]
}

/**
 * Group apps by category.
 * Returns a map of category ID to array of apps.
 */
export function groupAppsByCategory<T extends { category?: number }>(
  apps: T[]
): Map<AppCategory, T[]> {
  const grouped = new Map<AppCategory, T[]>()

  // Initialize all categories with empty arrays
  Object.values(AppCategory).forEach((cat) => {
    if (typeof cat === 'number') {
      grouped.set(cat, [])
    }
  })

  // Group apps
  for (const app of apps) {
    const category = (app.category ?? AppCategory.UNDEFINED) as AppCategory
    const existing = grouped.get(category) || []
    grouped.set(category, [...existing, app])
  }

  return grouped
}

/**
 * Get category counts for display (e.g., "Social (5)").
 */
export function getCategoryCounts<T extends { category?: number }>(
  apps: T[]
): Record<AppCategory, number> {
  const counts: Record<number, number> = {}

  // Initialize all categories with 0
  Object.values(AppCategory).forEach((cat) => {
    if (typeof cat === 'number') {
      counts[cat] = 0
    }
  })

  // Count apps per category
  for (const app of apps) {
    const category = app.category ?? AppCategory.UNDEFINED
    counts[category] = (counts[category] || 0) + 1
  }

  return counts as Record<AppCategory, number>
}

/**
 * Get formatted category label with count (e.g., "Social (5)").
 */
export function getCategoryLabelWithCount(categoryId: AppCategory, count: number): string {
  const label = getCategoryLabel(categoryId)
  return `${label} (${count})`
}

/**
 * Sort categories by priority for display.
 * Order: Social, Entertainment, Games, Productivity, Music, Photo & Video, Navigation, News, Other
 */
export const CATEGORY_DISPLAY_ORDER: AppCategory[] = [
  AppCategory.SOCIAL,
  AppCategory.VIDEO,
  AppCategory.GAME,
  AppCategory.PRODUCTIVITY,
  AppCategory.AUDIO,
  AppCategory.IMAGE,
  AppCategory.MAPS,
  AppCategory.NEWS,
  AppCategory.UNDEFINED,
]

/**
 * Default category names in display order.
 */
export const DEFAULT_CATEGORY_ORDER: string[] = [
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

/**
 * Map category display name to category ID.
 */
export function getCategoryIdFromName(name: string): AppCategory | null {
  const entry = Object.entries(APP_CATEGORY_LABELS).find(([_, label]) => label === name)
  return entry ? (parseInt(entry[0]) as AppCategory) : null
}

/**
 * Deduplicate an array of category names while preserving order.
 */
export function deduplicateCategoryNames(names: string[]): string[] {
  return Array.from(new Set(names))
}
