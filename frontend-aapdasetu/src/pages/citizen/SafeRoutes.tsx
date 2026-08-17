import { useEffect, useMemo, useState } from 'react'
import { aiSatelliteFloodMap } from '../../api/ai'
import { listShelters } from '../../api/endpoints'
import Loader from '../../components/common/Loader'
import LeafletMap from '../../components/map/LeafletMap'
import { useLocation } from '../../hooks/useLocation'
import { getNavigationUrl } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
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

function routeLengthKm(points: GeoPoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i])
  return total
}

function segmentsIntersect(a: GeoPoint, b: GeoPoint, c: GeoPoint, d: GeoPoint): boolean {
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

function lineCrossesPolygon(a: GeoPoint, b: GeoPoint, polygon: GeoPoint[]): boolean {
  for (let i = 0; i < polygon.length; i++) {
    const c = polygon[i]
    const d = polygon[(i + 1) % polygon.length]
    if (segmentsIntersect(a, b, c, d)) return true
  }
  return false
}

function distToSegment(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const dLng = b.lng - a.lng
  const dLat = b.lat - a.lat
  const lenSq = dLng * dLng + dLat * dLat
  if (lenSq === 0) return haversineKm(p, a)
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dLng + (p.lat - a.lat) * dLat) / lenSq))
  return haversineKm(p, { lat: a.lat + t * dLat, lng: a.lng + t * dLng })
}

/** Direct (fastest) path: straight line origin -> shelter. */
function buildFastestRoute(from: GeoPoint, to: GeoPoint): GeoPoint[] {
  return [from, to]
}

/** Safe path: detours around flood zones with a 300-meter outward clearance buffer. */
function buildSafeRoute(from: GeoPoint, to: GeoPoint, polygons: GeoPoint[][]): GeoPoint[] {
  const crossing = polygons.filter((poly) => lineCrossesPolygon(from, to, poly))
  if (crossing.length === 0) return [from, to]

  const waypoints = crossing
    .map((poly) => {
      // Find polygon centroid
      const centerLat = poly.reduce((acc, p) => acc + p.lat, 0) / poly.length
      const centerLng = poly.reduce((acc, p) => acc + p.lng, 0) / poly.length

      let best = poly[0]
      let bestDist = -1
      for (const v of poly) {
        const d = distToSegment(v, from, to)
        if (d > bestDist) {
          bestDist = d
          best = v
        }
      }

      // Compute outward vector (300m safety clearance buffer ~ 0.003 degrees)
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
    .sort((x, y) => x.t - y.t)

  return [from, ...waypoints.map((w) => w.point), to]
}

function formatEta(minutes: number): string {
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

export default function SafeRoutes() {
  const { t } = useLanguage()
  const { coords, status, accuracy, refresh } = useLocation()
  const [flood, setFlood] = useState<FloodGeoJson | null>(null)
  const [shelters, setShelters] = useState<Shelter[] | null>(null)
  const [destinationId, setDestinationId] = useState<string>('')

  const origin: GeoPoint = useMemo(
    () => (coords ? { lat: coords.latitude, lng: coords.longitude } : DEFAULT_CENTER),
    [coords],
  )

  useEffect(() => {
    aiSatelliteFloodMap({ center: { lat: origin.lat, lng: origin.lng } }).then(setFlood)
    listShelters().then((list) => {
      setShelters(list)
      const openShelters = list.filter((s) => s.status === 'open')
      if (openShelters.length > 0) setDestinationId(openShelters[0].id)
      else if (list.length > 0) setDestinationId(list[0].id)
    })
  }, [origin.lat, origin.lng])

  const polygonPaths = useMemo<GeoPoint[][]>(() => {
    if (!flood) return []
    return flood.features.map((f) => {
      const ring = f.geometry.coordinates[0] ?? []
      return ring.map(([lng, lat]) => ({ lat, lng }))
    })
  }, [flood])

  const polygons = useMemo(() => {
    if (!flood) return []
    return flood.features.map((f, i) => {
      const ring = f.geometry.coordinates[0] ?? []
      const points: GeoPoint[] = ring.map(([lng, lat]) => ({ lat, lng }))
      return {
        id: `flood-${i}`,
        points,
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.28,
        label: `${f.properties.hazard_type}: ~${f.properties.water_depth_est_meters}m depth`,
      }
    })
  }, [flood])

  const shelterMarkers = useMemo(
    () =>
      (shelters ?? []).map((s) => ({
        id: s.id,
        position: { lat: s.latitude, lng: s.longitude } as GeoPoint,
        title: s.name,
        subtitle: `${t(`shelters.status${s.status === 'open' ? 'Open' : s.status === 'full' ? 'Full' : 'Closed'}`)} · ${t('shelters.occupancy')}: ${s.occupancy}/${s.capacity}`,
        color: '#10b981',
      })),
    [shelters, t],
  )

  const userMarker = useMemo(
    () =>
      coords
        ? {
            id: 'you',
            position: origin,
            title: t('routes.youAreHere'),
            subtitle: accuracy ? `GPS ±${Math.round(accuracy)}m` : t('common.location'),
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
    () => (shelters ?? []).find((s) => s.id === destinationId) ?? null,
    [shelters, destinationId],
  )

  const fastestRoute = useMemo<GeoPoint[]>(
    () => (destination ? buildFastestRoute(origin, { lat: destination.latitude, lng: destination.longitude }) : []),
    [origin, destination],
  )

  const safeRoute = useMemo<GeoPoint[]>(
    () =>
      destination
        ? buildSafeRoute(origin, { lat: destination.latitude, lng: destination.longitude }, polygonPaths)
        : [],
    [origin, destination, polygonPaths],
  )

  const routes = useMemo(
    () => [
      {
        id: 'fastest',
        label: t('routes.fastest'),
        points: fastestRoute,
        color: '#f59e0b',
        dashed: false,
        hazard: 'Direct line',
        safe: false,
      },
      {
        id: 'safe',
        label: t('routes.safeDetour'),
        points: safeRoute,
        color: '#10b981',
        dashed: true,
        hazard: 'Safe detour buffer',
        safe: true,
      },
    ],
    [fastestRoute, safeRoute, t],
  )

  if (!flood || !shelters) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('routes.title')}</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('routes.subtitle')}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('common.location')}</label>
            <div className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
              {coords ? `GPS: ${origin.lat.toFixed(4)}°N, ${origin.lng.toFixed(4)}°E` : 'Regional Fallback Active'}
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={status === 'locating'}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              {status === 'locating' ? t('routes.acquiringGps') : coords ? t('routes.updateGps') : t('routes.detectGps')}
            </button>

            <label htmlFor="safe-route-dest" className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {t('routes.destShelter')}
            </label>
            <select
              id="safe-route-dest"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
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
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 cursor-pointer"
              >
                <span>{t('routes.startNav')}</span>
              </a>
            )}
          </div>

          {routes.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border p-3.5 text-xs shadow-sm"
              style={{
                borderColor: r.color,
                backgroundColor: r.safe ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              }}
            >
              <div>
                <div className="flex items-center gap-2 font-bold" style={{ color: r.color }}>
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: r.color }}
                    aria-hidden="true"
                  />
                  {r.label}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-slate-900 dark:text-slate-100">{routeLengthKm(r.points).toFixed(1)} {t('common.km')}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  ~{formatEta((routeLengthKm(r.points) / WALK_SPEED_KMPH) * 60)} {t('common.walk')}
                </div>
              </div>
            </div>
          ))}

          <h2 className="pt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{t('routes.floodZonesDetected')}</h2>
          {flood.features.map((f, i) => (
            <div key={i} className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs dark:border-red-900/40 dark:bg-red-950/30">
              <div className="font-bold text-red-700 dark:text-red-300">{f.properties.hazard_type}</div>
              <div className="text-red-600 dark:text-red-400">
                {t('routes.severity')}: {f.properties.severity} · ~{f.properties.water_depth_est_meters}m {t('routes.depth')}
              </div>
              {f.properties.affected_villages && (
                <div className="mt-1 text-slate-600 dark:text-slate-400">{t('routes.affectedVillages')} {f.properties.affected_villages.join(', ')}</div>
              )}
            </div>
          ))}
        </div>
        <div className="lg:col-span-2">
          <LeafletMap
            center={origin}
            zoom={13}
            markers={markers}
            polygons={polygons}
            polylines={routes.map((r) => ({ id: r.id, points: r.points, color: r.color, dashed: r.dashed, label: r.label }))}
            height="520px"
            autoFit
          />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-6 bg-amber-500" aria-hidden="true" /> {t('routes.directLine')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-6 border-t-2 border-dashed border-emerald-500" aria-hidden="true" /> {t('routes.safeDetourLegend')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500/70" aria-hidden="true" /> {t('routes.floodInundation')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" /> {t('routes.openShelter')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" /> {t('routes.youAreHere')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
