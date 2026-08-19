/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentPosition, getIpGeolocation } from '../lib/helpers'
import type { GeoPoint } from '../types'

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'fallback' | 'denied' | 'error'
export type LocationSource = 'gps' | 'ip' | 'cached' | 'manual' | 'default'

export interface GeoLocationCoordinatesLike {
  latitude: number
  longitude: number
  altitude: number | null
  accuracy: number | null
  altitudeAccuracy: number | null
  heading: number | null
  speed: number | null
}

export interface LocationValue {
  coords: GeoLocationCoordinatesLike | null
  status: LocationStatus
  accuracy: number | null
  source: LocationSource
  isFallback: boolean
  refresh: () => void
  setManualLocation: (point: GeoPoint) => void
}

const STORAGE_KEY_LOCATION = 'aapdasetu_last_coords'
const DEFAULT_FALLBACK_LOCATION: GeoLocationCoordinatesLike = {
  latitude: 22.5726,
  longitude: 88.3639,
  altitude: null,
  accuracy: 1000,
  altitudeAccuracy: null,
  heading: null,
  speed: null,
}

function getStoredLocation(): GeoLocationCoordinatesLike | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCATION)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return {
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          altitude: null,
          accuracy: parsed.accuracy ?? 100,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        }
      }
    }
  } catch {
    // Storage access blocked
  }
  return null
}

const defaultLocationValue: LocationValue = {
  coords: getStoredLocation() || DEFAULT_FALLBACK_LOCATION,
  status: 'idle',
  accuracy: 100,
  source: getStoredLocation() ? 'cached' : 'default',
  isFallback: true,
  refresh: () => {},
  setManualLocation: () => {},
}

const LocationContext = createContext<LocationValue>(defaultLocationValue)

export function GeoLocationProvider({ children }: { children: ReactNode }) {
  const initialCached = useMemo(() => getStoredLocation(), [])
  const [coords, setCoords] = useState<GeoLocationCoordinatesLike | null>(
    initialCached || DEFAULT_FALLBACK_LOCATION
  )
  const [status, setStatus] = useState<LocationStatus>(initialCached ? 'fallback' : 'idle')
  const [accuracy, setAccuracy] = useState<number | null>(initialCached?.accuracy ?? null)
  const [source, setSource] = useState<LocationSource>(initialCached ? 'cached' : 'default')

  const saveLocation = useCallback((c: GeoLocationCoordinatesLike, src: LocationSource) => {
    setCoords(c)
    setAccuracy(c.accuracy)
    setSource(src)
    try {
      localStorage.setItem(
        STORAGE_KEY_LOCATION,
        JSON.stringify({ latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy })
      )
    } catch {
      // Storage unavailable
    }
  }, [])

  const setManualLocation = useCallback((point: GeoPoint) => {
    const manualCoords: GeoLocationCoordinatesLike = {
      latitude: point.lat,
      longitude: point.lng,
      altitude: null,
      accuracy: 10,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    }
    saveLocation(manualCoords, 'manual')
    setStatus('granted')
  }, [saveLocation])

  const detect = useCallback(() => {
    setStatus('locating')

    // Helper for IP fallback if hardware GPS times out or is denied
    const fallbackToIp = async (isDenied = false) => {
      try {
        const ipGeo = await getIpGeolocation()
        if (ipGeo) {
          const ipCoords: GeoLocationCoordinatesLike = {
            latitude: ipGeo.lat,
            longitude: ipGeo.lng,
            altitude: null,
            accuracy: 5000,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          }
          saveLocation(ipCoords, 'ip')
          setStatus(isDenied ? 'denied' : 'fallback')
          return
        }
      } catch {
        // IP geocode failed
      }
      setStatus(isDenied ? 'denied' : 'error')
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      fallbackToIp(false)
      return () => {}
    }

    // 1. Initial fast low-accuracy / cached fetch
    getCurrentPosition(false, 6000)
      .then((pos) => {
        saveLocation(pos.coords, 'gps')
        setStatus('granted')
      })
      .catch((err) => {
        if (err && (err as GeolocationPositionError).code === 1) {
          fallbackToIp(true)
        } else {
          fallbackToIp(false)
        }
      })

    // 2. High-precision continuous watcher
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        saveLocation(pos.coords, 'gps')
        setStatus('granted')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          fallbackToIp(true)
        } else {
          // If already granted, preserve
          setStatus((prev) => (prev === 'granted' ? 'granted' : 'fallback'))
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [saveLocation])

  useEffect(() => {
    const cleanup = detect()
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, [detect])

  const value = useMemo<LocationValue>(
    () => ({
      coords,
      status,
      accuracy,
      source,
      isFallback: source !== 'gps',
      refresh: detect,
      setManualLocation,
    }),
    [coords, status, accuracy, source, detect, setManualLocation],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

// Named alias for clarity and backward compatibility
export const LocationProvider = GeoLocationProvider

export function useGeoLocation(): LocationValue {
  const ctx = useContext(LocationContext)
  return ctx || defaultLocationValue
}

// Alias
export const useLocation = useGeoLocation



