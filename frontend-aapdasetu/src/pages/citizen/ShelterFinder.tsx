import { useEffect, useMemo, useState } from 'react'
import { listShelters } from '../../api/endpoints'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import LeafletMap from '../../components/map/LeafletMap'
import { useLocation } from '../../hooks/useLocation'
import { haversineKm } from '../../lib/helpers'
import type { GeoPoint, Shelter } from '../../types'
import type { MapMarker } from '../../components/map/LeafletMap'

export default function ShelterFinder() {
  const { coords, status, refresh } = useLocation()
  const [shelters, setShelters] = useState<Shelter[] | null>(null)

  const userPos: GeoPoint | null = useMemo(
    () => (coords ? { lat: coords.latitude, lng: coords.longitude } : null),
    [coords],
  )

  useEffect(() => {
    listShelters().then(setShelters)
  }, [])

  const sorted = useMemo(() => {
    if (!shelters) return []
    const toPoint = (s: Shelter): GeoPoint => ({ lat: s.latitude, lng: s.longitude })
    if (!userPos) return shelters
    return [...shelters].sort((a, b) => haversineKm(userPos, toPoint(a)) - haversineKm(userPos, toPoint(b)))
  }, [shelters, userPos])

  const center: GeoPoint = userPos ?? { lat: 22.5726, lng: 88.3639 }

  const markers = useMemo(() => {
    const list: MapMarker[] = []
    if (userPos) {
      list.push({ id: 'you', position: userPos, title: 'You are here', color: '#3b82f6' })
    }
    for (const s of sorted) {
      list.push({
        id: s.id,
        position: { lat: s.latitude, lng: s.longitude },
        title: s.name,
        subtitle: `${s.status} · ${s.occupancy}/${s.capacity}`,
        color: s.status === 'open' ? '#10b981' : s.status === 'full' ? '#f59e0b' : '#94a3b8',
      })
    }
    return list
  }, [sorted, userPos])

  if (!shelters) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold">Nearby shelters</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {userPos ? 'Sorted by distance from your current location (Haversine).' : 'Allow location access to see the nearest shelters first.'}
      </p>

      <button
        type="button"
        onClick={refresh}
        disabled={status === 'locating'}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        {status === 'locating' ? 'Detecting location…' : userPos ? 'Re-detect my location' : 'Detect my location'}
      </button>
      {status === 'denied' && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Location permission denied — enable it in your browser settings.</p>
      )}
      {status === 'error' && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Could not detect location — showing all shelters.</p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-3 md:grid-cols-2">
          {sorted.map((s) => {
            const toPoint = (shelter: Shelter): GeoPoint => ({ lat: shelter.latitude, lng: shelter.longitude })
            const distance = userPos ? haversineKm(userPos, toPoint(s)) : null
            const pct = s.capacity ? Math.round((s.occupancy / s.capacity) * 100) : 0
            return (
              <Card key={s.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
                      {s.address}
                    </div>
                  </div>
                  <Badge value={s.status} />
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {distance !== null ? `${distance.toFixed(1)} km away` : ''} · {s.contactPhone ?? '—'}
                </div>
                <div className="mt-auto pt-4">
                  <div className="flex justify-between text-xs">
                    <span>Capacity {s.occupancy}/{s.capacity}</span>
                    <span>{pct}% full</span>
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
                    <span key={f} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                      {f.replace('_', ' ')}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                    </svg>
                    Directions
                  </a>
                </div>
              </Card>
            )
          })}
        </div>
        <div className="h-[420px] lg:h-auto lg:min-h-[420px]">
          <LeafletMap
            center={center}
            markers={markers}
            height="100%"
          />
        </div>
      </div>
    </div>
  )
}
