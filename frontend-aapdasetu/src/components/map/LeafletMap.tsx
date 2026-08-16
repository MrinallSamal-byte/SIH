import { useEffect, useRef } from 'react'
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
  isSos?: boolean
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

function markerIcon(color: string, isSos = false) {
  if (isSos) {
    return L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:#ef4444;opacity:0.6;animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative;width:14px;height:14px;border-radius:50%;background:#dc2626;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
  }

  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function MapController({
  center,
  zoom,
  markers,
  polygons,
  polylines,
  autoFit = false,
}: {
  center: GeoPoint
  zoom?: number
  markers: MapMarker[]
  polygons: MapPolygon[]
  polylines: MapPolyline[]
  autoFit?: boolean
}) {
  const map = useMap()
  const hasFittedRef = useRef(false)
  const lastCenterRef = useRef(`${center.lat.toFixed(4)},${center.lng.toFixed(4)}`)

  // 1. Initial fit bounds or explicit autoFit
  useEffect(() => {
    if ((!hasFittedRef.current || autoFit) && (markers.length > 0 || polygons.length > 0 || polylines.length > 0)) {
      const points: GeoPoint[] = [
        ...markers.map((m) => m.position),
        ...polygons.flatMap((p) => p.points),
        ...polylines.flatMap((p) => p.points),
      ]
      if (points.length > 1) {
        map.fitBounds(
          points.map((pt) => [pt.lat, pt.lng] as [number, number]),
          { padding: [40, 40], maxZoom: 15 },
        )
        hasFittedRef.current = true
      }
    }
  }, [map, markers, polygons, polylines, autoFit])

  // 2. Smooth recenter when center coordinate actually changes significantly
  useEffect(() => {
    const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`
    if (key !== lastCenterRef.current) {
      lastCenterRef.current = key
      map.setView([center.lat, center.lng], zoom ?? map.getZoom(), { animate: true })
    }
  }, [map, center.lat, center.lng, zoom])

  return null
}

export default function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  polygons = [],
  polylines = [],
  height = '400px',
  autoFit = false,
}: {
  center: GeoPoint
  zoom?: number
  markers?: MapMarker[]
  polygons?: MapPolygon[]
  polylines?: MapPolyline[]
  height?: string
  autoFit?: boolean
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '0.75rem', zIndex: 1 }}
    >
      <TileLayer attribution={config.mapAttribution} url={config.mapTileUrl} />
      <MapController
        center={center}
        zoom={zoom}
        markers={markers}
        polygons={polygons}
        polylines={polylines}
        autoFit={autoFit}
      />
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
        <Marker
          key={m.id}
          position={[m.position.lat, m.position.lng]}
          icon={markerIcon(m.color ?? '#3b82f6', m.isSos)}
        >
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

