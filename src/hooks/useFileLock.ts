"use client"

import { useCallback, useState } from "react"

/**
 * UI-side "lock" while async work runs (e.g. saving a file).  
 * Server conflicts (HTTP 423) are still handled by the API caller.
 */
export function useFileLock() {
  const [locked, setLocked] = useState(false)

  const withLock = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLocked(true)
    try {
      return await fn()
    } finally {
      setLocked(false)
    }
  }, [])

  return { locked, withLock }
}
