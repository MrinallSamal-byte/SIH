import { useEffect, useMemo, useState } from 'react'
import { listShelters } from '../../api/endpoints'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import LeafletMap from '../../components/map/LeafletMap'
import { useLocation } from '../../hooks/useLocation'
import { haversineKm, getNavigationUrl } from '../../lib/helpers'
import type { GeoPoint, Shelter } from '../../types'
import type { MapMarker } from '../../components/map/LeafletMap'

const criticalFacilities = [
  { key: 'medical_station', label: 'Medical Station' },
  { key: 'food', label: 'Food Supply' },
  { key: 'water', label: 'Clean Water' },
  { key: 'power_generator', label: 'Power Generator' },
  { key: 'blankets', label: 'Blankets & Beds' },
]

export default function ShelterFinder() {
  const { coords, status, accuracy, refresh } = useLocation()
  const [shelters, setShelters] = useState<Shelter[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null)

  const userPos: GeoPoint | null = useMemo(
    () => (coords ? { lat: coords.latitude, lng: coords.longitude } : null),
    [coords],
  )

  useEffect(() => {
    listShelters().then(setShelters)
  }, [])

  const filteredAndSorted = useMemo(() => {
    if (!shelters) return []
    const toPoint = (s: Shelter): GeoPoint => ({ lat: s.latitude, lng: s.longitude })
    
    return shelters
      .filter((s) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchesName = s.name.toLowerCase().includes(q)
          const matchesAddress = s.address ? s.address.toLowerCase().includes(q) : false
          if (!matchesName && !matchesAddress) return false
        }
        if (selectedFacility) {
          if (!s.facilities.includes(selectedFacility)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (!userPos) return 0
        return haversineKm(userPos, toPoint(a)) - haversineKm(userPos, toPoint(b))
      })
  }, [shelters, userPos, searchQuery, selectedFacility])

  const center: GeoPoint = userPos ?? { lat: 22.5726, lng: 88.3639 }

  const markers = useMemo(() => {
    const list: MapMarker[] = []
    if (userPos) {
      list.push({
        id: 'you',
        position: userPos,
        title: 'You are here',
        subtitle: accuracy ? `GPS Accuracy ±${Math.round(accuracy)}m` : 'Current location',
        color: '#3b82f6',
        isSos: true,
      })
    }
    for (const s of filteredAndSorted) {
      list.push({
        id: s.id,
        position: { lat: s.latitude, lng: s.longitude },
        title: s.name,
        subtitle: `${s.status.toUpperCase()} · Occupancy: ${s.occupancy}/${s.capacity}`,
        color: s.status === 'open' ? '#10b981' : s.status === 'full' ? '#f59e0b' : '#94a3b8',
      })
    }
    return list
  }, [filteredAndSorted, userPos, accuracy])

  if (!shelters) {
    return (
      <div className="space-y-4">
        <div className="skeleton-shimmer h-12 w-64 rounded-xl" />
        <div className="skeleton-shimmer h-20 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-shimmer h-48 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton-shimmer h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Nearby Emergency Shelters</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {userPos ? 'Live shelters sorted by nearest distance to your GPS location.' : 'Real-time shelter occupancy, medical availability, and directions.'}
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={status === 'locating'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 transition hover:bg-blue-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          {status === 'locating' ? 'Acquiring GPS…' : userPos ? 'Update GPS Location' : 'Detect My Location'}
        </button>
      </div>

      {/* Search Bar & Facility Filter Chips */}
      <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search shelters by name, locality, or sector…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Amenities:</span>
          <button
            type="button"
            onClick={() => setSelectedFacility(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              selectedFacility === null
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All Shelters
          </button>
          {criticalFacilities.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setSelectedFacility(selectedFacility === f.key ? null : f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedFacility === f.key
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-3 md:grid-cols-2">
          {filteredAndSorted.map((s) => {
            const toPoint = (shelter: Shelter): GeoPoint => ({ lat: shelter.latitude, lng: shelter.longitude })
            const distance = userPos ? haversineKm(userPos, toPoint(s)) : null
            const pct = s.capacity ? Math.round((s.occupancy / s.capacity) * 100) : 0

            return (
              <Card key={s.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900 dark:text-slate-100">{s.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
                      {s.address}
                    </div>
                  </div>
                  <Badge value={s.status} />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {distance !== null ? `${distance.toFixed(1)} km away` : 'Location on file'}
                  </span>
                  {s.contactPhone && (
                    <a href={`tel:${s.contactPhone}`} className="text-blue-600 underline font-medium">
                      {s.contactPhone}
                    </a>
                  )}
                </div>

                <div className="mt-auto pt-3">
                  <div className="flex justify-between text-xs">
                    <span>Occupancy {s.occupancy}/{s.capacity}</span>
                    <span className="font-bold">{pct}% full</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-2 rounded ${pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {s.facilities.map((f) => (
                    <span key={f} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {f.replace('_', ' ')}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</span>
                  <a
                    href={getNavigationUrl(s.latitude, s.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <span>Get Directions</span>
                  </a>
                </div>
              </Card>
            )
          })}

          {filteredAndSorted.length === 0 && (
            <div className="col-span-2 rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              No shelters matched your search or facility filter criteria.
            </div>
          )}
        </div>
        <div className="h-[420px] lg:h-auto lg:min-h-[420px] rounded-xl overflow-hidden shadow-sm">
          <LeafletMap
            center={center}
            markers={markers}
            height="100%"
            autoFit
          />
        </div>
      </div>
    </div>
  )
}

