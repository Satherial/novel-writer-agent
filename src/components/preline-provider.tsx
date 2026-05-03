"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

/** Initialize Preline (dropdowns, overlays, etc.) after navigation / hydration */
export default function PrelineProvider() {
  const pathname = usePathname()

  useEffect(() => {
    let cancelled = false
    import("preline").then(({ HSStaticMethods }) => {
      if (cancelled) return
      try {
        HSStaticMethods.autoInit()
      } catch (e) {
        console.warn("[Preline] autoInit failed:", e)
      }
    })

    return () => {
      cancelled = true
    }
  }, [pathname])

  return null
}
