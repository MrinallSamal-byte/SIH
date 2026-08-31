import { useEffect, useMemo, useState } from 'react'
import {
  Compass,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { aiSatelliteFloodMap } from '../../api/ai'
import { listShelters } from '../../api/endpoints'
import Loader from '../../components/common/Loader'
import LeafletMap, { type MapMarker, type MapPolyline } from '../../components/map/LeafletMap'
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
  const [activeRouteView, setActiveRouteView] = useState<'safe' | 'fastest' | 'both'>('both')

  const [osrmFastest, setOsrmFastest] = useState<{ points: GeoPoint[]; distanceKm: number; durationMin: number } | null>(null)
  const [osrmSafe, setOsrmSafe] = useState<{ points: GeoPoint[]; distanceKm: number; durationMin: number } | null>(null)
  const [routingLoading, setRoutingLoading] = useState(false)
  const [fastestFallback, setFastestFallback] = useState(false)
  const [safeFallback, setSafeFallback] = useState(false)

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

        return {
          id: `flood-${i}`,
          points: pts,
          center: { lat: centerLat, lng: centerLng } as GeoPoint,
          severity: f.properties.severity || 'HIGH',
          depth: f.properties.water_depth_est_meters || 1.5,
          hazardType: f.properties.hazard_type || t('routes.floodZone'),
          label: `${f.properties.hazard_type || t('routes.floodZone')} — ${f.properties.severity || t('routes.critical')}${f.properties.water_depth_est_meters ? ` (~${f.properties.water_depth_est_meters}m ${t('routes.waterDepth')})` : ''}`,
        }
      })
  }, [flood, t])

  const polygons = useMemo(
    () =>
      floodZones
        .filter((z) => z.points.length >= 3)
        .map((z) => ({ id: z.id, points: z.points, label: z.label })),
    [floodZones],
  )

  const hazardPolys = useMemo(() => floodZones.map((z) => z.points), [floodZones])

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

  const fastestDirect = useMemo<GeoPoint[]>(
    () => (destPoint ? buildFastestRoute(origin, destPoint) : []),
    [origin, destPoint],
  )

  const safeDirect = useMemo<GeoPoint[]>(
    () => (destPoint ? buildSafeRoute(origin, destPoint, hazardPolys) : []),
    [origin, destPoint, hazardPolys],
  )

  // Safe detour waypoints
  const safeWaypoints = useMemo<GeoPoint[]>(() => {
    if (safeDirect.length > 2) {
      return safeDirect.slice(1, -1)
    }
    return []
  }, [safeDirect])

  useEffect(() => {
    if (!destPoint) return
    let cancelled = false
    setRoutingLoading(true)
    setFastestFallback(false)
    setSafeFallback(false)
    setOsrmFastest(null)
    setOsrmSafe(null)
    ;(async () => {
      const fastest = await fetchOsrmRoute(origin, destPoint)
      if (!cancelled) {
        if (fastest) setOsrmFastest(fastest)
        else setFastestFallback(true)
      }
      const safe = await fetchOsrmRoute(origin, destPoint, safeWaypoints)
      if (!cancelled) {
        if (safe) setOsrmSafe(safe)
        else setSafeFallback(true)
      }
      if (!cancelled) setRoutingLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [origin.lat, origin.lng, destPoint?.lat, destPoint?.lng, safeWaypoints])

  const fastestRoute = useMemo(() => osrmFastest?.points ?? fastestDirect, [osrmFastest, fastestDirect])
  const safeRoute = useMemo(() => osrmSafe?.points ?? safeDirect, [osrmSafe, safeDirect])

  // Distinct Route Polylines
  const polylines: MapPolyline[] = useMemo(() => {
    const list: MapPolyline[] = []
    if (activeRouteView === 'safe' || activeRouteView === 'both') {
      list.push({
        id: 'safe-detour-route',
        points: safeRoute ?? [],
        color: '#10b981',
        dashed: false,
        label: `${t('routes.safeDetour')}: ${(osrmSafe?.distanceKm ?? haversineRouteLength(safeRoute)).toFixed(1)} km (~${Math.round(osrmSafe?.durationMin ?? (haversineRouteLength(safeRoute) / WALK_SPEED_KMPH) * 60)} min)`,
      })
    }
    if (activeRouteView === 'fastest' || activeRouteView === 'both') {
      list.push({
        id: 'fastest-direct-route',
        points: fastestRoute ?? [],
        color: '#f59e0b',
        dashed: true,
        label: `${t('routes.fastestRoute')}: ${(osrmFastest?.distanceKm ?? haversineRouteLength(fastestRoute)).toFixed(1)} km (~${Math.round(osrmFastest?.durationMin ?? (haversineRouteLength(fastestRoute) / WALK_SPEED_KMPH) * 60)} min)`,
      })
    }
    return list
  }, [safeRoute, fastestRoute, osrmSafe, osrmFastest, activeRouteView, t])

  // Distinct Markers for all points:
  // 1. Origin (User radar)
  // 2. Destination Safe Haven
  // 3. Safe detour waypoints (Green shields)
  // 4. Hazard danger points (Red alert triangles)
  // 5. Other safe shelters
  const markers = useMemo(() => {
    const list: MapMarker[] = []

    // 1. Origin marker
    list.push({
      id: 'origin-marker',
      position: origin,
      title: t('common.youAreHere'),
      subtitle: accuracy ? `${t('common.gpsAccuracy')}${Math.round(accuracy)}m` : t('routes.liveLocation'),
      color: '#3b82f6',
      isSos: true,
      markerKind: 'user',
    })

    // 2. Destination Safe Haven Marker
    if (destination && destPoint) {
      list.push({
        id: `dest-${destination.id}`,
        position: destPoint,
        title: `${t('routes.targetShelter', 'Target Safe Haven')}: ${destination.name}`,
        subtitle: `${destination.status === 'full' ? t('shelter.full') : t('shelter.statusOpen')} · ${t('routes.occupancy')} ${destination.occupancy || 0}/${destination.capacity || 0}`,
        color: '#047857',
        isDestination: true,
        markerKind: 'destination',
        badgeText: 'HAVEN',
        popupActions: [
          {
            label: t('common.directions'),
            onClick: () => {
              window.open(getNavigationUrl(destPoint.lat, destPoint.lng), '_blank')
            },
          },
        ],
      })
    }

    // 3. Safe Route Waypoint Markers (Green Shields)
    safeWaypoints.forEach((wp, idx) => {
      list.push({
        id: `safe-waypoint-${idx}`,
        position: wp,
        title: `${t('routes.safeWaypoint', 'Safe Detour Checkpoint')} #${idx + 1}`,
        subtitle: t('routes.safeWaypointDesc', 'Hazard clearance node keeping you away from flooded zones'),
        color: '#059669',
        isWaypoint: true,
        markerKind: 'waypoint',
        badgeText: `WP${idx + 1}`,
      })
    })

    // 4. Hazard Danger Points (Red Warning Triangles where flood zones exist)
    floodZones.forEach((fz, idx) => {
      if (fz.center && fz.center.lat && fz.center.lng) {
        list.push({
          id: `hazard-point-${idx}`,
          position: fz.center,
          title: `${fz.hazardType} (${fz.severity})`,
          subtitle: `~${fz.depth}m water depth. Active flood zone avoided by Safe Detour Route.`,
          color: '#dc2626',
          isHazard: true,
          markerKind: 'hazard',
          badgeText: 'DANGER',
        })
      }
    })

    // 5. Other Available Shelters in region
    ;(shelters ?? [])
      .filter((s) => s.id !== destinationId && typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .forEach((s) => {
        list.push({
          id: s.id,
          position: { lat: s.latitude, lng: s.longitude },
          title: s.name,
          subtitle: `${s.status === 'full' ? t('shelter.full') : t('shelter.statusOpen')} · ${t('routes.occupancy')} ${s.occupancy || 0}/${s.capacity || 0}`,
          color: '#10b981',
          isShelter: true,
          markerKind: 'shelter',
          popupActions: [
            {
              label: t('routes.selectAsDest', 'Route to this Shelter'),
              onClick: () => setDestinationId(s.id),
            },
          ],
        })
      })

    return list
  }, [origin, destination, destPoint, safeWaypoints, floodZones, shelters, destinationId, accuracy, t])

  const routeCards = useMemo(
    () => [
      {
        id: 'safe' as const,
        label: t('routes.safeDetour'),
        points: safeRoute ?? [],
        color: '#10b981',
        dashed: false,
        hazard: safeFallback ? t('routes.directLineHazard') : t('routes.safeDetourDesc'),
        safe: true,
        fallback: safeFallback,
        distanceKm: osrmSafe?.distanceKm ?? haversineRouteLength(safeRoute),
        durationMin: osrmSafe?.durationMin ?? (haversineRouteLength(safeRoute) / WALK_SPEED_KMPH) * 60,
      },
      {
        id: 'fastest' as const,
        label: t('routes.fastestRoute'),
        points: fastestRoute ?? [],
        color: '#f59e0b',
        dashed: true,
        hazard: fastestFallback ? t('routes.directLineHazard') : t('routes.followsRoads'),
        safe: false,
        fallback: fastestFallback,
        distanceKm: osrmFastest?.distanceKm ?? haversineRouteLength(fastestRoute),
        durationMin: osrmFastest?.durationMin ?? (haversineRouteLength(fastestRoute) / WALK_SPEED_KMPH) * 60,
      },
    ],
    [safeRoute, fastestRoute, osrmSafe, osrmFastest, safeFallback, fastestFallback, t],
  )

  if (!flood || !shelters) return <Loader />

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-zinc-800 dark:text-slate-300" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-300">
            {t('routes.title')}
          </h1>
        </div>

        {/* Route Filter View Toggle */}
        <div className="inline-flex rounded-xl border border-zinc-200 bg-[#f4f4f5] p-0.5 shadow-xs dark:border-white/[0.1] dark:bg-[#222222]">
          <button
            type="button"
            onClick={() => setActiveRouteView('both')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              activeRouteView === 'both'
                ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
            }`}
          >
            {t('routes.allRoutes', 'All Routes')}
          </button>
          <button
            type="button"
            onClick={() => setActiveRouteView('safe')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              activeRouteView === 'safe'
                ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-900'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            <span>{t('routes.safeOnly', 'Safe Detour')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveRouteView('fastest')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              activeRouteView === 'fastest'
                ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-900'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-[#2a2a2a]'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>{t('routes.directOnly', 'Direct Route')}</span>
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('routes.subtitle')}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 text-xs dark:border-white/[0.08] dark:bg-[#1a1a1a] shadow-sm">
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
              {(shelters ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.status === 'open' ? t('shelter.statusOpen') : t('shelter.full')} ({s.occupancy || 0}/{s.capacity || 0})
                </option>
              ))}
            </select>

            {destination && (
              <a
                href={getNavigationUrl(destination.latitude, destination.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>{t('common.directions')}</span>
              </a>
            )}
          </div>

          {/* Route Option Cards */}
          {routeCards.map((r) => (
            <div
              key={r.id}
              onClick={() => setActiveRouteView(r.id)}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-xs shadow-sm transition cursor-pointer ${
                activeRouteView === r.id || activeRouteView === 'both'
                  ? r.safe
                    ? 'border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-500/40 dark:border-emerald-800 dark:bg-emerald-950/30'
                    : 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-500/40 dark:border-amber-800 dark:bg-amber-950/30'
                  : 'border-slate-200 bg-white opacity-70 hover:opacity-100 dark:border-white/[0.08] dark:bg-[#1a1a1a]'
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
                <div className="font-bold text-zinc-800 dark:text-slate-300 mono text-sm">{r.distanceKm.toFixed(1)} {t('common.km')}{r.distanceKm !== routeLengthKm(r.points) ? '' : r.fallback ? ' ~' : ''}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  ~{formatEta(r.durationMin, t)} {t('routes.walkingTime')}{routingLoading ? ` · ${t('common.loading')}` : ''}
                </div>
              </div>
            </div>
          ))}

          {/* Active Flood Zones List */}
          <h2 className="pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">{t('routes.hazardActive')}</h2>
          {flood.features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-red-200 bg-red-50/70 p-3.5 text-xs dark:border-red-900/40 dark:bg-red-950/30">
              <div className="font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span>{f.properties.hazard_type}</span>
              </div>
              <div className="text-red-600 dark:text-red-400 mt-0.5">
                {t('routes.severity')} {f.properties.severity} · ~{f.properties.water_depth_est_meters || 1.5}m {t('routes.depthSuffix')}
              </div>
              {f.properties.affected_villages && (
                <div className="mt-1 text-zinc-500 dark:text-slate-400">{t('routes.villages')} {f.properties.affected_villages.join(', ')}</div>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-zinc-200/80 dark:border-white/[0.08] h-[360px] sm:h-[480px] lg:h-[560px]">
            <LeafletMap
              center={origin}
              zoom={13}
              markers={markers}
              polygons={polygons}
              polylines={polylines}
              height="100%"
              autoFit={true}
              selectedId={destination ? `dest-${destination.id}` : null}
            />
          </div>

          {/* Map Point Feature Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300" /> {t('routes.origin')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-800" /> {t('routes.targetShelter', 'Target shelter')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" /> {t('routes.safeWaypoint', 'Safe detour')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-600" /> {t('routes.hazardActive')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-4 border-t-2 border-dashed border-amber-500" /> {t('routes.fastestRoute')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-emerald-500" /> {t('routes.safeDetour')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
