import { useEffect, useState } from 'react'

/**
 * Realtime-ish data hook. Currently POLLS the REST API every `intervalMs`.
 *
 * @TODO BUILD (optional): the spec's realtime transport is Supabase
 * `postgres_changes` WebSockets. To enable, set VITE_SUPABASE_URL + anon key
 * (see .env.example) and swap the polling in this hook for:
 *
 *   const channel = supabase
 *     .channel('db-changes')
 *     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' },
 *       (payload) => setData(prev => [payload.new, ...(prev ?? [])]))
 *     .subscribe()
 */
export function useRealtime<T>(fetcher: () => Promise<T>, intervalMs = 5000): T | null {
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const result = await fetcher()
        if (!cancelled) setData(result)
      } catch {
        // keep last known data
      }
    }
    tick()
    const id = setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [fetcher, intervalMs])

  return data
}
