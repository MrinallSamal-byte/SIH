import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Layers, Globe, Mountain, Map as MapIcon, Moon } from 'lucide-react'
import type { GeoPoint } from '../../types'

export interface MapMarker {
  id: string
  position: GeoPoint
  title: string
  subtitle?: string
  color?: string
  isSos?: boolean
  isShelter?: boolean
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

export type MapLayerMode = 'satellite' | 'terrain' | 'streets' | 'dark'

const MAP_LAYERS: Record<
  MapLayerMode,
  {
    name: string
    url: string
    attribution: string
    subdomains: string | string[]
    overlayUrl?: string
    overlayAttribution?: string
  }
> = {
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'abc',
    overlayUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    overlayAttribution: 'Labels &copy; Esri',
  },
  streets: {
    name: 'Streets',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
  terrain: {
    name: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    subdomains: 'abc',
  },
  dark: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
}

function markerIcon(color: string, isSos = false, isShelter = false) {
  if (isSos) {
    return L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;">
          <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:#ef4444;opacity:0.6;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative;width:18px;height:18px;border-radius:50%;background:#dc2626;border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;">
            <div style="width:5px;height:5px;border-radius:50%;background:white;"></div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  }

  if (isShelter) {
    return L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
          <div style="width:24px;height:24px;border-radius:8px;background:${color};border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
  }

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:22px;height:22px;">
        <div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function MapController({
  center,
  zoom,
  markers = [],
  polygons = [],
  polylines = [],
  autoFit = false,
}: {
  center: GeoPoint
  zoom?: number
  markers?: MapMarker[]
  polygons?: MapPolygon[]
  polylines?: MapPolyline[]
  autoFit?: boolean
}) {
  const map = useMap()
  const hasFittedRef = useRef(false)
  const lastCenterRef = useRef(`${center?.lat?.toFixed(4) ?? '0'},${center?.lng?.toFixed(4) ?? '0'}`)

  // 1. Fit bounds on mount or when points change
  useEffect(() => {
    const safeMarkers = markers ?? []
    const safePolygons = polygons ?? []
    const safePolylines = polylines ?? []

    if (
      (!hasFittedRef.current || autoFit) &&
      (safeMarkers.length > 0 || safePolygons.length > 0 || safePolylines.length > 0)
    ) {
      const points: GeoPoint[] = [
        ...safeMarkers.map((m) => m?.position).filter((p): p is GeoPoint => Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number')),
        ...safePolygons.flatMap((p) => p?.points ?? []).filter((p): p is GeoPoint => Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number')),
        ...safePolylines.flatMap((p) => p?.points ?? []).filter((p): p is GeoPoint => Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number')),
      ]
      if (points.length > 1) {
        try {
          map.fitBounds(
            points.map((pt) => [pt.lat, pt.lng] as [number, number]),
            { padding: [40, 40], maxZoom: 15 },
          )
          hasFittedRef.current = true
        } catch {
          // fitBounds may fail if bounds are zero-area or map is unmounted
        }
      }
    }
  }, [map, markers, polygons, polylines, autoFit])

  // 2. Recenter smoothly
  useEffect(() => {
    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') return
    const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`
    if (key !== lastCenterRef.current) {
      lastCenterRef.current = key
      try {
        map.setView([center.lat, center.lng], zoom ?? map.getZoom(), { animate: true })
      } catch {
        // setView may fail if map instance is unmounting
      }
    }
  }, [map, center, zoom])

  return null
}

export default function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  polygons = [],
  polylines = [],
  height = '420px',
  autoFit = false,
  defaultLayer = 'satellite',
}: {
  center: GeoPoint
  zoom?: number
  markers?: MapMarker[]
  polygons?: MapPolygon[]
  polylines?: MapPolyline[]
  height?: string
  autoFit?: boolean
  defaultLayer?: MapLayerMode
}) {
  const [layerMode, setLayerMode] = useState<MapLayerMode>(() => {
    try {
      const saved = localStorage.getItem('aapdasetu_map_layer') as MapLayerMode
      if (saved && MAP_LAYERS[saved]) return saved
    } catch {
      // Storage unavailable
    }
    return defaultLayer
  })

  const [showLayerMenu, setShowLayerMenu] = useState(false)

  const selectLayer = (mode: MapLayerMode) => {
    setLayerMode(mode)
    setShowLayerMenu(false)
    try {
      localStorage.setItem('aapdasetu_map_layer', mode)
    } catch {
      // Storage unavailable
    }
  }

  const currentLayer = MAP_LAYERS[layerMode]

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs" style={{ height }}>
      {/* Floating Realistic Layer Selector Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end">
        <button
          type="button"
          onClick={() => setShowLayerMenu((o) => !o)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 cursor-pointer"
          title="Change Map View"
        >
          <Layers className="h-3.5 w-3.5 text-slate-900 dark:text-slate-100" />
          <span>{currentLayer.name} View</span>
        </button>

        {showLayerMenu && (
          <div className="mt-1.5 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
            <button
              type="button"
              onClick={() => selectLayer('satellite')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition cursor-pointer ${
                layerMode === 'satellite'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Satellite (Hybrid)</span>
            </button>

            <button
              type="button"
              onClick={() => selectLayer('terrain')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition cursor-pointer ${
                layerMode === 'terrain'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Mountain className="h-3.5 w-3.5" />
              <span>Topographic Terrain</span>
            </button>

            <button
              type="button"
              onClick={() => selectLayer('streets')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition cursor-pointer ${
                layerMode === 'streets'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Street Map</span>
            </button>

            <button
              type="button"
              onClick={() => selectLayer('dark')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition cursor-pointer ${
                layerMode === 'dark'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Tactical Dark</span>
            </button>
          </div>
        )}
      </div>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        {/* Base Layer */}
        <TileLayer
          key={layerMode}
          attribution={currentLayer.attribution}
          url={currentLayer.url}
          subdomains={currentLayer.subdomains || 'abc'}
          maxZoom={19}
        />

        {/* Optional Satellite Labels/Boundaries Overlay */}
        {currentLayer.overlayUrl && (
          <TileLayer
            key={`${layerMode}-overlay`}
            attribution={currentLayer.overlayAttribution ?? ''}
            url={currentLayer.overlayUrl}
            subdomains="abc"
            maxZoom={19}
          />
        )}

        <MapController
          center={center}
          zoom={zoom}
          markers={markers}
          polygons={polygons}
          polylines={polylines}
          autoFit={autoFit}
        />

        {/* Hazard Polygons */}
        {(polygons ?? [])
          .filter((p) => p && Array.isArray(p.points) && p.points.length >= 3)
          .map((p) => (
            <Polygon
              key={p.id}
              pathOptions={{
                color: p.color ?? '#dc2626',
                fillColor: p.color ?? '#dc2626',
                fillOpacity: 0.38,
                weight: 2,
              }}
              positions={p.points.map((pt) => [pt.lat, pt.lng] as [number, number])}
            >
              {p.label && (
                <Popup>
                  <div className="text-xs font-bold text-slate-900 p-1">{p.label}</div>
                </Popup>
              )}
            </Polygon>
          ))}

        {/* Routes Polylines */}
        {(polylines ?? [])
          .filter((p) => p && Array.isArray(p.points) && p.points.length >= 2)
          .map((p) => (
            <Polyline
              key={p.id}
              pathOptions={{
                color: p.color ?? '#3b82f6',
                weight: 4.5,
                opacity: 0.95,
                dashArray: p.dashed ? '6 6' : undefined,
              }}
              positions={p.points.map((pt) => [pt.lat, pt.lng] as [number, number])}
            >
              {p.label && (
                <Popup>
                  <div className="text-xs font-bold text-slate-900 p-1">{p.label}</div>
                </Popup>
              )}
            </Polyline>
          ))}

        {/* Interactive Markers */}
        {(markers ?? [])
          .filter(
            (m) =>
              m &&
              m.position &&
              typeof m.position.lat === 'number' &&
              typeof m.position.lng === 'number',
          )
          .map((m) => (
            <Marker
              key={m.id}
              position={[m.position.lat, m.position.lng]}
              icon={markerIcon(m.color ?? '#3b82f6', m.isSos, m.isShelter)}
            >
              <Popup>
                <div className="p-1">
                  <div className="text-sm font-bold text-slate-900">{m.title}</div>
                  {m.subtitle && <div className="mt-0.5 text-xs text-slate-600 leading-tight">{m.subtitle}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  )
}
