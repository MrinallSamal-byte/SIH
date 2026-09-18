import { useEffect, useState } from 'react'
import { apiHealth, subscribeFallback } from '../api/client'

/** True while the app is serving mock fallback data (drives the "demo data"
 * banner). Sticks ON after any fallback, and clears again once a real
 * backend response succeeds — a banner that never clears would cry wolf
 * even after recovery. */
export function useDemoMode(): boolean {
  const [demo, setDemo] = useState(() => apiHealth.lastWasMock)
  useEffect(() => {
    const unsub = subscribeFallback(() => setDemo(true))
    // apiHealth has no change event for successful real responses; a cheap
    // poll reconciles the banner when the backend recovers.
    const id = window.setInterval(() => {
      setDemo((prev) => (prev && !apiHealth.lastWasMock ? false : prev))
    }, 5000)
    return () => {
      unsub()
      window.clearInterval(id)
    }
  }, [])
  return demo
}
