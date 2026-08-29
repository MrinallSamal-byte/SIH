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
interface NetworkConnection {
  saveData?: boolean
  effectiveType?: string
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

function getConnection(): NetworkConnection | undefined {
  return (navigator as Navigator & { connection?: NetworkConnection }).connection
}

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
    // Snapshot writes are throttled: serializing the full payload to
    // localStorage on every 4-8 s poll tick is constant main-thread churn.
    let lastSnapshotJson: string | null = null
    let lastSnapshotAt = 0
    const SNAPSHOT_MIN_INTERVAL_MS = 60_000

    const execute = async (force = false) => {
      // Pause background polling when tab is inactive to preserve responder
      // battery — but the INITIAL fetch always runs, or a page opened in a
      // background tab shows skeletons forever.
      if (!force && document.hidden) return
      try {
        const result = await fetcherRef.current()
        if (cancelled) return
        setData(result)
        if (snapshotKey) {
          const json = JSON.stringify(result)
          const changed = json !== lastSnapshotJson
          if (changed || Date.now() - lastSnapshotAt > SNAPSHOT_MIN_INTERVAL_MS) {
            writeSnapshot(snapshotKey, result)
            lastSnapshotJson = json
            lastSnapshotAt = Date.now()
          }
        }
      } catch {
        // Keep last known valid state on transient network glitch
      }
    }

    // Adaptive interval: respect Data Saver and slow (2G) cellular links by polling 4x less often.
    const getAdaptiveInterval = () => {
      const connection = getConnection()
      if (!connection) return intervalMs
      const saveData = connection.saveData === true
      const effectiveType = String(connection.effectiveType || '')
      if (saveData || effectiveType.includes('2g')) {
        return Math.min(intervalMs * 4, 30000)
      }
      return intervalMs
    }

    // 1. Initial fetch (forced — see execute)
    void execute(true)

    // 2. Periodic polling interval — always (re)started via startPolling so the
    //    adaptive cadence is recomputed from live connection state, never reused stale.
    let id: ReturnType<typeof setInterval> | undefined

    const startPolling = () => {
      if (id !== undefined) clearInterval(id)
      id = setInterval(execute, getAdaptiveInterval())
    }

    startPolling()

    // 3. Recompute cadence when network conditions change mid-session
    const connection = getConnection()
    const handleConnectionChange = () => {
      startPolling()
    }
    if (typeof connection?.addEventListener === 'function') {
      connection.addEventListener('change', handleConnectionChange)
    }

    // 4. Tab visibility awareness — fully stop polling while hidden, and on resume
    //    fetch immediately + restart with a freshly computed adaptive interval.
    const handleVisibility = () => {
      if (document.hidden) {
        if (id !== undefined) {
          clearInterval(id)
          id = undefined
        }
      } else {
        void execute(true)
        startPolling()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // 5. Instant Real-time Event Bus Subscription (0ms latency!)
    const unsubscribeBus = subscribeRealtimeUpdates(() => {
      execute()
    })

    return () => {
      cancelled = true
      if (id !== undefined) clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (typeof connection?.removeEventListener === 'function') {
        connection.removeEventListener('change', handleConnectionChange)
      }
      unsubscribeBus()
    }
  }, [intervalMs, snapshotKey])

  return data
}
