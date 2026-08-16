import { useEffect, useState, useRef } from 'react'

/**
 * Realtime-ish data hook with tab visibility awareness to save mobile battery
 * and reduce backend load when the tab is backgrounded.
 */
export function useRealtime<T>(fetcher: () => Promise<T>, intervalMs = 5000): T | null {
  const [data, setData] = useState<T | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let cancelled = false

    const execute = async () => {
      // Pause background polling when tab is inactive to preserve responder battery
      if (document.hidden) return
      try {
        const result = await fetcherRef.current()
        if (!cancelled) setData(result)
      } catch {
        // Keep last known valid state on transient network glitch
      }
    }

    execute()
    const id = setInterval(execute, intervalMs)

    const handleVisibility = () => {
      if (!document.hidden) {
        execute()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [intervalMs])

  return data
}

