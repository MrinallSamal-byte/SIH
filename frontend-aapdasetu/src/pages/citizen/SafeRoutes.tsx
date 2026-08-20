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
import { getNavigationUrl } from '../../lib/helpers'
import type { FloodGeoJson, GeoPoint, Shelter } from '../../types'

const EARTH_RADIUS_KM = 6371
const WALK_SPEED_KMPH = 4
const DEFAULT_CENTER: GeoPoint = { lat: 22.5726, lng: 88.3639 }

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

function segmentsIntersect(a: GeoPoint, b: GeoPoint, c: GeoPoint, d: GeoPoint): boolean {
  if (!a || !b || !c || !d) return false
  const ccw = (p: GeoPoint, q: GeoPoint, r: GeoPoint) =>
    (q.lat - p.lat) * (r.lng - p.lng) - (q.lng - p.lng) * (r.lat - p.lat)
  const o1 = ccw(a, b, c)
  const o2 = ccw(a, b, d)
  const o3 = ccw(c, d, a)
  const o4 = ccw(c, d, b)
  return (
    ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
    ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
  )
}

function lineCrossesPolygon(a: GeoPoint, b: GeoPoint, polygon?: GeoPoint[]): boolean {
  if (!polygon || polygon.length < 3) return false
  for (let i = 0; i < polygon.length; i++) {
    const c = polygon[i]
    const d = polygon[(i + 1) % polygon.length]
    if (c && d && segmentsIntersect(a, b, c, d)) return true
  }
  return false
}

function distToSegment(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  if (!p || !a || !b) return 0
  const dLng = b.lng - a.lng
  const dLat = b.lat - a.lat
  const lenSq = dLng * dLng + dLat * dLat
  if (lenSq === 0) return haversineKm(p, a)
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dLng + (p.lat - a.lat) * dLat) / lenSq))
  return haversineKm(p, { lat: a.lat + t * dLat, lng: a.lng + t * dLng })
}

/** Direct (fastest) path: straight line origin -> shelter. */
function buildFastestRoute(from: GeoPoint, to: GeoPoint): GeoPoint[] {
  if (!from || !to) return []
  return [from, to]
}

/** Safe path: detours around flood zones with a 300-meter outward clearance buffer. */
function buildSafeRoute(from: GeoPoint, to: GeoPoint, polygons?: GeoPoint[][]): GeoPoint[] {
  if (!from || !to) return []
  const safePolys = (polygons ?? []).filter((p) => p && p.length >= 3)
  const crossing = safePolys.filter((poly) => lineCrossesPolygon(from, to, poly))
  if (crossing.length === 0) return [from, to]

  const waypoints = crossing
    .map((poly) => {
      if (!poly || poly.length === 0) return null
      const centerLat = poly.reduce((acc, p) => acc + (p?.lat ?? 0), 0) / poly.length
      const centerLng = poly.reduce((acc, p) => acc + (p?.lng ?? 0), 0) / poly.length

      let best = poly[0]
      let bestDist = -1
      for (const v of poly) {
        if (!v) continue
        const d = distToSegment(v, from, to)
        if (d > bestDist) {
          bestDist = d
          best = v
        }
      }

      if (!best) return null

      const offsetLat = best.lat >= centerLat ? 0.003 : -0.003
      const offsetLng = best.lng >= centerLng ? 0.003 : -0.003
      const bufferedPoint: GeoPoint = {
        lat: best.lat + offsetLat,
        lng: best.lng + offsetLng,
      }

      return {
        point: bufferedPoint,
        t: (bufferedPoint.lng - from.lng) * (to.lng - from.lng) + (bufferedPoint.lat - from.lat) * (to.lat - from.lat),
      }
    })
    .filter((w): w is { point: GeoPoint; t: number } => Boolean(w && w.point))
    .sort((x, y) => x.t - y.t)
    .map((w) => w.point)

  return [from, ...waypoints, to]
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

  const fastestRoute = useMemo<GeoPoint[]>(
    () =>
      destination && typeof destination.latitude === 'number' && typeof destination.longitude === 'number'
        ? buildFastestRoute(origin, { lat: destination.latitude, lng: destination.longitude })
        : [],
    [origin, destination],
  )

  const safeRoute = useMemo<GeoPoint[]>(
    () =>
      destination && typeof destination.latitude === 'number' && typeof destination.longitude === 'number'
        ? buildSafeRoute(origin, { lat: destination.latitude, lng: destination.longitude }, polygonPaths)
        : [],
    [origin, destination, polygonPaths],
  )

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
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Compass className="h-6 w-6 text-slate-900 dark:text-slate-100" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t('routes.title')}
        </h1>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('routes.subtitle')}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mono">{t('routes.origin')}</label>
            <div className="mt-1 font-medium text-slate-700 dark:text-slate-200">
              {coords ? `GPS: ${origin.lat.toFixed(4)}°N, ${origin.lng.toFixed(4)}°E` : 'Regional Center Fallback'}
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={status === 'locating'}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <MapPin className="h-3.5 w-3.5 text-slate-900 dark:text-slate-100" />
              <span>{status === 'locating' ? t('shelter.locating') : coords ? t('shelter.updateLocation') : t('shelter.detectLocation')}</span>
            </button>

            <label htmlFor="safe-route-dest" className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-400 mono">
              {t('routes.destination')}
            </label>
            <select
              id="safe-route-dest"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
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
                <div className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">{r.hazard}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-slate-900 dark:text-slate-100 mono text-sm">{routeLengthKm(r.points).toFixed(1)} km</div>
                <div className="text-slate-500 dark:text-slate-400">
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
                <div className="mt-1 text-slate-600 dark:text-slate-400">Villages: {f.properties.affected_villages.join(', ')}</div>
              )}
            </div>
          ))}
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800">
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
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
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
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-slate-100" /> {t('routes.origin')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
