import { useEffect, useState, useRef } from 'react'
import { readSnapshot, writeSnapshot } from '../api/client'
import { subscribeRealtimeUpdates } from '../lib/realtimeEventBus'

/**
 * Realtime data hook with zero-latency event bus integration and tab visibility awareness.
 * Re-fetches immediately when any real-time mutation occurs across tabs or locally,
 * and maintains periodic polling fallback.
 *
 * Pass `snapshotKey` to seed the UI instantly from the last successful fetch
 * (localStorage) so repeat visits never wait on the network for first paint.
 */
export function useRealtime<T>(
  fetcher: () => Promise<T>,
  intervalMs = 5000,
  snapshotKey?: string,
): T | null {
  const [data, setData] = useState<T | null>(() => (snapshotKey ? readSnapshot<T>(snapshotKey) : null))
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let cancelled = false

    const execute = async () => {
      // Pause background polling when tab is inactive to preserve responder battery
      if (document.hidden) return
      try {
        const result = await fetcherRef.current()
        if (cancelled) return
        setData(result)
        if (snapshotKey) writeSnapshot(snapshotKey, result)
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
  }, [intervalMs, snapshotKey])

  return data
}
