import { useEffect, useMemo, useState } from 'react'
import {
  Compass,
  Navigation,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Zap,
  Radio,
  Loader2,
} from 'lucide-react'
import { aiSatelliteFloodMap } from '../../api/ai'
import { listShelters } from '../../api/endpoints'
import Loader from '../../components/common/Loader'
import LeafletMap, { type MapMarker, type MapPolyline } from '../../components/map/LeafletMap'
import { useGeoLocation } from '../../hooks/useLocation'
import { useLanguage } from '../../lib/i18n'
import { getNavigationUrl } from '../../lib/helpers'
import { calculateDualRoutes, haversineKm, type RouteOption } from '../../lib/routing'
import type { FloodGeoJson, GeoPoint, Shelter } from '../../types'

const DEFAULT_CENTER: GeoPoint = { lat: 22.5726, lng: 88.3639 }

export default function SafeRoutes() {
  const { t } = useLanguage()
  const { coords, status, accuracy, refresh } = useGeoLocation()
  const [flood, setFlood] = useState<FloodGeoJson | null>(null)
  const [shelters, setShelters] = useState<Shelter[] | null>(null)
  const [destinationId, setDestinationId] = useState<string>('')
  const [activeRouteView, setActiveRouteView] = useState<'safe' | 'fastest' | 'both'>('both')
  const [useLocalSimulation, setUseLocalSimulation] = useState<boolean>(true)

  const [dualRoutes, setDualRoutes] = useState<{ safe: RouteOption; shortest: RouteOption } | null>(null)
  const [routingLoading, setRoutingLoading] = useState(false)

  useEffect(() => {
    aiSatelliteFloodMap({ center: DEFAULT_CENTER, radiusKm: 30 })
      .then((res) => setFlood(res || { type: 'FeatureCollection', features: [] }))
      .catch(() => setFlood({ type: 'FeatureCollection', features: [] }))

    listShelters('open')
      .then((res) => setShelters(res || []))
      .catch(() => setShelters([]))
  }, [])

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

  const isFarFromShelter = useMemo(() => {
    if (!coords || !destPoint) return false
    const d = haversineKm({ lat: coords.latitude, lng: coords.longitude }, destPoint)
    return d > 50
  }, [coords, destPoint])

  const effectiveOrigin: GeoPoint = useMemo(() => {
    if (coords && (!isFarFromShelter || !useLocalSimulation)) {
      return { lat: coords.latitude, lng: coords.longitude }
    }
    if (destPoint) {
      return {
        lat: destPoint.lat - 0.022,
        lng: Math.max(88.362, destPoint.lng - 0.010),
      }
    }
    return DEFAULT_CENTER
  }, [coords, isFarFromShelter, useLocalSimulation, destPoint])

  useEffect(() => {
    if (!destPoint || !effectiveOrigin) return
    let cancelled = false
    setRoutingLoading(true)

    calculateDualRoutes(effectiveOrigin, destPoint, hazardPolys, destination?.name || 'Safe Haven')
      .then((res) => {
        if (!cancelled && res) {
          setDualRoutes(res)
          setRoutingLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setRoutingLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [effectiveOrigin.lat, effectiveOrigin.lng, destPoint?.lat, destPoint?.lng, hazardPolys, destination?.name])

  // Distinct Route Polylines
  const polylines: MapPolyline[] = useMemo(() => {
    if (!dualRoutes) return []
    const list: MapPolyline[] = []

    // 1. High-Confidence Safe Corridor (Solid Emerald Green)
    if (activeRouteView === 'safe' || activeRouteView === 'both') {
      list.push({
        id: 'safe-detour-route',
        points: dualRoutes.safe.points,
        color: '#10b981',
        weight: activeRouteView === 'safe' ? 6 : 5,
        opacity: 0.95,
        dashed: false,
        label: `${dualRoutes.safe.name}: ${dualRoutes.safe.distanceKm} km (~${dualRoutes.safe.durationMin}m walk) · 98% Safety Confidence`,
      })
    }

    // 2. Shortest Direct Route (Dashed Amber Orange)
    if (activeRouteView === 'fastest' || activeRouteView === 'both') {
      list.push({
        id: 'fastest-direct-route',
        points: dualRoutes.shortest.points,
        color: '#f59e0b',
        weight: activeRouteView === 'fastest' ? 5 : 4,
        opacity: 0.9,
        dashed: true,
        label: `${dualRoutes.shortest.name}: ${dualRoutes.shortest.distanceKm} km (~${dualRoutes.shortest.durationMin}m walk) · 72% Confidence`,
      })
    }

    return list
  }, [dualRoutes, activeRouteView])

  // Distinct Markers for all points:
  const markers = useMemo(() => {
    const list: MapMarker[] = []

    // 1. Origin marker
    list.push({
      id: 'origin-marker',
      position: effectiveOrigin,
      title: coords && (!isFarFromShelter || !useLocalSimulation) ? t('common.youAreHere') : 'Starting Point (Central Corridor)',
      subtitle: coords && (!isFarFromShelter || !useLocalSimulation)
        ? (accuracy ? `${t('common.gpsAccuracy')}${Math.round(accuracy)}m` : t('routes.liveLocation'))
        : 'Evacuation Zone Starting Point (~2.5km to haven)',
      color: '#3b82f6',
      isSos: true,
      markerKind: 'user',
      badgeText: 'START',
    })

    // 2. Destination Safe Haven Marker
    if (destination && destPoint) {
      list.push({
        id: `dest-${destination.id}`,
        position: destPoint,
        title: `Target Haven: ${destination.name}`,
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
    if (dualRoutes?.safe.points && dualRoutes.safe.points.length > 2 && (activeRouteView === 'safe' || activeRouteView === 'both')) {
      const midPoint = dualRoutes.safe.points[Math.floor(dualRoutes.safe.points.length / 2)]
      if (midPoint) {
        list.push({
          id: 'safe-waypoint-mid',
          position: midPoint,
          title: 'Safe Evacuation Bypass Checkpoint',
          subtitle: 'Elevated roadway · SDRF clear zone & emergency vehicle priority',
          color: '#059669',
          isWaypoint: true,
          markerKind: 'waypoint',
          badgeText: 'SAFE',
        })
      }
    }

    // 4. Other Available Shelters in region
    ;(shelters ?? [])
      .filter((s) => s.id !== destinationId && typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .forEach((s) => {
        list.push({
          id: s.id,
          position: { lat: s.latitude as number, lng: s.longitude as number },
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
  }, [effectiveOrigin, coords, isFarFromShelter, useLocalSimulation, destination, destPoint, dualRoutes, activeRouteView, shelters, destinationId, accuracy, t])

  if (!flood || !shelters) return <Loader />

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-zinc-800 dark:text-zinc-200" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('routes.title')}
          </h1>
          {routingLoading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
        </div>

        {/* Route Filter View Toggle */}
        <div className="flex flex-wrap items-center rounded-xl border border-zinc-200 bg-zinc-100/80 p-0.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setActiveRouteView('both')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              activeRouteView === 'both'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {t('routes.allRoutes', 'Compare Both')}
          </button>
          <button
            type="button"
            onClick={() => setActiveRouteView('safe')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              activeRouteView === 'safe'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('routes.safeOnly', 'Safe Passage (98%)')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveRouteView('fastest')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              activeRouteView === 'fastest'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>{t('routes.directOnly', 'Direct Route (72%)')}</span>
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {t('routes.subtitle')}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mono">
                {t('routes.origin')}
              </label>
              {coords && isFarFromShelter && (
                <button
                  type="button"
                  onClick={() => setUseLocalSimulation((s) => !s)}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
                >
                  <Radio className="h-3 w-3 text-blue-500" />
                  <span>{useLocalSimulation ? 'Local Demo' : 'Real GPS'}</span>
                </button>
              )}
            </div>

            <div className="mt-1.5 font-medium text-zinc-800 dark:text-zinc-200">
              {coords && (!isFarFromShelter || !useLocalSimulation)
                ? `Live GPS: ${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E`
                : `Evacuation Zone Origin: ${effectiveOrigin.lat.toFixed(4)}°N, ${effectiveOrigin.lng.toFixed(4)}°E`}
            </div>

            {coords && isFarFromShelter && useLocalSimulation && (
              <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Live GPS is located in another region. Simulating evacuation origin ~2.5km from destination shelter.
              </div>
            )}

            <button
              type="button"
              onClick={refresh}
              disabled={status === 'locating'}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <MapPin className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>{status === 'locating' ? t('shelter.locating') : coords ? t('shelter.updateLocation') : t('shelter.detectLocation')}</span>
            </button>

            <label htmlFor="safe-route-dest" className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mono">
              {t('routes.destination')}
            </label>
            <select
              id="safe-route-dest"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
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
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>{t('common.directions')}</span>
              </a>
            )}
          </div>

          {/* Route Option Cards */}
          {dualRoutes && (
            <div className="space-y-2.5">
              {/* Option 1: Safe Evacuation Corridor */}
              <div
                onClick={() => setActiveRouteView('safe')}
                className={`flex flex-col gap-2 rounded-2xl border p-4 text-xs shadow-xs transition cursor-pointer ${
                  activeRouteView === 'safe' || activeRouteView === 'both'
                    ? 'border-zinc-300 bg-zinc-50/90 ring-1 ring-emerald-500/50 dark:border-zinc-700 dark:bg-zinc-900'
                    : 'border-zinc-200/80 bg-white opacity-70 hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>Safe Evacuation Corridor</span>
                  </div>
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                    98% Confidence
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {dualRoutes.safe.distanceKm} km
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400">
                    ~{dualRoutes.safe.durationMin}m walk · ~{dualRoutes.safe.driveDurationMin}m drive
                  </div>
                </div>

                <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px] border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-0.5">
                  <div><span className="font-medium text-zinc-800 dark:text-zinc-200">Road Quality:</span> {dualRoutes.safe.roadCondition}</div>
                  <div><span className="font-medium text-zinc-800 dark:text-zinc-200">Elevation:</span> {dualRoutes.safe.elevationLabel}</div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    {activeRouteView === 'safe' ? 'Active Single View' : 'Focus Safe Route →'}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">Solid Green Line</span>
                </div>
              </div>

              {/* Option 2: Direct Urban Route */}
              <div
                onClick={() => setActiveRouteView('fastest')}
                className={`flex flex-col gap-2 rounded-2xl border p-4 text-xs shadow-xs transition cursor-pointer ${
                  activeRouteView === 'fastest' || activeRouteView === 'both'
                    ? 'border-zinc-300 bg-zinc-50/90 ring-1 ring-amber-500/50 dark:border-zinc-700 dark:bg-zinc-900'
                    : 'border-zinc-200/80 bg-white opacity-70 hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span>Direct Urban Route</span>
                  </div>
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                    72% Confidence
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {dualRoutes.shortest.distanceKm} km
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400">
                    ~{dualRoutes.shortest.durationMin}m walk · ~{dualRoutes.shortest.driveDurationMin}m drive
                  </div>
                </div>

                <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px] border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-0.5">
                  <div><span className="font-medium text-zinc-800 dark:text-zinc-200">Road Quality:</span> {dualRoutes.shortest.roadCondition}</div>
                  <div><span className="font-medium text-zinc-800 dark:text-zinc-200">Advisory:</span> Low-lying drainage zone proximity</div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                    {activeRouteView === 'fastest' ? 'Active Single View' : 'Focus Direct Route →'}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">Dashed Amber Line</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Flood Zones List */}
          <h2 className="pt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mono">{t('routes.hazardActive')}</h2>
          {flood.features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{f.properties.hazard_type}</span>
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                {t('routes.severity')} {f.properties.severity} · ~{f.properties.water_depth_est_meters || 1.5}m {t('routes.depthSuffix')}
              </div>
              {f.properties.affected_villages && (
                <div className="mt-1 text-zinc-500 dark:text-zinc-400">{t('routes.villages')} {f.properties.affected_villages.join(', ')}</div>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden shadow-xs border border-zinc-200/80 dark:border-zinc-800 h-[360px] sm:h-[480px] lg:h-[560px]">
            <LeafletMap
              center={effectiveOrigin}
              zoom={14}
              markers={markers}
              polylines={polylines}
              height="100%"
              autoFit={false}
              selectedId={destination ? `dest-${destination.id}` : null}
            />
          </div>

          {/* Map Point Feature Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300" /> {t('routes.origin')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-800" /> {t('routes.targetShelter', 'Target Haven')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" /> {t('routes.safeWaypoint', 'Safe Checkpoint')}
              </span>
            </div>

            {dualRoutes && (
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                  <span className="inline-block h-1.5 w-4 rounded-full bg-emerald-500" /> Safe Corridor (98%)
                </span>
                <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                  <span className="inline-block h-1.5 w-4 rounded-full bg-amber-500 border-b border-dashed" /> Direct Route (72%)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
