/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getCurrentPosition, getHighPrecisionPosition, getIpGeolocation, reverseGeocode } from '../lib/helpers'
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
  address: string | null
  status: LocationStatus
  accuracy: number | null
  source: LocationSource
  isFallback: boolean
  /** When the current cached fix was captured (ms epoch). Life-critical
   * consumers use this to refuse stale coordinates as a dispatch location. */
  cachedAt: number | null
  refresh: () => void
  locateHighAccuracy: () => Promise<GeoLocationCoordinatesLike | null>
  setManualLocation: (point: GeoPoint, customAddress?: string) => void
  setAddress: (addr: string) => void
}

const STORAGE_KEY_LOCATION = 'aapdasetu_last_coords'
const STORAGE_KEY_ADDRESS = 'aapdasetu_last_address'

const DEFAULT_FALLBACK_LOCATION: GeoLocationCoordinatesLike = {
  latitude: 26.1445,
  longitude: 91.7362,
  altitude: null,
  accuracy: 1000,
  altitudeAccuracy: null,
  heading: null,
  speed: null,
}

interface StoredLocation {
  coords: GeoLocationCoordinatesLike
  at: number | null
}

function getStoredLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCATION)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        // Discard stale cached coordinates outside Assam region (lat 24-29, lng 89-97)
        if (parsed.latitude < 24 || parsed.latitude > 29 || parsed.longitude < 89 || parsed.longitude > 97) {
          localStorage.removeItem(STORAGE_KEY_LOCATION)
          localStorage.removeItem(STORAGE_KEY_ADDRESS)
          return null
        }
        return {
          coords: {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            altitude: null,
            accuracy: parsed.accuracy ?? 100,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          at: typeof parsed.at === 'number' ? parsed.at : null,
        }
      }
    }
  } catch {
    // Storage access blocked
  }
  return null
}

function getStoredAddress(): string | null {
  try {
    const storedAddr = localStorage.getItem(STORAGE_KEY_ADDRESS)
    if (storedAddr && (storedAddr.includes('Bhubaneswar') || storedAddr.includes('Kolkata') || storedAddr.includes('Odisha') || storedAddr.includes('West Bengal'))) {
      localStorage.removeItem(STORAGE_KEY_ADDRESS)
      return null
    }
    return storedAddr
  } catch {
    return null
  }
}

const initialStored = getStoredLocation()

const defaultLocationValue: LocationValue = {
  coords: initialStored?.coords || DEFAULT_FALLBACK_LOCATION,
  address: getStoredAddress() || 'Guwahati, Assam',
  status: 'idle',
  accuracy: initialStored?.coords.accuracy ?? 100,
  source: initialStored ? 'cached' : 'default',
  isFallback: true,
  cachedAt: initialStored?.at ?? null,
  refresh: () => {},
  locateHighAccuracy: async () => null,
  setManualLocation: () => {},
  setAddress: () => {},
}

const LocationContext = createContext<LocationValue>(defaultLocationValue)

export function GeoLocationProvider({ children }: { children: ReactNode }) {
  const initialCached = useMemo(() => getStoredLocation(), [])
  const initialAddress = useMemo(() => getStoredAddress(), [])
  const [coords, setCoords] = useState<GeoLocationCoordinatesLike | null>(
    initialCached?.coords || DEFAULT_FALLBACK_LOCATION
  )
  const [address, setAddressState] = useState<string | null>(
    initialAddress || 'Guwahati, Assam'
  )
  const [status, setStatus] = useState<LocationStatus>(initialCached ? 'fallback' : 'idle')
  const [accuracy, setAccuracy] = useState<number | null>(initialCached?.coords.accuracy ?? null)
  const [source, setSource] = useState<LocationSource>(initialCached ? 'cached' : 'default')
  const [cachedAt, setCachedAt] = useState<number | null>(initialCached?.at ?? null)
  const isManualRef = useRef<boolean>(false)

  const setAddress = useCallback((addr: string) => {
    setAddressState(addr)
    try {
      localStorage.setItem(STORAGE_KEY_ADDRESS, addr)
    } catch {
      // Storage unavailable
    }
  }, [])

  // Reverse geocoding is rate-limited on the public Nominatim instance and
  // battery-hungry at watchPosition frequency (~1 Hz) — quantize to one call
  // per 45 s or per ~150 m of movement, whichever comes first.
  const lastGeocodeRef = useRef<{ at: number; lat: number; lng: number }>({ at: 0, lat: NaN, lng: NaN })

  const saveLocation = useCallback(
    (c: GeoLocationCoordinatesLike, src: LocationSource, skipReverseGeocode = false) => {
      // A manually pinned location must never be clobbered by a late-resolving
      // one-shot GPS/IP promise (detect() can still be in flight for ~10s).
      if (isManualRef.current && src !== 'manual') return
      const capturedAt = Date.now()
      setCoords(c)
      setAccuracy(c.accuracy)
      setSource(src)
      setCachedAt(capturedAt)
      try {
        localStorage.setItem(
          STORAGE_KEY_LOCATION,
          JSON.stringify({ latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy, at: capturedAt })
        )
      } catch {
        // Storage unavailable
      }

      if (skipReverseGeocode || isManualRef.current) return

      const last = lastGeocodeRef.current
      const movedKm =
        Number.isFinite(last.lat)
          ? Math.hypot(c.latitude - last.lat, c.longitude - last.lng) * 111
          : Infinity
      if (Date.now() - last.at < 45_000 && movedKm < 0.15) return

      // Arm the throttle BEFORE the call: if the geocoder is erroring/timing
      // out, a rejected promise must not leave the throttle disengaged while
      // the GPS watch streams fixes at ~1 Hz.
      lastGeocodeRef.current = { at: Date.now(), lat: c.latitude, lng: c.longitude }

      // Auto reverse geocode
      reverseGeocode({ lat: c.latitude, lng: c.longitude })
        .then((addr) => {
          if (addr && !isManualRef.current) {
            setAddressState(addr)
            try {
              localStorage.setItem(STORAGE_KEY_ADDRESS, addr)
            } catch {
              // Storage unavailable
            }
          }
        })
        .catch(() => {})
    },
    []
  )

  const watchIdRef = useRef<number | null>(null)
  // ponytail: latest detect() cleanup lives here so watches started outside the
  // mount effect (refresh / visibilitychange) are still released on unmount
  const detectCleanupRef = useRef<(() => void) | null>(null)
  const manualResetTimerRef = useRef<number | null>(null)

  const setManualLocation = useCallback((point: GeoPoint, customAddress?: string) => {
    // Sticky override: a manually pinned location stays authoritative until
    // the user explicitly re-locates (refresh / locateHighAccuracy).
    isManualRef.current = true
    if (manualResetTimerRef.current) {
      window.clearTimeout(manualResetTimerRef.current)
      manualResetTimerRef.current = null
    }
    const manualCoords: GeoLocationCoordinatesLike = {
      latitude: point.lat,
      longitude: point.lng,
      altitude: null,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    }
    saveLocation(manualCoords, 'manual', true)
    setStatus('granted')
    if (customAddress) {
      setAddress(customAddress)
    } else {
      reverseGeocode(point).then((addr) => {
        if (addr) setAddress(addr)
      })
    }
  }, [saveLocation, setAddress])

  const ipInFlightRef = useRef(false)
  const fallbackToIp = useCallback(async (isDenied = false) => {
    if (ipInFlightRef.current) return
    ipInFlightRef.current = true
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
        saveLocation(ipCoords, 'ip', isManualRef.current)
        setStatus(isDenied ? 'denied' : 'fallback')
        if (!isManualRef.current && (ipGeo.city || ipGeo.district)) {
          const locName = [ipGeo.city, ipGeo.district].filter(Boolean).join(', ')
          setAddress(locName)
        }
        return
      }
    } catch {
      // IP geocode failed
    } finally {
      ipInFlightRef.current = false
    }
    setStatus(isDenied ? 'denied' : 'error')
  }, [saveLocation, setAddress])

  const detect = useCallback(() => {
    setStatus('locating')

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      fallbackToIp(false)
      detectCleanupRef.current = null
      return () => {}
    }

    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current)
      } catch {
        // watch may already be cleared by the browser or another cleanup pass
      }
      watchIdRef.current = null
    }

    getHighPrecisionPosition()
      .then((pos) => {
        saveLocation(pos.coords, 'gps', isManualRef.current)
        setStatus('granted')
      })
      .catch((err) => {
        if (err && (err as GeolocationPositionError).code === 1) {
          fallbackToIp(true)
        } else {
          getCurrentPosition(false, 8000, 30000)
            .then((pos) => {
              saveLocation(pos.coords, 'gps', isManualRef.current)
              setStatus('granted')
            })
            .catch(() => fallbackToIp(false))
        }
      })

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isManualRef.current) {
          saveLocation(pos.coords, 'gps')
          setStatus('granted')
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          fallbackToIp(true)
        } else {
          setStatus((prev) => (prev === 'granted' ? 'granted' : 'fallback'))
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    )
    watchIdRef.current = watchId

    const cleanup = () => {
      try {
        navigator.geolocation.clearWatch(watchId)
      } catch {
        // watch may already be cleared by the browser or another cleanup pass
      }
      if (watchIdRef.current === watchId) watchIdRef.current = null
    }
    detectCleanupRef.current = cleanup
    return cleanup
  }, [fallbackToIp, saveLocation])

  const locateHighAccuracy = useCallback(async (): Promise<GeoLocationCoordinatesLike | null> => {
    setStatus('locating')
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current)
      } catch {
        // watch may already be cleared by the browser or another cleanup pass
      }
      watchIdRef.current = null
    }
    if (manualResetTimerRef.current) {
      window.clearTimeout(manualResetTimerRef.current)
      manualResetTimerRef.current = null
    }
    isManualRef.current = false
    try {
      const pos = await getHighPrecisionPosition()
      saveLocation(pos.coords, 'gps')
      setStatus('granted')
      return pos.coords
    } catch {
      try {
        const pos = await getCurrentPosition(false, 8000, 10000)
        saveLocation(pos.coords, 'gps')
        setStatus('granted')
        return pos.coords
      } catch {
        fallbackToIp(false)
        return null
      }
    }
  }, [fallbackToIp, saveLocation])

  useEffect(() => {
    detect()
    return () => {
      detectCleanupRef.current?.()
      detectCleanupRef.current = null
    }
  }, [detect])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (watchIdRef.current !== null) {
          try { navigator.geolocation.clearWatch(watchIdRef.current) } catch { /* already cleared */ }
          watchIdRef.current = null
        }
      } else if (watchIdRef.current === null && status !== 'denied' && !isManualRef.current) {
        const c = detect()
        void c
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [detect, status])

  const releaseManualOverride = useCallback(() => {
    isManualRef.current = false
    if (manualResetTimerRef.current) {
      window.clearTimeout(manualResetTimerRef.current)
      manualResetTimerRef.current = null
    }
  }, [])

  // User-initiated rescan: intentionally lifts the sticky manual override.
  const refresh = useCallback(() => {
    releaseManualOverride()
    detect()
  }, [detect, releaseManualOverride])

  const value = useMemo<LocationValue>(
    () => ({
      coords,
      address,
      status,
      accuracy,
      source,
      isFallback: source !== 'gps',
      cachedAt,
      refresh,
      locateHighAccuracy,
      setManualLocation,
      setAddress,
    }),
    [coords, address, status, accuracy, source, cachedAt, refresh, locateHighAccuracy, setManualLocation, setAddress],
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




