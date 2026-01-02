'use client'

import { useEffect, useState } from 'react'

export type ViewMode = 'cards' | 'grid'

type Options = {
  storageKey?: string
  defaultMode?: ViewMode
}

/**
 * Persisted view mode stored in localStorage.
 * Safe for Next.js client components.
 */
export default function useViewMode(options: Options = {}) {
  const storageKey = options.storageKey ?? 'warplet:viewMode'
  const defaultMode: ViewMode = options.defaultMode ?? 'cards'

  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return defaultMode
    try {
      const v = window.localStorage.getItem(storageKey)
      return v === 'grid' || v === 'cards' ? v : defaultMode
    } catch {
      return defaultMode
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, mode)
    } catch {
      // ignore (private mode / blocked storage)
    }
  }, [mode, storageKey])

  return { mode, setMode }
}
