import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentPosition } from '../lib/helpers'

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'error'

interface LocationValue {
  coords: GeolocationCoordinates | null
  status: LocationStatus
  accuracy: number | null
  refresh: () => void
}

const LocationContext = createContext<LocationValue | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [accuracy, setAccuracy] = useState<number | null>(null)

  const detect = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error')
      return
    }

    setStatus('locating')

    // 1. Initial fast low-accuracy / cached fetch
    getCurrentPosition(false, 5000)
      .then((pos) => {
        setCoords(pos.coords)
        setAccuracy(pos.coords.accuracy)
        setStatus('granted')
      })
      .catch(() => {
        // Fallback to high-accuracy if low-accuracy timed out
      })

    // 2. High-precision watcher for continuous field updates
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords(pos.coords)
        setAccuracy(pos.coords.accuracy)
        setStatus('granted')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied')
        } else {
          setStatus((prev) => (prev === 'granted' ? 'granted' : 'error'))
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  useEffect(() => {
    const cleanup = detect()
    return () => cleanup?.()
  }, [detect])

  const value = useMemo<LocationValue>(
    () => ({
      coords,
      status,
      accuracy,
      refresh: detect,
    }),
    [coords, status, accuracy, detect],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation(): LocationValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within LocationProvider')
  return ctx
}

