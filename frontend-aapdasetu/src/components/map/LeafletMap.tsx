import { useEffect } from 'react'
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { config } from '../../config'
import type { GeoPoint } from '../../types'

export interface MapMarker {
  id: string
  position: GeoPoint
  title: string
  subtitle?: string
  color?: string
}

export interface MapPolygon {
  id: string
  points: GeoPoint[]
  color?: string
  label?: string
}

export interface MapPolyline {
  id: string
  points: GeoPoint[]
  color?: string
  dashed?: boolean
  label?: string
}

function markerIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
  })
}

function FitBounds({
  markers,
  polygons,
  polylines,
}: {
  markers: MapMarker[]
  polygons: MapPolygon[]
  polylines: MapPolyline[]
}) {
  const map = useMap()
  useEffect(() => {
    if (markers.length === 0 && polygons.length === 0 && polylines.length === 0) return
    const points: GeoPoint[] = [
      ...markers.map((m) => m.position),
      ...polygons.flatMap((p) => p.points),
      ...polylines.flatMap((p) => p.points),
    ]
    if (points.length > 0) {
      map.fitBounds(
        points.map((pt) => [pt.lat, pt.lng] as [number, number]),
        { padding: [50, 50] },
      )
    }
  }, [map, markers, polygons, polylines])
  return null
}

function Recenter({ center, zoom }: { center: GeoPoint; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom ?? map.getZoom(), { animate: true })
  }, [map, center.lat, center.lng, zoom])
  return null
}

/**
 * Leaflet map. Tile layer comes from VITE_MAP_TILE_URL / VITE_MAP_ATTRIBUTION
 * (see .env.example) — keyless OSM by default, or a keyed provider token can be
 * embedded in the URL string.
 */
export default function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  polygons = [],
  polylines = [],
  height = '400px',
}: {
  center: GeoPoint
  zoom?: number
  markers?: MapMarker[]
  polygons?: MapPolygon[]
  polylines?: MapPolyline[]
  height?: string
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '0.75rem' }}
    >
      <TileLayer attribution={config.mapAttribution} url={config.mapTileUrl} />
      <Recenter center={center} zoom={zoom} />
      <FitBounds markers={markers} polygons={polygons} polylines={polylines} />
      {polygons.map((p) => (
        <Polygon
          key={p.id}
          pathOptions={{ color: p.color ?? '#dc2626', fillColor: p.color ?? '#dc2626', fillOpacity: 0.35 }}
          positions={p.points.map((pt) => [pt.lat, pt.lng] as [number, number])}
        >
          {p.label && (
            <Popup>
              <div className="text-xs font-medium">{p.label}</div>
            </Popup>
          )}
        </Polygon>
      ))}
      {polylines.map((p) => (
        <Polyline
          key={p.id}
          pathOptions={{
            color: p.color ?? '#3b82f6',
            weight: 4,
            opacity: 0.9,
            dashArray: p.dashed ? '8 8' : undefined,
          }}
          positions={p.points.map((pt) => [pt.lat, pt.lng] as [number, number])}
        >
          {p.label && (
            <Popup>
              <div className="text-xs font-medium">{p.label}</div>
            </Popup>
          )}
        </Polyline>
      ))}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.position.lat, m.position.lng]} icon={markerIcon(m.color ?? '#3b82f6')}>
          <Popup>
            <div>
              <div className="text-sm font-semibold">{m.title}</div>
              {m.subtitle && <div className="text-xs text-slate-500">{m.subtitle}</div>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
