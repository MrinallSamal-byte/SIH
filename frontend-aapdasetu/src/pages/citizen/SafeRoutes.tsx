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
import { fetchOsrmRoute, haversineRouteLength } from '../../lib/routing'
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

function formatEta(minutes: number, t: (key: string) => string): string {
  if (!minutes || isNaN(minutes) || minutes < 0) return `0 ${t('routes.min')}`
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} ${t('routes.min')}`
  return `${Math.floor(minutes / 60)} ${t('routes.hr')} ${Math.round(minutes % 60)} ${t('routes.min')}`
}

export default function SafeRoutes() {
  const { t } = useLanguage()
  const { coords, status, accuracy, refresh } = useGeoLocation()
  const [flood, setFlood] = useState<FloodGeoJson | null>(null)
  const [shelters, setShelters] = useState<Shelter[] | null>(null)
  const [destinationId, setDestinationId] = useState<string>('')
  const [osrmFastest, setOsrmFastest] = useState<{ points: GeoPoint[]; distanceKm: number; durationMin: number } | null>(null)
  const [osrmSafe, setOsrmSafe] = useState<{ points: GeoPoint[]; distanceKm: number; durationMin: number } | null>(null)
  const [routingLoading, setRoutingLoading] = useState(false)
  const [routingFallback, setRoutingFallback] = useState(false)

  const hasGps = Boolean(coords)
  const origin: GeoPoint = useMemo(
    () => (coords ? { lat: coords.latitude, lng: coords.longitude } : DEFAULT_CENTER),
    [coords],
  )

  useEffect(() => {
    const district = coords ? undefined : 'North 24 Parganas'
    aiSatelliteFloodMap(district ? { district } : { center: origin, radiusKm: 30 })
      .then((res) => setFlood(res || { type: 'FeatureCollection', features: [] }))
      .catch(() => setFlood({ type: 'FeatureCollection', features: [] }))

    listShelters('open')
      .then((res) => setShelters(res || []))
      .catch(() => setShelters([]))
  }, [coords, origin.lat, origin.lng])

  useEffect(() => {
    if (shelters && shelters.length > 0) setDestinationId((id) => id || shelters[0].id)
  }, [shelters])

  const polygonPaths = useMemo<GeoPoint[][]>(() => {
    if (!flood || !Array.isArray(flood.features)) return []
    return flood.features
      .filter((f) => f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length > 0)
      .flatMap((f) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geom: any = f.geometry
        if (geom.type === 'Polygon') {
          const rings: number[][][] = geom.coordinates as number[][][]
          return rings.map((ring) => ring.map(([lng, lat]) => ({ lat, lng }) as GeoPoint))
        }
        if (geom.type === 'MultiPolygon') {
          const polys: number[][][][] = geom.coordinates as number[][][][]
          return polys.flatMap((poly) => poly.map((ring) => ring.map(([lng, lat]) => ({ lat, lng }) as GeoPoint)))
        }
        return [(geom.coordinates[0] ?? []).map(([lng, lat]: number[]) => ({ lat, lng }) as GeoPoint)]
      })
  }, [flood])

  const polygons = useMemo(() => {
    if (!flood || !Array.isArray(flood.features)) return []
    return flood.features
      .filter((f) => f && f.properties)
      .map((f, i) => ({
        id: `flood-${i}`,
        points: polygonPaths[i] ?? [],
        label: `${f.properties.hazard_type || t('routes.floodZone')} — ${f.properties.severity || t('routes.critical')}${f.properties.water_depth_est_meters ? ` (~${f.properties.water_depth_est_meters}m ${t('routes.waterDepth')})` : ''}`,
      }))
  }, [flood, polygonPaths, t])

  const shelterMarkers = useMemo(
    () =>
      (shelters ?? [])
        .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
        .map((s) => ({
          id: s.id,
          position: { lat: s.latitude, lng: s.longitude } as GeoPoint,
          title: s.name,
          subtitle: `${s.status === 'full' ? t('shelter.full') : t('shelter.statusOpen')} · ${t('routes.occupancy')} ${s.occupancy || 0}/${s.capacity || 0}`,
          color: '#10b981',
          isShelter: true,
        })),
    [shelters, t],
  )

  const userMarker = useMemo(
    () =>
      coords
        ? {
            id: 'you',
            position: origin,
            title: t('common.youAreHere'),
            subtitle: accuracy ? `${t('common.gpsAccuracy')}${Math.round(accuracy)}m` : t('routes.liveLocation'),
            color: '#3b82f6',
            isSos: true,
          }
        : null,
    [coords, origin, accuracy, t],
  )

  const markers = useMemo(
    () => [...(userMarker ? [userMarker] : []), ...shelterMarkers],
    [userMarker, shelterMarkers],
  )

  const destination = useMemo(
    () => (shelters ?? []).find((s) => s.id === destinationId) ?? (shelters?.[0] ?? null),
    [shelters, destinationId],
  )

  const destPoint = useMemo(
    () =>
      destination && typeof destination.latitude === 'number' && typeof destination.longitude === 'number'
        ? ({ lat: destination.latitude, lng: destination.longitude } as GeoPoint)
        : null,
    [destination],
  )

  const fastestFallback = useMemo<GeoPoint[]>(
    () => (destPoint ? buildFastestRoute(origin, destPoint) : []),
    [origin, destPoint],
  )

  const safeFallback = useMemo<GeoPoint[]>(
    () => (destPoint ? buildSafeRoute(origin, destPoint, polygonPaths) : []),
    [origin, destPoint, polygonPaths],
  )

  useEffect(() => {
    if (!destPoint) return
    let cancelled = false
    setRoutingLoading(true)
    setRoutingFallback(false)
    setOsrmFastest(null)
    setOsrmSafe(null)
    ;(async () => {
      const fastest = await fetchOsrmRoute(origin, destPoint, [], 'driving')
      if (!cancelled) {
        if (fastest) setOsrmFastest(fastest)
        else setRoutingFallback(true)
      }
      const safeWaypoints = safeFallback.length > 2 ? safeFallback.slice(1, -1) : []
      const safe =
        safeWaypoints.length > 0
          ? await fetchOsrmRoute(origin, destPoint, safeWaypoints, 'foot')
          : await fetchOsrmRoute(origin, destPoint, [], 'foot')
      if (!cancelled) {
        if (safe) setOsrmSafe(safe)
        else if (!fastest) setRoutingFallback(true)
      }
      if (!cancelled) setRoutingLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [origin.lat, origin.lng, destPoint?.lat, destPoint?.lng, safeFallback])

  const fastestRoute = useMemo(() => osrmFastest?.points ?? fastestFallback, [osrmFastest, fastestFallback])
  const safeRoute = useMemo(() => osrmSafe?.points ?? safeFallback, [osrmSafe, safeFallback])

  const routes = useMemo(
    () => [
      {
        id: 'fastest',
        label: t('routes.fastestRoute'),
        points: fastestRoute ?? [],
        color: '#f59e0b',
        dashed: false,
        hazard: routingFallback ? t('routes.directLineHazard') : t('routes.followsRoads'),
        safe: false,
        distanceKm: osrmFastest?.distanceKm ?? haversineRouteLength(fastestRoute),
        durationMin: osrmFastest?.durationMin ?? (haversineRouteLength(fastestRoute) / WALK_SPEED_KMPH) * 60,
      },
      {
        id: 'safe',
        label: t('routes.safeDetour'),
        points: safeRoute ?? [],
        color: '#10b981',
        dashed: true,
        hazard: t('routes.safeDetourDesc'),
        safe: true,
        distanceKm: osrmSafe?.distanceKm ?? haversineRouteLength(safeRoute),
        durationMin: osrmSafe?.durationMin ?? (haversineRouteLength(safeRoute) / WALK_SPEED_KMPH) * 60,
      },
    ],
    [fastestRoute, safeRoute, osrmFastest, osrmSafe, routingFallback, t],
  )

  if (!flood || !shelters) return <Loader />

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <Compass className="h-6 w-6 text-zinc-800 dark:text-slate-300" />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-300">
          {t('routes.title')}
        </h1>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('routes.subtitle')}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 text-xs dark:border-white/[0.08] dark:bg-[#1a1a1a] shadow-xs">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mono">{t('routes.origin')}</label>
            <div className="mt-1 font-medium text-zinc-600 dark:text-slate-200">
              {coords ? `GPS: ${origin.lat.toFixed(4)}°N, ${origin.lng.toFixed(4)}°E` : t('routes.regionFallback')}
            </div>
            {!hasGps && <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">{t('routes.regionHint')}</div>}
            <button
              type="button"
              onClick={refresh}
              disabled={status === 'locating'}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-200"
            >
              <MapPin className="h-3.5 w-3.5 text-zinc-800 dark:text-slate-300" />
              <span>{status === 'locating' ? t('shelter.locating') : coords ? t('shelter.updateLocation') : t('shelter.detectLocation')}</span>
            </button>

            <label htmlFor="safe-route-dest" className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-400 mono">
              {t('routes.destination')}
            </label>
            <select
              id="safe-route-dest"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 outline-none focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300"
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
                <div className="mt-1 text-zinc-500 dark:text-slate-400 leading-relaxed">{r.hazard}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-zinc-800 dark:text-slate-300 mono text-sm">{r.distanceKm.toFixed(1)} {t('common.km')}{r.distanceKm !== routeLengthKm(r.points) ? '' : routingFallback ? ' ~' : ''}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  ~{formatEta(r.durationMin, t)} {t('routes.walkingTime')}{routingLoading ? ` · ${t('common.loading')}` : ''}
                </div>
              </div>
            </div>
          ))}

          <h2 className="pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">{t('routes.hazardActive')}</h2>
          {flood.features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-red-200 bg-red-50/70 p-3.5 text-xs dark:border-red-900/40 dark:bg-red-950/30">
              <div className="font-bold text-red-700 dark:text-red-300">{f.properties.hazard_type}</div>
              <div className="text-red-600 dark:text-red-400 mt-0.5">
                {t('routes.severity')} {f.properties.severity} · ~{f.properties.water_depth_est_meters}m {t('routes.depthSuffix')}
              </div>
              {f.properties.affected_villages && (
                <div className="mt-1 text-zinc-500 dark:text-slate-400">{t('routes.villages')} {f.properties.affected_villages.join(', ')}</div>
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
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-800 dark:bg-slate-100" /> {t('routes.origin')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
