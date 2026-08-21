import { useCallback, useMemo, useState } from 'react'
import {
  Building,
  MapPin,
  Navigation,
  Users,
  Phone,
  Search
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

const criticalFacilities: { key: string; labelKey: string }[] = [
  { key: 'medical_station', labelKey: 'shelter.filterMedical' },
  { key: 'food', labelKey: 'shelter.filterFood' },
  { key: 'water', labelKey: 'shelter.filterWater' },
  { key: 'power_generator', labelKey: 'shelter.filterPower' },
]

export default function ShelterFinder() {
  const { t } = useLanguage()
  const { coords, status, accuracy, refresh } = useGeoLocation()
  
  // Real-time shelter feed: only fetches active/allowed shelters (not closed)
  const fetchActiveShelters = useCallback(() => listShelters(undefined, false), [])
  const shelters = useRealtime<Shelter[]>(fetchActiveShelters, 5000)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null)

  const userPos: GeoPoint | null = useMemo(
    () => (coords ? { lat: coords.latitude, lng: coords.longitude } : null),
    [coords],
  )

  const filteredAndSorted = useMemo(() => {
    if (!shelters || !Array.isArray(shelters)) return []
    const toPoint = (s: Shelter): GeoPoint | null =>
      typeof s.latitude === 'number' && typeof s.longitude === 'number' ? { lat: s.latitude, lng: s.longitude } : null

    return shelters
      .filter((s) => {
        if (!s) return false
        if (s.status === 'closed') return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchesName = (s.name || '').toLowerCase().includes(q)
          const matchesAddress = s.address ? s.address.toLowerCase().includes(q) : false
          if (!matchesName && !matchesAddress) return false
        }
        if (selectedFacility) {
          const facs = Array.isArray(s.facilities) ? s.facilities : []
          if (!facs.includes(selectedFacility)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (!userPos) return 0
        const pa = toPoint(a)
        const pb = toPoint(b)
        if (!pa && !pb) return 0
        if (!pa) return 1
        if (!pb) return -1
        return haversineKm(userPos, pa) - haversineKm(userPos, pb)
      })
  }, [shelters, userPos, searchQuery, selectedFacility])

  const center: GeoPoint = useMemo(() => {
    if (userPos) return userPos
    const firstValid = filteredAndSorted.find((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
    if (firstValid) {
      return { lat: firstValid.latitude as number, lng: firstValid.longitude as number }
    }
    return { lat: 22.5726, lng: 88.3639 }
  }, [userPos, filteredAndSorted])

  const markers = useMemo(() => {
    const list: MapMarker[] = []
    if (userPos) {
      list.push({
        id: 'you',
        position: userPos,
        title: t('common.youAreHere'),
        subtitle: accuracy ? `${t('common.gpsAccuracy')}${Math.round(accuracy)}m` : t('shelter.currentLocation'),
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
  }, [filteredAndSorted, userPos, accuracy, t])

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
        <div className="skeleton-shimmer h-[400px] sm:h-[500px] lg:h-[550px] rounded-2xl" />
      </div>
    )
  }

  const shelterCount = Array.isArray(shelters) ? shelters.length : 0

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
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-200 shadow-xs cursor-pointer"
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

      {/* Search Bar & Facility Filter Chips */}
      <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('shelter.searchPlaceholder')}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3.5 py-2 text-sm outline-none focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 dark:focus:border-slate-500"
          />
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

      {/* Full Width Map */}
      <div className="mt-4 h-[400px] sm:h-[500px] lg:h-[550px] rounded-2xl overflow-hidden shadow-xs border border-zinc-200/80 dark:border-white/[0.08]">
        <LeafletMap
          center={center}
          markers={markers}
          height="100%"
          autoFit
        />
      </div>

      {/* Shelter Cards — full width grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((s) => {
            const hasCoords = typeof s.latitude === 'number' && typeof s.longitude === 'number'
            const toPoint = (shelter: Shelter): GeoPoint | null =>
              typeof shelter.latitude === 'number' && typeof shelter.longitude === 'number'
                ? { lat: shelter.latitude as number, lng: shelter.longitude as number }
                : null
            const point = toPoint(s)
            const distance = userPos && point ? haversineKm(userPos, point) : null
            const cap = s.capacity ?? 100
            const occ = s.occupancy ?? 0
            const pct = Math.round((occ / cap) * 100)
            const facilitiesList = Array.isArray(s.facilities) ? s.facilities : []

            return (
              <Card key={s.id} className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-zinc-800 dark:text-slate-300 text-base">{s.name || t('shelter.cardFallback')}</div>
                    <div className="mt-1 flex items-start gap-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span>{s.address || t('shelter.addressFallback')}</span>
                    </div>
                  </div>
                  <Badge value={s.status || 'open'} label={s.status === 'full' ? t('shelter.full') : t('shelter.statusOpen')} />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-zinc-800 dark:text-slate-300 mono">
                    {distance !== null ? `${distance.toFixed(1)} ${t('shelter.kmAway')}` : t('common.verified')}
                  </span>
                  {s.contactPhone && (
                    <a href={`tel:${s.contactPhone}`} className="flex items-center gap-1 text-zinc-600 hover:underline font-medium dark:text-slate-300 mono">
                      <Phone className="h-3 w-3" />
                      <span>{s.contactPhone}</span>
                    </a>
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
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white cursor-pointer"
                    >
                      <Navigation className="h-3 w-3" />
                      <span>{t('common.directions')}</span>
                    </a>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">{t('shelter.noGps')}</span>
                  )}
                </div>
              </Card>
            )
          })}

          {filteredAndSorted.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 p-12 text-center text-xs text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
              {t('shelter.empty')}
            </div>
          )}
      </div>
    </div>
  )
}
