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
  WifiOff
} from 'lucide-react'
import { listShelters } from '../../api/endpoints'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import LeafletMap from '../../components/map/LeafletMap'
import { useGeoLocation } from '../../hooks/useLocation'
import { useRealtime } from '../../hooks/useRealtime'
import { useLanguage } from '../../lib/i18n'
import { haversineKm, getNavigationUrl } from '../../lib/helpers'
import type { GeoPoint, Shelter } from '../../types'
import type { MapMarker } from '../../components/map/LeafletMap'

type SortMode = 'distance' | 'capacity'

const criticalFacilities: { key: string; labelKey: string }[] = [
  { key: 'medical_station', labelKey: 'shelter.filterMedical' },
  { key: 'food', labelKey: 'shelter.filterFood' },
  { key: 'water', labelKey: 'shelter.filterWater' },
  { key: 'power_generator', labelKey: 'shelter.filterPower' },
]

export default function ShelterFinder() {
  const { t } = useLanguage()
  const { coords, status, accuracy, refresh } = useGeoLocation()

  // Real-time shelter feed: only fetches active/allowed shelters (not closed).
  // Snapshot cache paints last known list instantly on repeat visits.
  const fetchActiveShelters = useCallback(() => listShelters(undefined, false), [])
  const shelters = useRealtime<Shelter[]>(fetchActiveShelters, 5000, 'shelters')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('distance')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  // Offline awareness — snapshot seeding from useRealtime keeps last known data visible.
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
  }, [shelters, userPos, searchQuery, selectedFacility, sortMode, distanceById])

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

  const nearestOpenId = useMemo(() => {
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
  }, [filteredAndSorted, distanceById, userPos])

  const selectedShelter = useMemo(() => {
    if (!selectedId || !shelters || !Array.isArray(shelters)) return null
    return shelters.find((s) => s?.id === selectedId) ?? null
  }, [shelters, selectedId])

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
    return { lat: 22.5726, lng: 88.3639 }
  }, [selectedShelter, userPos, filteredAndSorted])

  // Content signature lets identical poll payloads skip marker object rebuilds entirely.
  const markerSignature = useMemo(
    () =>
      filteredAndSorted
        .map(
          (s) =>
            `${s.id}:${s.latitude},${s.longitude},${s.status},${s.occupancy},${s.capacity},${s.name},${s.address ?? ''}`,
        )
        .join('|'),
    [filteredAndSorted],
  )

  const markers = useMemo(() => {
    const list: MapMarker[] = []
    if (userPos) {
      list.push({
        id: 'you',
        position: userPos,
        title: t('common.youAreHere'),
        subtitle: accuracy
          ? `${t('common.gpsAccuracy')}${Math.round(accuracy)}m`
          : t('shelter.currentLocation'),
        color: '#3b82f6',
        isSos: true,
      })
    }
    for (let i = 0; i < filteredAndSorted.length; i++) {
      const s = filteredAndSorted[i]
      if (!s) continue
      if (typeof s.latitude !== 'number' || typeof s.longitude !== 'number') continue
      const statusLabel = s.status === 'full' ? t('shelter.full') : t('shelter.statusOpen')
      const occ = s.occupancy ?? 0
      const cap = s.capacity ?? 100
      list.push({
        id: s.id || `shel-fallback-${i}`,
        position: { lat: s.latitude, lng: s.longitude },
        title: s.name || t('shelter.markerFallback'),
        subtitle: `${statusLabel} · ${t('routes.occupancy')} ${occ}/${cap} (${s.address ?? ''})`,
        color: s.status === 'open' ? '#10b981' : '#f59e0b',
        isShelter: true,
      })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerSignature, userPos, accuracy, t])

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
    if (!id) return
    requestAnimationFrame(() => {
      cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedFacility(null)
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
  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedFacility != null

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building className="h-6 w-6 text-zinc-800 dark:text-slate-300" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-300">
              {t('shelter.title')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('shelter.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={status === 'locating'}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-200 shadow-sm cursor-pointer"
        >
          <MapPin className="h-3.5 w-3.5 text-zinc-800 dark:text-slate-300" />
          <span>
            {status === 'locating'
              ? t('shelter.locating')
              : userPos
              ? t('shelter.updateLocation')
              : t('shelter.detectLocation')}
          </span>
        </button>
      </div>

      {/* Search Bar, Sort Toggle & Facility Filter Chips */}
      <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('shelter.searchPlaceholder')}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 py-2 text-sm outline-none focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 dark:focus:border-slate-500"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label={t('sh.clearSearch')}
              title={t('sh.clearSearch')}
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-[#2a2a2a] dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div
            className="inline-flex rounded-xl border border-zinc-200 bg-[#f4f4f5] p-0.5 shadow-sm dark:border-white/[0.1] dark:bg-[#222222]"
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
              {t('sh.sortNearest')}
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
              {t('sh.sortCapacity')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
              {t('shelter.facilities')}:
            </span>
            <button
              type="button"
              onClick={() => setSelectedFacility(null)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                selectedFacility === null
                  ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                  : 'border border-zinc-200/80 bg-[#f4f4f5] text-zinc-600 hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300'
              }`}
            >
              {t('shelter.allShelters')} ({shelterCount})
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
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300">
          <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t('sh.offlineSnapshot')}</span>
        </div>
      )}

      {/* Map-first layout: stacks above the list naturally on mobile */}
      <div className="mt-4 h-[320px] sm:h-[420px] lg:h-[520px] rounded-2xl overflow-hidden shadow-sm border border-zinc-200/80 dark:border-white/[0.08]">
        <LeafletMap
          center={center}
          zoom={14}
          markers={markers}
          height="100%"
          selectedId={selectedId}
        />
      </div>

      {/* Quick stat strip */}
      <div
        className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
        role="status"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {stats.open} {t('sh.statOpen')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
          {stats.full} {t('sh.statFull')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
          {stats.closed} {t('sh.statClosed')}
        </span>
      </div>

      {/* Shelter Cards — full width grid */}
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAndSorted.map((s) => {
          const hasCoords =
            typeof s.latitude === 'number' && typeof s.longitude === 'number'
          const point: GeoPoint | null = hasCoords
            ? { lat: s.latitude as number, lng: s.longitude as number }
            : null
          const distance = userPos && point ? haversineKm(userPos, point) : null
          const cap = s.capacity ?? 100
          const occ = s.occupancy ?? 0
          // Clamp guards NaN/overflow labels when cap is 0 or occupancy exceeds it.
          const pct = Math.max(0, Math.min(100, Math.round((occ / (cap || 100)) * 100)))
          const facilitiesList = Array.isArray(s.facilities) ? s.facilities : []
          const isOpen = s.status !== 'full' && s.status !== 'closed'
          const isSelected = selectedId === s.id
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
              className={`relative overflow-hidden rounded-2xl outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-slate-500 hover:-translate-y-0.5 cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-zinc-800 dark:ring-slate-200'
                  : isNearestOpen
                  ? 'ring-2 ring-emerald-500 dark:ring-emerald-400'
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
              <Card className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate font-bold text-zinc-800 dark:text-slate-300 text-base">
                        {s.name || t('shelter.cardFallback')}
                      </span>
                      {isNearestOpen && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                          <Crosshair className="h-2.5 w-2.5" aria-hidden="true" />
                          {t('sh.nearest')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-start gap-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span>{s.address || t('shelter.addressFallback')}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {hasCoords && (
                      <button
                        type="button"
                        aria-label={t('sh.locateOnMap')}
                        title={t('sh.locateOnMap')}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(s.id)
                        }}
                        className={`rounded-lg border p-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'border-zinc-800 bg-zinc-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
                        }`}
                      >
                        <Crosshair className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <Badge
                      value={s.status || 'open'}
                      label={s.status === 'full' ? t('shelter.full') : t('shelter.statusOpen')}
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
                    <span className="text-slate-400">{t('common.verified')}</span>
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
                      {distance.toFixed(1)} {t('shelter.kmAway')}
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{t('shelter.occupancy')}: {occ}/{cap}</span>
                    </span>
                    <span className="font-bold mono">{pct}% {t('shelter.full')}</span>
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
                  <span className="text-[10px] text-slate-400 mono">{hasCoords ? `${(s.latitude as number).toFixed(4)}, ${(s.longitude as number).toFixed(4)}` : t('shelter.locationUnavailable')}</span>
                  {hasCoords ? (
                    <a
                      href={getNavigationUrl(s.latitude as number, s.longitude as number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white cursor-pointer"
                    >
                      <Navigation className="h-3 w-3" />
                      <span>{t('common.directions')}</span>
                    </a>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">{t('shelter.noGps')}</span>
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
              {hasActiveFilters ? t('sh.noResultsTitle') : t('shelter.empty')}
            </p>
            {hasActiveFilters && (
              <>
                <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  {t('sh.noResultsDesc')}
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('sh.resetFilters')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
