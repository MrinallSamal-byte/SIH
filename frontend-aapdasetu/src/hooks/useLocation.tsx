import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { getCurrentPosition } from '../lib/helpers'

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'error'

interface LocationValue {
  coords: GeolocationCoordinates | null
  status: LocationStatus
  refresh: () => void
}

const LocationContext = createContext<LocationValue | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')

  const detect = () => {
    setStatus('locating')
    getCurrentPosition()
      .then((pos) => {
        setCoords(pos.coords)
        setStatus('granted')
      })
      .catch((err: unknown) => {
        const isDenied = err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED
        setStatus(isDenied ? 'denied' : 'error')
      })
  }

  const value = useMemo<LocationValue>(
    () => ({
      coords,
      status,
      refresh: detect,
    }),
    [coords, status],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation(): LocationValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within LocationProvider')
  return ctx
}
