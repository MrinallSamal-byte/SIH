import { useEffect, useState, useRef } from 'react'
import { subscribeRealtimeUpdates } from '../lib/realtimeEventBus'

/**
 * Realtime data hook with zero-latency event bus integration and tab visibility awareness.
 * Re-fetches immediately when any real-time mutation occurs across tabs or locally,
 * and maintains periodic polling fallback.
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

    // 1. Initial fetch
    execute()

    // 2. Periodic polling interval
    const id = setInterval(execute, intervalMs)

    // 3. Tab visibility awareness
    const handleVisibility = () => {
      if (!document.hidden) {
        execute()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // 4. Instant Real-time Event Bus Subscription (0ms latency!)
    const unsubscribeBus = subscribeRealtimeUpdates(() => {
      execute()
    })

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibility)
      unsubscribeBus()
    }
  }, [intervalMs])

  return data
}
