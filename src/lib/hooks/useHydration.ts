'use client'

import { useState, useEffect } from 'react'

/**
 * Tracks whether the client has hydrated.
 * Zustand stores using `persist` middleware rehydrate asynchronously,
 * which can cause a mismatch between SSR output and the first client render.
 *
 * Usage:
 *   const hydrated = useHydration()
 *   if (!hydrated) return <LoadingSkeleton />
 *   // safe to read persisted store values
 */
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}

/**
 * Wraps a Zustand selector so it returns `fallback` during SSR
 * and the real store value after hydration.
 *
 * Usage:
 *   const medications = useStoreHydration(useMedicationStore, s => s.medications, [])
 */
export function useStoreHydration<TStore, TValue>(
  useStore: (selector: (state: TStore) => TValue) => TValue,
  selector: (state: TStore) => TValue,
  fallback: TValue,
): TValue {
  const hydrated = useHydration()
  const storeValue = useStore(selector)

  if (!hydrated) return fallback

  return storeValue
}
