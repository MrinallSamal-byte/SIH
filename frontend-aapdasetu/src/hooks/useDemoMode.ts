import { useEffect, useState } from 'react'
import { subscribeFallback } from '../api/client'

/** True once any API call fell back to mock data (drives the "demo data" pill). */
export function useDemoMode(): boolean {
  const [demo, setDemo] = useState(false)
  useEffect(() => subscribeFallback(() => setDemo(true)), [])
  return demo
}
