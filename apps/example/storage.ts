import { createMMKV } from 'react-native-mmkv'

export const storage = createMMKV()

// Storage keys
export const STORAGE_KEYS = {
  BLOCKED_PACKAGES: 'blockedPackages',
  SELECTOR_MODE: 'selectorMode',
} as const

// Type-safe storage helpers
export const storageHelpers = {
  // Get blocked packages from storage
  getBlockedPackages: (): string[] => {
    const stored = storage.getString(STORAGE_KEYS.BLOCKED_PACKAGES)
    return stored ? JSON.parse(stored) : []
  },

  // Save blocked packages to storage
  setBlockedPackages: (packages: string[]): void => {
    storage.set(STORAGE_KEYS.BLOCKED_PACKAGES, JSON.stringify(packages))
  },

  // Get selector mode preference
  getSelectorMode: (): 'list' | 'grid' => {
    return (storage.getString(STORAGE_KEYS.SELECTOR_MODE) as 'list' | 'grid') || 'list'
  },

  // Save selector mode preference
  setSelectorMode: (mode: 'list' | 'grid'): void => {
    storage.set(STORAGE_KEYS.SELECTOR_MODE, mode)
  },
}
