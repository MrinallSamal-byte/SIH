import type { GeoPoint } from '../types'

// ponytail: FOSSGIS public instance (routing.openstreetmap.de) serves a genuine foot profile;
// router.project-osrm.org is car-only and lied about walking times. Be gentle — it's community-run courtesy capacity.
const OSRM_FOOT_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'

export interface OsrmRoute {
  points: GeoPoint[]
  distanceKm: number
  durationMin: number
}

export async function fetchOsrmRoute(
  from: GeoPoint,
  to: GeoPoint,
  waypoints: GeoPoint[] = [],
): Promise<OsrmRoute | null> {
  try {
    const coords = [from, ...waypoints, to]
      .map((p) => `${p.lng},${p.lat}`)
      .join(';')
    // overview=full kept (callers draw the polyline; overview=false strips geometry entirely);
    // steps=false skips turn instructions to stay light on the shared instance.
    const url = `${OSRM_FOOT_URL}/${coords}?overview=full&geometries=geojson&steps=false`
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    let res: Response
    try {
      res = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(t)
    }
    if (!res.ok) return null
    const data = await res.json()
    const route = data?.routes?.[0]
    if (!route?.geometry?.coordinates?.length) return null
    const points: GeoPoint[] = route.geometry.coordinates.map(
      ([lng, lat]: number[]) => ({ lat, lng }) as GeoPoint,
    )
    const distanceKm =
      typeof route.distance === 'number' ? route.distance / 1000 : 0
    const durationMin =
      typeof route.duration === 'number' ? route.duration / 60 : 0
    if (points.length < 2) return null
    return { points, distanceKm, durationMin }
  } catch {
    return null
  }
}

export function haversineRouteLength(points: GeoPoint[]): number {
  if (!points || points.length < 2) return 0
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) *
        Math.cos(toRad(b.lat)) *
        Math.sin(dLng / 2) ** 2
    total += 2 * R * Math.asin(Math.sqrt(s))
  }
  return total
}
