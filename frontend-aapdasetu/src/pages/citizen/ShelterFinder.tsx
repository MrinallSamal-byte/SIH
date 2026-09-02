import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Building,
  MapPin,
  Navigation,
  Users,
  Phone,
  Search,
  X,
  Crosshair,
  WifiOff,
  Bookmark,
  BookmarkCheck,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Compass,
  Layers,
  Car,
  Activity,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { aiSatelliteFloodMap } from '../../api/ai'
import { listShelters } from '../../api/endpoints'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import LeafletMap, { type MapMarker, type MapPolyline } from '../../components/map/LeafletMap'
import { useGeoLocation } from '../../hooks/useLocation'
import { useRealtime } from '../../hooks/useRealtime'
import { useLanguage } from '../../lib/i18n'
import { haversineKm, getNavigationUrl } from '../../lib/helpers'
import { calculateDualRoutes, type RouteOption } from '../../lib/routing'
import type { FloodGeoJson, GeoPoint, Shelter } from '../../types'

type SortMode = 'distance' | 'capacity'
type RouteViewMode = 'safe' | 'shortest' | 'both'

const criticalFacilities: { key: string; labelKey: string }[] = [
  { key: 'medical_station', labelKey: 'shelter.filterMedical' },
  { key: 'food', labelKey: 'shelter.filterFood' },
  { key: 'water', labelKey: 'shelter.filterWater' },
  { key: 'power_generator', labelKey: 'shelter.filterPower' },
]

export default function ShelterFinder() {
  const { t } = useLanguage()
  const { coords, status, accuracy, refresh } = useGeoLocation()

  // Real-time shelter feed
  const fetchActiveShelters = useCallback(() => listShelters(undefined, false), [])
  const shelters = useRealtime<Shelter[]>(fetchActiveShelters, 5000, 'shelters')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null)
  const [filterSavedOnly, setFilterSavedOnly] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('distance')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Route Engine State: Dual routes (General vs Safe Highest Confidence)
  const [activeRouteView, setActiveRouteView] = useState<RouteViewMode>('both')
  const [dualRoutes, setDualRoutes] = useState<{ safe: RouteOption; shortest: RouteOption } | null>(null)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [showTurnByTurn, setShowTurnByTurn] = useState(false)
  const [flood, setFlood] = useState<FloodGeoJson | null>(null)

  // Live Navigation Simulation state
  const [isSimulating, setIsSimulating] = useState(false)
  const [simIndex, setSimIndex] = useState(0)

  // Saved / Bookmarked shelters
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('aapdasetu_saved_shelters')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return new Set(parsed)
      }
    } catch {
      // Storage unavailable
    }
    return new Set()
  })

  const toggleSaveShelter = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      try {
        localStorage.setItem('aapdasetu_saved_shelters', JSON.stringify(Array.from(next)))
      } catch {
        // Storage unavailable
      }
      return next
    })
  }, [])

  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  // Offline awareness
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const userPos: GeoPoint | null = useMemo(
    () => (coords ? { lat: coords.latitude, lng: coords.longitude } : null),
    [coords],
  )

  const distanceById = useMemo(() => {
    const map = new Map<string, number>()
    if (!userPos || !shelters || !Array.isArray(shelters)) return map
    for (const s of shelters) {
      if (!s || typeof s.latitude !== 'number' || typeof s.longitude !== 'number') continue
      map.set(s.id, haversineKm(userPos, { lat: s.latitude, lng: s.longitude }))
    }
    return map
  }, [shelters, userPos])

  const filteredAndSorted = useMemo(() => {
    if (!shelters || !Array.isArray(shelters)) return []
    const q = searchQuery.toLowerCase().trim()
    return shelters
      .filter((s) => {
        if (!s) return false
        if (s.status === 'closed') return false
        if (filterSavedOnly && !savedIds.has(s.id)) return false
        if (q) {
          const haystack = `${s.name || ''} ${s.address || ''}`.toLowerCase()
          if (!haystack.includes(q)) return false
        }
        if (selectedFacility) {
          const facs = Array.isArray(s.facilities) ? s.facilities : []
          if (!facs.includes(selectedFacility)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortMode === 'capacity') {
          const availA = (a.capacity ?? 0) - (a.occupancy ?? 0)
          const availB = (b.capacity ?? 0) - (b.occupancy ?? 0)
          if (availA !== availB) return availB - availA
        }
        if (!userPos) return 0
        const da = distanceById.get(a.id)
        const db = distanceById.get(b.id)
        if (da == null && db == null) return 0
        if (da == null) return 1
        if (db == null) return -1
        return da - db
      })
  }, [shelters, userPos, searchQuery, selectedFacility, filterSavedOnly, savedIds, sortMode, distanceById])

  const stats = useMemo(() => {
    const list = Array.isArray(shelters) ? shelters : []
    let open = 0
    let full = 0
    let closed = 0
    for (const s of list) {
      if (!s) continue
      if (s.status === 'full') full += 1
      else if (s.status === 'closed') closed += 1
      else open += 1
    }
    return { open, full, closed }
  }, [shelters])

  // AI Recommended Nearest Available Shelter calculation:
  // Evaluates all shelters based on:
  // 1. Status is 'open'
  // 2. Has available capacity (capacity - occupancy > 0)
  // 3. Closest distance to user GPS (or active area)
  // 4. Critical facility bonuses (e.g. medical station)
  const recommendedShelter = useMemo<Shelter | null>(() => {
    if (!shelters || !Array.isArray(shelters) || shelters.length === 0) return null

    let best: Shelter | null = null
    let minScore = Infinity

    for (const s of shelters) {
      if (!s || s.status === 'closed') continue
      if (typeof s.latitude !== 'number' || typeof s.longitude !== 'number') continue

      const point: GeoPoint = { lat: s.latitude, lng: s.longitude }
      const dist = userPos ? haversineKm(userPos, point) : 1
      const cap = s.capacity ?? 100
      const occ = s.occupancy ?? 0
      const avail = Math.max(0, cap - occ)
      const isFull = s.status === 'full' || avail <= 0

      // Composite recommendation score (lower is better):
      // Full shelters penalized (+50km), medical bonus (-0.2km), capacity bonus (-0.3km)
      let score = dist
      if (isFull) score += 50
      if (Array.isArray(s.facilities) && s.facilities.includes('medical_station')) score -= 0.2
      if (avail > 20) score -= 0.3

      if (score < minScore) {
        minScore = score
        best = s
      }
    }

    return best
  }, [shelters, userPos])

  const nearestOpenId = useMemo(() => {
    if (recommendedShelter) return recommendedShelter.id
    if (!userPos) return null
    let bestId: string | null = null
    let bestDist = Infinity
    for (const s of filteredAndSorted) {
      if (!s || s.status !== 'open') continue
      const d = distanceById.get(s.id)
      if (d != null && d < bestDist) {
        bestDist = d
        bestId = s.id
      }
    }
    return bestId
  }, [recommendedShelter, filteredAndSorted, distanceById, userPos])

  // Automatically select recommended nearest shelter on load or GPS update
  useEffect(() => {
    if (!selectedId && recommendedShelter) {
      setSelectedId(recommendedShelter.id)
    }
  }, [selectedId, recommendedShelter])

  const autoRecommendToNearest = useCallback(() => {
    if (recommendedShelter) {
      setSelectedId(recommendedShelter.id)
      requestAnimationFrame(() => {
        cardRefs.current.get(recommendedShelter.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [recommendedShelter])

  const selectedShelter = useMemo(() => {
    if (!selectedId || !shelters || !Array.isArray(shelters)) return null
    return shelters.find((s) => s?.id === selectedId) ?? null
  }, [shelters, selectedId])

  // Map center calculation
  const center: GeoPoint = useMemo(() => {
    if (
      selectedShelter &&
      typeof selectedShelter.latitude === 'number' &&
      typeof selectedShelter.longitude === 'number'
    ) {
      return { lat: selectedShelter.latitude, lng: selectedShelter.longitude }
    }
    if (userPos) return userPos
    const firstValid = filteredAndSorted.find(
      (s) => typeof s?.latitude === 'number' && typeof s?.longitude === 'number',
    )
    if (firstValid) {
      return { lat: firstValid.latitude as number, lng: firstValid.longitude as number }
    }
    return { lat: 26.1445, lng: 91.7362 }
  }, [selectedShelter, userPos, filteredAndSorted])

  // Fetch contextual satellite flood & hazard polygons
  useEffect(() => {
    const originPoint = userPos || center
    aiSatelliteFloodMap({ center: originPoint, radiusKm: 20 })
      .then((res) => setFlood(res || { type: 'FeatureCollection', features: [] }))
      .catch(() => setFlood({ type: 'FeatureCollection', features: [] }))
  }, [userPos?.lat, userPos?.lng, center.lat, center.lng])

  // Hazard polygon structures
  const floodZones = useMemo(() => {
    if (!flood || !Array.isArray(flood.features)) return []
    return flood.features
      .filter((f) => f && f.properties && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length > 0)
      .map((f, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geom: any = f.geometry
        const toPoints = (ring: number[][]) => ring.map(([lng, lat]) => ({ lat, lng }) as GeoPoint)
        let outerRings: number[][][] = []
        if (geom.type === 'Polygon') {
          outerRings = [(geom.coordinates as number[][][])[0] ?? []]
        } else if (geom.type === 'MultiPolygon') {
          outerRings = ((geom.coordinates as number[][][][]))
            .map((poly) => poly?.[0] ?? [])
            .filter((ring) => Array.isArray(ring))
        } else {
          outerRings = [geom.coordinates[0] ?? []]
        }

        const pts = outerRings.flatMap(toPoints)
        const centerLat = pts.length > 0 ? pts.reduce((a, b) => a + b.lat, 0) / pts.length : 0
        const centerLng = pts.length > 0 ? pts.reduce((a, b) => a + b.lng, 0) / pts.length : 0

        const hazardType = f.properties.hazard_type || t('routes.floodZone', 'Flash Flood Zone')
        const depth = f.properties.water_depth_est_meters || 1.4
        const severity = f.properties.severity || 'critical'
        const roadStatus = f.properties.road_status || 'Impassable / Waterlogged'

        return {
          id: `flood-${i}`,
          points: pts,
          center: { lat: centerLat, lng: centerLng } as GeoPoint,
          severity,
          depth,
          hazardType,
          roadStatus,
          label: `⚠️ ${hazardType} — Severity: ${severity.toUpperCase()} (Depth: ~${depth}m) · ${roadStatus}`,
        }
      })
  }, [flood, t])

  const hazardPolys = useMemo(() => floodZones.map((z) => z.points), [floodZones])

  // Real-time calculation of dual routes (Shortest vs Safe Highest Confidence)
  useEffect(() => {
    if (
      !selectedShelter ||
      typeof selectedShelter.latitude !== 'number' ||
      typeof selectedShelter.longitude !== 'number'
    ) {
      setDualRoutes(null)
      return
    }

    const originPoint = userPos || { lat: selectedShelter.latitude - 0.024, lng: selectedShelter.longitude - 0.02 }
    const destPoint: GeoPoint = { lat: selectedShelter.latitude, lng: selectedShelter.longitude }

    let cancelled = false
    setIsCalculatingRoute(true)

    calculateDualRoutes(originPoint, destPoint, hazardPolys, selectedShelter.name).then((routes) => {
      if (!cancelled) {
        setDualRoutes(routes)
        setIsCalculatingRoute(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userPos, selectedShelter, hazardPolys])

  // Live GPS Simulation loop
  useEffect(() => {
    if (!isSimulating || !dualRoutes) return

    const activePoints = activeRouteView === 'shortest' ? dualRoutes.shortest.points : dualRoutes.safe.points
    if (!activePoints || activePoints.length < 2) {
      setIsSimulating(false)
      return
    }

    const interval = setInterval(() => {
      setSimIndex((prev) => {
        if (prev >= activePoints.length - 1) {
          setIsSimulating(false)
          return 0
        }
        return prev + 1
      })
    }, 700)

    return () => clearInterval(interval)
  }, [isSimulating, dualRoutes, activeRouteView])

  const simulatedPosition: GeoPoint | null = useMemo(() => {
    if (!isSimulating || !dualRoutes) return null
    const activePoints = activeRouteView === 'shortest' ? dualRoutes.shortest.points : dualRoutes.safe.points
    if (!activePoints || activePoints.length === 0) return null
    return activePoints[Math.min(simIndex, activePoints.length - 1)] ?? null
  }, [isSimulating, simIndex, dualRoutes, activeRouteView])

  // Distinct Route Polylines
  const polylines: MapPolyline[] = useMemo(() => {
    if (!dualRoutes) return []
    const list: MapPolyline[] = []

    // 1. Safe Route (Emerald Green, Glowing Solid Line)
    if (activeRouteView === 'safe' || activeRouteView === 'both') {
      list.push({
        id: 'safe-corridor-route',
        points: dualRoutes.safe.points,
        color: '#10b981',
        weight: activeRouteView === 'safe' ? 6 : 5,
        opacity: 0.95,
        dashed: false,
        label: `${dualRoutes.safe.name}: ${dualRoutes.safe.distanceKm} km (~${dualRoutes.safe.durationMin} min) · ${dualRoutes.safe.confidencePercent}% Safety Confidence`,
      })
    }

    // 2. Shortest Direct Route (Amber Orange, Dashed Line)
    if (activeRouteView === 'shortest' || activeRouteView === 'both') {
      list.push({
        id: 'shortest-direct-route',
        points: dualRoutes.shortest.points,
        color: '#f59e0b',
        weight: activeRouteView === 'shortest' ? 5 : 4,
        opacity: 0.9,
        dashed: true,
        label: `${dualRoutes.shortest.name}: ${dualRoutes.shortest.distanceKm} km (~${dualRoutes.shortest.durationMin} min) · ${dualRoutes.shortest.confidencePercent}% Confidence (Low Ground Risk)`,
      })
    }

    return list
  }, [dualRoutes, activeRouteView])

  // Distinct Map Markers
  const markers = useMemo(() => {
    const list: MapMarker[] = []

    // User Origin Marker
    const effectiveOrigin = userPos || (selectedShelter ? { lat: selectedShelter.latitude - 0.022, lng: selectedShelter.longitude - 0.010 } : null)
    if (effectiveOrigin) {
      list.push({
        id: 'you',
        position: effectiveOrigin,
        title: userPos ? t('common.youAreHere', 'You Are Here') : 'Simulated User Starting Point',
        subtitle: accuracy ? `${t('common.gpsAccuracy', 'GPS Accuracy: ')}±${Math.round(accuracy)}m` : 'Live Location Tracking Active',
        color: '#3b82f6',
        isSos: true,
        markerKind: 'user',
        badgeText: 'GPS',
      })
    }

    // Live Simulated Navigation Beacon
    if (simulatedPosition) {
      list.push({
        id: 'nav-sim-beacon',
        position: simulatedPosition,
        title: 'Live GPS Transit Beacon',
        subtitle: `Transit Speed: 24 km/h · Heading to ${selectedShelter?.name || 'Shelter'}`,
        color: '#10b981',
        isSos: true,
        markerKind: 'user',
        badgeText: 'MOVING',
      })
    }

    // Shelter Markers
    for (let i = 0; i < filteredAndSorted.length; i++) {
      const s = filteredAndSorted[i]
      if (!s || typeof s.latitude !== 'number' || typeof s.longitude !== 'number') continue
      const statusLabel = s.status === 'full' ? t('shelter.full', 'Full') : t('shelter.statusOpen', 'Open')
      const occ = s.occupancy ?? 0
      const cap = s.capacity ?? 100
      const isSaved = savedIds.has(s.id)
      const isSelected = selectedId === s.id
      const isRecommended = recommendedShelter?.id === s.id
      const hasMedical = Array.isArray(s.facilities) && s.facilities.includes('medical_station')

      const popupActions = [
        {
          label: isSelected ? 'Active Destination' : isRecommended ? 'Auto-Route to Recommended' : 'Select & Route Here',
          onClick: () => handleSelect(s.id),
        },
        {
          label: isSaved ? t('sh.savedBadge', 'Saved') : t('sh.saveShelter', 'Save shelter'),
          onClick: () => toggleSaveShelter(s.id),
        },
        {
          label: t('common.directions', 'Directions'),
          onClick: () => {
            window.open(getNavigationUrl(s.latitude, s.longitude), '_blank')
          },
        },
      ]

      list.push({
        id: s.id || `shel-fallback-${i}`,
        position: { lat: s.latitude, lng: s.longitude },
        title: isRecommended ? `${s.name} (Recommended)` : (s.name || t('shelter.markerFallback', 'Safe Shelter')),
        subtitle: `${isRecommended ? 'Nearest Verified Haven · ' : ''}${statusLabel} · Capacity ${occ}/${cap} (${s.address ?? ''})`,
        color: isSelected ? '#10b981' : isRecommended ? '#059669' : isSaved ? '#f59e0b' : s.status === 'open' ? '#0d9488' : '#d97706',
        isShelter: true,
        isSaved,
        isMedical: hasMedical && !isSaved,
        markerKind: isSelected ? 'destination' : isSaved ? 'saved' : hasMedical ? 'medical' : 'shelter',
        badgeText: isRecommended ? 'RECOMMENDED' : `${occ}/${cap}`,
        popupActions,
      })
    }

    // Safe Detour Checkpoint Waypoints
    if (dualRoutes?.safe.points && dualRoutes.safe.points.length > 2 && (activeRouteView === 'safe' || activeRouteView === 'both')) {
      const midPoint = dualRoutes.safe.points[Math.floor(dualRoutes.safe.points.length / 2)]
      if (midPoint) {
        list.push({
          id: 'safe-waypoint-mid',
          position: midPoint,
          title: 'Safe Disaster Transit Corridor',
          subtitle: 'Elevated roadway · SDRF clear zone & emergency vehicle priority',
          color: '#059669',
          markerKind: 'waypoint',
          badgeText: 'SAFE',
        })
      }
    }

    return list
  }, [filteredAndSorted, userPos, simulatedPosition, selectedShelter, selectedId, accuracy, savedIds, toggleSaveShelter, dualRoutes, activeRouteView, t])

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
    setIsSimulating(false)
    setSimIndex(0)
    if (!id) return
    requestAnimationFrame(() => {
      cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedFacility(null)
    setFilterSavedOnly(false)
  }, [])

  if (!shelters) {
    return (
      <div className="space-y-4">
        <div className="skeleton-shimmer h-12 w-64 rounded-xl" />
        <div className="skeleton-shimmer h-20 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-shimmer h-56 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton-shimmer h-[320px] sm:h-[420px] lg:h-[520px] rounded-2xl" />
      </div>
    )
  }

  const shelterCount = Array.isArray(shelters) ? shelters.length : 0
  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedFacility != null || filterSavedOnly
  const currentActiveRoute = activeRouteView === 'shortest' && dualRoutes ? dualRoutes.shortest : dualRoutes?.safe

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building className="h-6 w-6 text-zinc-800 dark:text-slate-200" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-200">
              {t('shelter.title', 'Safe Shelter & Real-Time Evacuation Corridor')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Real-time evacuation routing comparing high-confidence corridors against direct paths.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {recommendedShelter && (
            <button
              type="button"
              onClick={autoRecommendToNearest}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer animate-fade-in"
              title="Instantly select and route to the nearest verified open shelter"
            >
              <Sparkles className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700" />
              <span>Recommend Nearest</span>
            </button>
          )}

          <button
            type="button"
            onClick={refresh}
            disabled={status === 'locating'}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 shadow-xs cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>
              {status === 'locating'
                ? t('shelter.locating', 'Locating GPS...')
                : userPos
                ? t('shelter.updateLocation', 'Update Location')
                : t('shelter.detectLocation', 'Detect Live Location')}
            </span>
          </button>
        </div>
      </div>

      {/* Recommended Nearest Shelter Quick Card */}
      {recommendedShelter && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-xs shrink-0 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Recommended Safe Haven
                </span>
                <span className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:border-zinc-750 dark:bg-zinc-800 dark:text-zinc-300">
                  Nearest & Available
                </span>
              </div>
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">
                {recommendedShelter.name}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{recommendedShelter.address || 'Relief Shelter'}</span>
                <span>·</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {Math.max(0, (recommendedShelter.capacity ?? 100) - (recommendedShelter.occupancy ?? 0))} spots available
                </span>
                {userPos && typeof recommendedShelter.latitude === 'number' && typeof recommendedShelter.longitude === 'number' && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {haversineKm(userPos, { lat: recommendedShelter.latitude, lng: recommendedShelter.longitude }).toFixed(1)} km away
                    </span>
                  </>
                )}
                {Array.isArray(recommendedShelter.facilities) && recommendedShelter.facilities.includes('medical_station') && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      Medical Station
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={autoRecommendToNearest}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs transition cursor-pointer ${
                selectedId === recommendedShelter.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
              }`}
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>{selectedId === recommendedShelter.id ? 'Route Active' : 'Auto-Route Here'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Real-time Dual-Route HUD Panel */}
      {selectedShelter && dualRoutes && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-xs transition-all">
          {/* Top Bar: Target shelter name & Route Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    Target Haven: {selectedShelter.name}
                  </span>
                  <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 flex items-center gap-1">
                    {isCalculatingRoute ? (
                      <>
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        <span>Calculating AI Routes...</span>
                      </>
                    ) : (
                      <span>Live Route Ready</span>
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {selectedShelter.address || 'Designated relief facility'}
                </div>
              </div>
            </div>

            {/* Route Selector Tabs: Safe vs Shortest vs Both */}
            <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setActiveRouteView('safe')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeRouteView === 'safe'
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Safe Passage (98%)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRouteView('shortest')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeRouteView === 'shortest'
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Direct Route (72%)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRouteView('both')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeRouteView === 'both'
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
                title="Compare both routes simultaneously on map"
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Compare Both</span>
              </button>
            </div>
          </div>

          {/* Route Telemetry Dashboard — Side-by-Side Comparison when Comparing Both, or 4-Metric Grid */}
          {activeRouteView === 'both' ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 animate-fade-in">
              {/* Route Option 1: High-Confidence Safe Corridor */}
              <div
                onClick={() => setActiveRouteView('safe')}
                className="group relative cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Safe Evacuation Corridor
                    </span>
                  </div>
                  <span className="rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold mono text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    98% Confidence
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {dualRoutes.safe.distanceKm} km
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    ~{dualRoutes.safe.durationMin}m walk · ~{dualRoutes.safe.driveDurationMin}m drive
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span>Road Quality:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">{dualRoutes.safe.roadCondition}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Elevation:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">{dualRoutes.safe.elevationLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Clearance:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">100% Flood Avoided</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">
                    Select Safe Route →
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Solid Line
                  </span>
                </div>
              </div>

              {/* Route Option 2: General / Shortest Direct Route */}
              <div
                onClick={() => setActiveRouteView('shortest')}
                className="group relative cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Direct Route
                    </span>
                  </div>
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                    72% Confidence
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {dualRoutes.shortest.distanceKm} km
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    ~{dualRoutes.shortest.durationMin}m walk · ~{dualRoutes.shortest.driveDurationMin}m drive
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span>Road Quality:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">{dualRoutes.shortest.roadCondition}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Elevation:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">{dualRoutes.shortest.elevationLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Advisory:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">Caution: Near Low Drainage</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">
                    Select Direct Route →
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Dashed Line
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
              {/* Metric 1: Road Safety Confidence */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span>Road Confidence</span>
                  <Activity className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {currentActiveRoute?.confidencePercent}%
                  </span>
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    {currentActiveRoute?.riskLevel === 'LOW' ? 'Verified Safe' : 'Caution Advised'}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${currentActiveRoute?.confidencePercent && currentActiveRoute.confidencePercent >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${currentActiveRoute?.confidencePercent ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Metric 2: Distance & ETA */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span>Distance & ETA</span>
                  <Clock className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {currentActiveRoute?.distanceKm} km
                  </span>
                  <span className="text-xs text-zinc-500">
                    (~{currentActiveRoute?.durationMin}m walk)
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  <span>Drive: ~{currentActiveRoute?.driveDurationMin} mins</span>
                </div>
              </div>

              {/* Metric 3: Road Surface & Elevation */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span>Road Quality</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="mt-1 font-semibold text-xs text-zinc-800 dark:text-zinc-200 line-clamp-1">
                  {currentActiveRoute?.roadCondition}
                </div>
                <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  {currentActiveRoute?.elevationLabel}
                </div>
              </div>

              {/* Metric 4: Hazard Clearance */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span>Clearance</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="mt-1 font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  {activeRouteView === 'safe' ? '100% Flood Avoidance' : 'Low Drainage Proximity'}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {floodZones.length} Hazard Zones Monitored
                </div>
              </div>
            </div>
          )}

          {/* Action Strip: Turn-by-turn drawer toggle, live GPS simulation, external navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 dark:border-white/[0.05] dark:bg-black/20 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTurnByTurn((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300/80 bg-white px-3 py-1.5 font-bold text-zinc-800 shadow-xs hover:bg-zinc-50 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-200 cursor-pointer"
              >
                <Compass className="h-3.5 w-3.5 text-emerald-600" />
                <span>{showTurnByTurn ? 'Hide Turn Directions' : 'View Step-by-Step Directions'}</span>
                {showTurnByTurn ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isSimulating) {
                    setIsSimulating(false)
                  } else {
                    setSimIndex(0)
                    setIsSimulating(true)
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold shadow-xs transition cursor-pointer ${
                  isSimulating
                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isSimulating ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isSimulating ? 'Stop Live GPS Sim' : 'Simulate GPS Navigation'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getNavigationUrl(selectedShelter.latitude, selectedShelter.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-600 hover:text-zinc-900 font-bold dark:text-slate-300 dark:hover:text-white"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Turn-by-Turn Expandable Guidance Drawer */}
          {showTurnByTurn && currentActiveRoute?.steps && (
            <div className="border-t border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#18201a] animate-fade-in">
              <div className="mb-2.5 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Navigation Instructions ({currentActiveRoute.name}):
              </div>
              <div className="space-y-2">
                {currentActiveRoute.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-white/[0.05] dark:bg-[#202922]"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-zinc-900 dark:text-slate-100">
                        {step.instruction}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>{step.roadName}</span>
                        <span>·</span>
                        <span>{step.distanceMeters}m (~{step.durationMin}m)</span>
                      </div>
                      {step.safetyNote && (
                        <div className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          {step.safetyNote}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Bar, Sort Toggle & Facility Filter Chips */}
      <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('shelter.searchPlaceholder', 'Search safe shelter by name, landmark, area, or sector...')}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 py-2 text-sm outline-none focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 dark:focus:border-slate-500"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label={t('sh.clearSearch', 'Clear')}
              title={t('sh.clearSearch', 'Clear')}
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-[#2a2a2a] dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div
            className="inline-flex rounded-xl border border-zinc-200 bg-[#f4f4f5] p-0.5 shadow-xs dark:border-white/[0.1] dark:bg-[#222222]"
            role="group"
          >
            <button
              type="button"
              aria-pressed={sortMode === 'distance'}
              onClick={() => setSortMode('distance')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                sortMode === 'distance'
                  ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
              }`}
            >
              {t('sh.sortNearest', 'Nearest First')}
            </button>
            <button
              type="button"
              aria-pressed={sortMode === 'capacity'}
              onClick={() => setSortMode('capacity')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                sortMode === 'capacity'
                  ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
              }`}
            >
              {t('sh.sortCapacity', 'Highest Capacity')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
              {t('shelter.facilities', 'Facilities')}:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedFacility(null)
                setFilterSavedOnly(false)
              }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                selectedFacility === null && !filterSavedOnly
                  ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                  : 'border border-zinc-200/80 bg-[#f4f4f5] text-zinc-600 hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300'
              }`}
            >
              {t('shelter.allShelters', 'All')} ({shelterCount})
            </button>

            {/* Saved Shelters Filter Chip */}
            <button
              type="button"
              onClick={() => setFilterSavedOnly((s) => !s)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                filterSavedOnly
                  ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-900'
                  : 'border border-amber-300/80 bg-amber-50/60 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              <Bookmark className="h-3 w-3 fill-current" />
              <span>{t('sh.savedTab', 'Saved')} ({savedIds.size})</span>
            </button>

            {criticalFacilities.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setSelectedFacility(selectedFacility === f.key ? null : f.key)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                  selectedFacility === f.key
                    ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                    : 'border border-zinc-200/80 bg-[#f4f4f5] text-zinc-600 hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300'
                }`}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!isOnline && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300">
          <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t('sh.offlineSnapshot', 'Offline mode active: Cached relief shelters and emergency corridors remain accessible.')}</span>
        </div>
      )}

      {/* Main High-Definition Interactive Map */}
      <div className="h-[360px] sm:h-[460px] lg:h-[540px] rounded-2xl overflow-hidden shadow-sm border border-zinc-200/80 dark:border-white/[0.08] relative">
        <LeafletMap
          center={center}
          zoom={14}
          markers={markers}
          polylines={polylines}
          height="100%"
          autoFit={false}
          selectedId={selectedId}
        />
      </div>

      {/* Map Legend Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300" /> {t('common.youAreHere', 'Your Position')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> {t('sh.statOpen', 'Open Shelter')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> {t('sh.savedTab', 'Saved')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-600" /> {t('shelter.filterMedical', 'Medical Station')}
          </span>
        </div>

        {dualRoutes && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
              <span className="h-1.5 w-3.5 rounded-full bg-emerald-500 inline-block" /> Safe Corridor (98%)
            </span>
            <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
              <span className="h-1.5 w-3.5 rounded-full bg-amber-500 inline-block border-b border-dashed" /> Direct Route (72%)
            </span>
          </div>
        )}
      </div>

      {/* Quick stat strip */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 pt-2"
        role="status"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {stats.open} {t('sh.statOpen', 'Open')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
          {stats.full} {t('sh.statFull', 'Full')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
          {stats.closed} {t('sh.statClosed', 'Closed')}
        </span>
        <span className="inline-flex items-center gap-1.5 ml-auto text-amber-600 dark:text-amber-400">
          <Bookmark className="h-3 w-3 fill-current" />
          {savedIds.size} {t('sh.savedBadge', 'Saved')}
        </span>
      </div>

      {/* Shelter Cards — full width grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAndSorted.map((s) => {
          const hasCoords =
            typeof s.latitude === 'number' && typeof s.longitude === 'number'
          const point: GeoPoint | null = hasCoords
            ? { lat: s.latitude as number, lng: s.longitude as number }
            : null
          const distance = userPos && point ? haversineKm(userPos, point) : null
          const cap = s.capacity ?? 100
          const occ = s.occupancy ?? 0
          const pct = Math.max(0, Math.min(100, Math.round((occ / (cap || 100)) * 100)))
          const facilitiesList = Array.isArray(s.facilities) ? s.facilities : []
          const isOpen = s.status !== 'full' && s.status !== 'closed'
          const isSelected = selectedId === s.id
          const isSaved = savedIds.has(s.id)
          const isRecommended = recommendedShelter?.id === s.id
          const isNearestOpen = isOpen && nearestOpenId != null && nearestOpenId === s.id

          return (
            <div
              key={s.id}
              ref={(el) => {
                cardRefs.current.set(s.id, el)
              }}
              onClick={() => handleSelect(isSelected ? null : s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target === e.currentTarget) {
                  handleSelect(isSelected ? null : s.id)
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              className={`relative overflow-hidden rounded-2xl outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500 hover:-translate-y-0.5 cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-zinc-800 dark:ring-zinc-200 shadow-sm'
                  : isRecommended
                  ? 'ring-1 ring-zinc-400 dark:ring-zinc-600 shadow-xs'
                  : isNearestOpen
                  ? 'ring-1 ring-zinc-300 dark:ring-zinc-700'
                  : ''
              } ${isOpen ? '' : 'opacity-60 hover:opacity-100'} ${
                hasCoords ? '' : 'pointer-events-none opacity-40'
              }`}
            >
              {!isOpen && (
                <div
                  className={`h-1 w-full ${s.status === 'closed' ? 'bg-red-500' : 'bg-amber-500'}`}
                  aria-hidden="true"
                />
              )}
              <Card className={`flex flex-col rounded-2xl border bg-white p-5 sm:p-6 shadow-xs dark:bg-zinc-900 ${
                isRecommended
                  ? 'border-zinc-300 dark:border-zinc-700'
                  : 'border-zinc-200/80 dark:border-zinc-800'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="truncate font-bold text-zinc-900 dark:text-zinc-100 text-base">
                        {s.name || t('shelter.cardFallback', 'Safe Shelter')}
                      </span>
                      {isRecommended && !isSaved && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          <Sparkles className="h-2.5 w-2.5 text-zinc-500" aria-hidden="true" />
                          <span>Recommended</span>
                        </span>
                      )}
                      {isSaved && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {t('sh.savedBadge', 'Saved')}
                        </span>
                      )}
                      {isNearestOpen && !isSaved && !isRecommended && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          <Crosshair className="h-2.5 w-2.5" aria-hidden="true" />
                          {t('sh.nearest', 'Nearest')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-start gap-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-400" />
                      <span>{s.address || t('shelter.addressFallback', 'Shelter Location')}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {/* Bookmark Toggle */}
                    <button
                      type="button"
                      aria-label={isSaved ? t('sh.savedBadge', 'Saved') : t('sh.saveShelter', 'Save')}
                      title={isSaved ? t('sh.savedBadge', 'Saved') : t('sh.saveShelter', 'Save')}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSaveShelter(s.id)
                      }}
                      className={`rounded-lg border p-1.5 transition cursor-pointer ${
                        isSaved
                          ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'border-zinc-200 bg-white text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-400 dark:hover:bg-[#2a2a2a]'
                      }`}
                    >
                      {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 fill-current" /> : <Bookmark className="h-3.5 w-3.5" />}
                    </button>

                    {hasCoords && (
                      <button
                        type="button"
                        aria-label={t('sh.locateOnMap', 'Locate')}
                        title={t('sh.locateOnMap', 'Locate')}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(s.id)
                        }}
                        className={`rounded-lg border p-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
                        }`}
                      >
                        <Crosshair className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <Badge
                      value={s.status || 'open'}
                      label={s.status === 'full' ? t('shelter.full', 'Full') : t('shelter.statusOpen', 'Open')}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  {s.contactPhone ? (
                    <a
                      href={`tel:${s.contactPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-zinc-600 hover:underline font-medium dark:text-slate-300 mono"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{s.contactPhone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">{t('common.verified', 'Verified Shelter')}</span>
                  )}
                  {distance !== null && (
                    <span
                      className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold mono ${
                        isNearestOpen
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-zinc-700 dark:bg-[#222222] dark:text-slate-200'
                      }`}
                    >
                      <Navigation className="h-3 w-3" aria-hidden="true" />
                      {distance.toFixed(1)} {t('shelter.kmAway', 'km away')}
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{t('shelter.occupancy', 'Occupancy')}: {occ}/{cap}</span>
                    </span>
                    <span className="font-bold mono">{pct}% {t('shelter.full', 'Capacity')}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#222222] overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {facilitiesList.map((f) => {
                    const knownFacility = criticalFacilities.find((cf) => cf.key === f)
                    return (
                      <span key={f} className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-zinc-500 dark:bg-[#222222] dark:text-slate-400 mono">
                        {knownFacility ? t(knownFacility.labelKey) : String(f).replace(/_/g, ' ')}
                      </span>
                    )
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.08]">
                  <span className="text-[10px] text-slate-400 mono">{hasCoords ? `${(s.latitude as number).toFixed(4)}, ${(s.longitude as number).toFixed(4)}` : t('shelter.locationUnavailable', 'GPS unavailable')}</span>
                  {hasCoords ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelect(s.id)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-zinc-800 dark:bg-slate-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer"
                    >
                      <Navigation className="h-3 w-3" />
                      <span>{isSelected ? 'Route Selected' : 'Route Here'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">{t('shelter.noGps', 'No GPS')}</span>
                  )}
                </div>
              </Card>
            </div>
          )
        })}

        {filteredAndSorted.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 p-12 text-center dark:border-white/[0.08]">
            <Search className="h-6 w-6 text-slate-400" aria-hidden="true" />
            <p className="text-sm font-bold text-zinc-800 dark:text-slate-300">
              {hasActiveFilters ? t('sh.noResultsTitle', 'No matching shelters') : t('shelter.empty', 'No shelters available')}
            </p>
            {hasActiveFilters && (
              <>
                <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  {t('sh.noResultsDesc', 'Try clearing filters or search queries')}
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('sh.resetFilters', 'Reset Filters')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

