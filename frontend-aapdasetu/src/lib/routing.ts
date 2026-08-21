import type { GeoPoint } from '../types'

const OSRM_BASE = 'https://router.project-osrm.org'

export interface OsrmRoute {
  points: GeoPoint[]
  distanceKm: number
  durationMin: number
}

export async function fetchOsrmRoute(
  from: GeoPoint,
  to: GeoPoint,
  waypoints: GeoPoint[] = [],
  profile: 'foot' | 'driving' = 'foot',
): Promise<OsrmRoute | null> {
  try {
    const coords = [from, ...waypoints, to]
      .map((p) => `${p.lng},${p.lat}`)
      .join(';')
    const url = `${OSRM_BASE}/route/v1/${profile}/${coords}?overview=full&geometries=geojson`
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(t)
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
