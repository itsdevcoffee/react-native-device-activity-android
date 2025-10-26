/**
 * Global in-memory store for collapse state.
 * Persists during app session but resets on app restart.
 */

import type { CollapsedState } from './types'

// Module-level Map that persists during the session
const globalCollapseState = new Map<string, CollapsedState>()

export const collapseStateStore = {
  get: (key: string): CollapsedState => {
    return globalCollapseState.get(key) || {}
  },

  set: (key: string, state: CollapsedState): void => {
    globalCollapseState.set(key, state)
  },

  update: (key: string, category: string, collapsed: boolean): void => {
    const current = globalCollapseState.get(key) || {}
    globalCollapseState.set(key, { ...current, [category]: collapsed })
  },

  clear: (key: string): void => {
    globalCollapseState.delete(key)
  },

  clearAll: (): void => {
    globalCollapseState.clear()
  },
}
