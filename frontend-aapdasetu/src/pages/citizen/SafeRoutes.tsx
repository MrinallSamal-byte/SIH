import { useEffect, useMemo, useState } from 'react'
import {
  Compass,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  MapPin
} from 'lucide-react'
import { aiSatelliteFloodMap } from '../../api/ai'
import { listShelters } from '../../api/endpoints'
import Loader from '../../components/common/Loader'
import LeafletMap from '../../components/map/LeafletMap'
import { useGeoLocation } from '../../hooks/useLocation'
import { useLanguage } from '../../lib/i18n'
import { buildSafeWaypoints, fetchOsrmRoute } from '../../lib/routing'
import { getNavigationUrl } from '../../lib/helpers'
import type { FloodGeoJson, GeoPoint, Shelter } from '../../types'

const EARTH_RADIUS_KM = 6371
const WALK_SPEED_KMPH = 4
const DEFAULT_CENTER: GeoPoint = { lat: 26.1445, lng: 91.7362 }

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s))
}

function routeLengthKm(points?: GeoPoint[]): number {
  if (!points || points.length <= 1) return 0
  let total = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1] && points[i]) {
      total += haversineKm(points[i - 1], points[i])
    }
  }
  return total
}

function formatEta(minutes: number): string {
  if (!minutes || isNaN(minutes) || minutes < 0) return '0 min'
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`
  return `${Math.floor(minutes / 60)} hr ${Math.round(minutes % 60)} min`
}

export default function SafeRoutes() {
  const { t } = useLanguage()
  const { coords, status, accuracy, refresh } = useGeoLocation()
  const [flood, setFlood] = useState<FloodGeoJson | null>(null)
  const [shelters, setShelters] = useState<Shelter[] | null>(null)
  const [destinationId, setDestinationId] = useState<string>('')
  const [fastestRoute, setFastestRoute] = useState<GeoPoint[]>([])
  const [safeRoute, setSafeRoute] = useState<GeoPoint[]>([])

  const origin: GeoPoint = useMemo(
    () => (coords ? { lat: coords.latitude, lng: coords.longitude } : DEFAULT_CENTER),
    [coords],
  )

  useEffect(() => {
    aiSatelliteFloodMap({ district: 'North 24 Parganas' })
      .then((res) => setFlood(res || { type: 'FeatureCollection', features: [] }))
      .catch(() => setFlood({ type: 'FeatureCollection', features: [] }))

    listShelters('open')
      .then((res) => setShelters(res || []))
      .catch(() => setShelters([]))
  }, [])

  useEffect(() => {
    if (shelters && shelters.length > 0) setDestinationId((id) => id || shelters[0].id)
  }, [shelters])

  const polygonPaths = useMemo<GeoPoint[][]>(() => {
    if (!flood || !Array.isArray(flood.features)) return []
    return flood.features
      .filter((f) => f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length > 0)
      .map((f) =>
        (f.geometry.coordinates[0] ?? []).map(([lng, lat]) => ({ lat, lng }) as GeoPoint),
      )
  }, [flood])

  const polygons = useMemo(() => {
    if (!flood || !Array.isArray(flood.features)) return []
    return flood.features
      .filter((f) => f && f.properties)
      .map((f, i) => ({
        id: `flood-${i}`,
        points: polygonPaths[i] ?? [],
        label: `${f.properties.hazard_type || 'Flood Inundation'} — ${f.properties.severity || 'Critical'}${f.properties.water_depth_est_meters ? ` (~${f.properties.water_depth_est_meters}m water)` : ''}`,
      }))
  }, [flood, polygonPaths])

  const shelterMarkers = useMemo(
    () =>
      (shelters ?? [])
        .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
        .map((s) => ({
          id: s.id,
          position: { lat: s.latitude, lng: s.longitude } as GeoPoint,
          title: s.name,
          subtitle: `${s.status || 'open'} · Occupancy: ${s.occupancy || 0}/${s.capacity || 0}`,
          color: '#10b981',
          isShelter: true,
        })),
    [shelters],
  )

  const userMarker = useMemo(
    () =>
      coords
        ? {
            id: 'you',
            position: origin,
            title: 'You are here',
            subtitle: accuracy ? `GPS Accuracy ±${Math.round(accuracy)}m` : 'Live location',
            color: '#3b82f6',
            isSos: true,
          }
        : null,
    [coords, origin, accuracy],
  )

  const markers = useMemo(
    () => [...(userMarker ? [userMarker] : []), ...shelterMarkers],
    [userMarker, shelterMarkers],
  )

  const destination = useMemo(
    () => (shelters ?? []).find((s) => s.id === destinationId) ?? (shelters?.[0] ?? null),
    [shelters, destinationId],
  )

  useEffect(() => {
    let active = true
    setFastestRoute([])
    setSafeRoute([])
    if (!destination || typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number') return () => { active = false }

    const target = { lat: destination.latitude, lng: destination.longitude }
    const safeWaypoints = buildSafeWaypoints(origin, target, polygonPaths)
    void Promise.all([
      fetchOsrmRoute(origin, target),
      fetchOsrmRoute(origin, target, safeWaypoints),
    ]).then(([fastest, safe]) => {
      if (!active) return
      setFastestRoute(fastest?.points ?? [])
      setSafeRoute(safe?.points ?? [])
    })
    return () => { active = false }
  }, [origin, destination, polygonPaths])

  const routes = useMemo(
    () => [
      {
        id: 'fastest',
        label: 'Direct route',
        points: fastestRoute ?? [],
        color: '#f59e0b',
        dashed: false,
        hazard: 'May cross flooded zones',
        safe: false,
      },
      {
        id: 'safe',
        label: 'Safe detour route (Recommended)',
        points: safeRoute ?? [],
        color: '#10b981',
        dashed: true,
        hazard: 'Safely avoids inundation zones (300m clearance)',
        safe: true,
      },
    ],
    [fastestRoute, safeRoute],
  )

  if (!flood || !shelters) return <Loader />

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <Compass className="h-6 w-6 text-zinc-800 dark:text-white" />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-white">
          {t('routes.title')}
        </h1>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-white">
        {t('routes.subtitle')}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 text-xs dark:border-white/[0.08] dark:bg-[#1a1a1a] shadow-xs">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mono">{t('routes.origin')}</label>
            <div className="mt-1 font-medium text-zinc-600 dark:text-white">
              {coords ? `GPS: ${origin.lat.toFixed(4)}°N, ${origin.lng.toFixed(4)}°E` : 'Regional Center Fallback'}
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={status === 'locating'}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/[0.1] dark:bg-[#222222] dark:text-white"
            >
              <MapPin className="h-3.5 w-3.5 text-zinc-800 dark:text-white" />
              <span>{status === 'locating' ? t('shelter.locating') : coords ? t('shelter.updateLocation') : t('shelter.detectLocation')}</span>
            </button>

            <label htmlFor="safe-route-dest" className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-400 mono">
              {t('routes.destination')}
            </label>
            <select
              id="safe-route-dest"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 outline-none focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-white"
            >
              {shelterMarkers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} — {m.subtitle}
                </option>
              ))}
            </select>

            {destination && (
              <a
                href={getNavigationUrl(destination.latitude, destination.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>{t('common.directions')}</span>
              </a>
            )}
          </div>

          {routes.map((r) => (
            <div
              key={r.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-xs shadow-xs ${
                r.safe ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20'
              }`}
            >
              <div>
                <div className={`flex items-center gap-1.5 font-bold ${r.safe ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                  {r.safe ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  <span>{r.safe ? t('routes.safeDistance') : t('routes.directDistance')}</span>
                </div>
                <div className="mt-1 text-zinc-500 dark:text-white leading-relaxed">{r.hazard}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-zinc-800 dark:text-white mono text-sm">{routeLengthKm(r.points).toFixed(1)} km</div>
                <div className="text-slate-500 dark:text-white">
                  ~{formatEta((routeLengthKm(r.points) / WALK_SPEED_KMPH) * 60)} {t('routes.walkingTime')}
                </div>
              </div>
            </div>
          ))}

          <h2 className="pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">{t('routes.hazardActive')}</h2>
          {flood.features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-red-200 bg-red-50/70 p-3.5 text-xs dark:border-red-900/40 dark:bg-red-950/30">
              <div className="font-bold text-red-700 dark:text-red-300">{f.properties.hazard_type}</div>
              <div className="text-red-600 dark:text-red-400 mt-0.5">
                Severity: {f.properties.severity} · ~{f.properties.water_depth_est_meters}m depth
              </div>
              {f.properties.affected_villages && (
                <div className="mt-1 text-zinc-500 dark:text-white">Villages: {f.properties.affected_villages.join(', ')}</div>
              )}
            </div>
          ))}
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden shadow-xs border border-zinc-200/80 dark:border-white/[0.08]">
            <LeafletMap
              center={origin}
              zoom={13}
              markers={markers}
              polygons={polygons}
              polylines={routes.map((r) => ({ id: r.id, points: r.points, color: r.color, dashed: r.dashed, label: r.label }))}
              height="520px"
              autoFit
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-white">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 bg-amber-500" /> {t('routes.directDistance')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-5 border-t-2 border-dashed border-emerald-500" /> {t('routes.safeDistance')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> {t('routes.hazardActive')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> {t('shelter.allShelters')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-800 dark:bg-slate-100" /> {t('routes.origin')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
