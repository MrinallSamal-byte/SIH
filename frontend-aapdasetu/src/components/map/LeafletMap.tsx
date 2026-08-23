import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  ScaleControl,
} from 'react-leaflet'
import L from 'leaflet'
import { Layers, Globe, Mountain, Map as MapIcon, Moon } from 'lucide-react'
import type { GeoPoint } from '../../types'

export interface MapPopupAction {
  label: string
  onClick: () => void
}

export interface MapMarker {
  id: string
  position: GeoPoint
  title: string
  subtitle?: string
  color?: string
  isSos?: boolean
  isShelter?: boolean
  popupActions?: MapPopupAction[]
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

export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.0, 68.0],
  [37.5, 97.5],
]
export const INDIA_CENTER: GeoPoint = { lat: 22.0, lng: 79.0 }

/** Above this many markers, switch from DOM divIcons to canvas CircleMarkers */
export const CANVAS_MARKER_THRESHOLD = 80

export type MapLayerMode = 'satellite' | 'streets' | 'osm' | 'terrain' | 'dark'

interface LayerDef {
  name: string
  url: string
  attribution: string
  subdomains: string | string[]
  /** only true for providers whose URLs contain the {r} placeholder */
  retina?: boolean
  overlayUrl?: string
  overlayAttribution?: string
}

const MAP_LAYERS: Record<MapLayerMode, LayerDef> = {
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'abc',
    overlayUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    overlayAttribution: 'Labels &copy; Esri',
  },
  // Fast global CDN, clean look — default basemap
  streets: {
    name: 'Streets (Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    retina: true,
  },
  osm: {
    name: 'Classic OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
  },
  // OpenTopoMap throttles hard under load — Esri World Topo is fast and global
  terrain: {
    name: 'Terrain (Esri Topo)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    subdomains: 'abc',
  },
  dark: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    retina: true,
  },
}

// Stable icon instances: react-leaflet diffs the icon prop by reference, so a
// fresh L.divIcon per render destroys/re-adds every DOM marker. Cache instead.
const ICON_CACHE = new Map<string, L.DivIcon>()

function iconCacheKey(color: string, isSos: boolean, isShelter: boolean, selected: boolean) {
  return `${color}|${isSos ? 1 : 0}|${isShelter ? 1 : 0}|${selected ? 1 : 0}`
}

function markerIcon(color: string, isSos = false, isShelter = false, selected = false): L.DivIcon {
  const key = iconCacheKey(color, isSos, isShelter, selected)
  const cached = ICON_CACHE.get(key)
  if (cached) return cached

  let icon: L.DivIcon

  if (isSos) {
    const size = selected ? 44 : 32
    const core = selected ? 24 : 18
    // Infinite ping animation ONLY on the selected marker — one compositing
    // layer beats hundreds of animated layers during zoom.
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:#ef4444;opacity:${selected ? '0.75' : '0.6'};${selected ? 'animation:apd-ping 1s cubic-bezier(0,0,0.2,1) infinite;' : ''}"></div>
          ${
            selected
              ? `<div style="position:absolute;width:${core + 12}px;height:${core + 12}px;border-radius:50%;border:3px solid rgba(220,38,38,0.55);"></div>`
              : ''
          }
          <div style="position:relative;width:${core}px;height:${core}px;border-radius:50%;background:#dc2626;border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;">
            <div style="width:${selected ? 7 : 5}px;height:${selected ? 7 : 5}px;border-radius:50%;background:white;"></div>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  } else if (isShelter) {
    const size = selected ? 34 : 28
    const box = selected ? 30 : 24
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="width:${box}px;height:${box}px;border-radius:8px;background:${color};border:2px solid white;box-shadow:${selected ? `0 0 0 3px rgba(59,130,246,0.45), ` : ''}0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  } else {
    const size = selected ? 30 : 22
    const dotSize = selected ? 22 : 16
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:${selected ? `0 0 0 3px rgba(59,130,246,0.45), ` : ''}0 2px 6px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  ICON_CACHE.set(key, icon)
  return icon
}

const EMPTY_ACTIONS: MapPopupAction[] = []

function MarkerPopupContent({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions: MapPopupAction[]
}) {
  return (
    <div className="min-w-[180px] p-1">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      {subtitle && <div className="mt-0.5 text-xs text-slate-600 leading-tight">{subtitle}</div>}
      {actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                action.onClick()
              }}
              className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-slate-700 cursor-pointer"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Removes the bulky "Leaflet" prefix so the control stays compact */
function CompactAttribution() {
  const map = useMap()
  useEffect(() => {
    try {
      map.attributionControl?.setPrefix('')
    } catch {
      // attribution control unavailable
    }
  }, [map])
  return null
}

function MapController({
  center,
  zoom,
  markers = [],
  polygons = [],
  polylines = [],
  autoFit = false,
  height,
}: {
  center: GeoPoint
  zoom?: number
  markers?: MapMarker[]
  polygons?: MapPolygon[]
  polylines?: MapPolyline[]
  autoFit?: boolean
  height?: string
}) {
  const map = useMap()
  const hasFittedRef = useRef(false)
  const lastCenterRef = useRef(`${center?.lat?.toFixed(4) ?? '0'},${center?.lng?.toFixed(4) ?? '0'}`)
  const lastFitSigRef = useRef<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize()
      } catch {
        // map may be unmounted/destroyed between the timeout scheduling and firing
      }
    }, 120)
    return () => clearTimeout(t)
  }, [map, height])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          try {
            map.invalidateSize()
          } catch {
            // map may be unmounted/destroyed before the visibility timeout fires
          }
        }, 100)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [map])

  // 1. Fit bounds on mount or when the underlying geometry actually changes.
  // Polling parents recreate the markers array every tick — refitting on every
  // poll yanks the viewport, so compare a cheap signature before fitting.
  useEffect(() => {
    const safeMarkers = markers ?? []
    const safePolygons = polygons ?? []
    const safePolylines = polylines ?? []

    const points: GeoPoint[] = [
      ...safeMarkers.map((m) => m?.position).filter((p): p is GeoPoint => Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number')),
      ...safePolygons.flatMap((p) => p?.points ?? []).filter((p): p is GeoPoint => Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number')),
      ...safePolylines.flatMap((p) => p?.points ?? []).filter((p): p is GeoPoint => Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number')),
    ]

    if (
      (!hasFittedRef.current || autoFit) &&
      (safeMarkers.length > 0 || safePolygons.length > 0 || safePolylines.length > 0)
    ) {
      const lats = points.map((pt) => pt.lat)
      const lngs = points.map((pt) => pt.lng)
      const sig =
        points.length <= 1
          ? ''
          : `${points.length}:${Math.min(...lats).toFixed(3)},${Math.max(...lats).toFixed(3)},${Math.min(...lngs).toFixed(3)},${Math.max(...lngs).toFixed(3)}`
      const shouldFit = !hasFittedRef.current || (autoFit && sig !== lastFitSigRef.current)
      if (shouldFit && points.length > 1) {
        try {
          map.fitBounds(
            points.map((pt) => [pt.lat, pt.lng] as [number, number]),
            { padding: [40, 40], maxZoom: 15 },
          )
          hasFittedRef.current = true
          lastFitSigRef.current = sig
        } catch {
          // fitBounds may fail if bounds are zero-area or map is unmounted
        }
      }
    }
  }, [map, markers, polygons, polylines, autoFit])

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize()
      } catch {
        // map may be unmounted/destroyed between the timeout scheduling and firing
      }
    }, 150)
    return () => clearTimeout(t)
  }, [map, markers.length, polylines.length, polygons.length])

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
  defaultLayer = 'streets',
  popupActions,
  selectedId = null,
}: {
  center: GeoPoint
  zoom?: number
  markers?: MapMarker[]
  polygons?: MapPolygon[]
  polylines?: MapPolyline[]
  height?: string
  autoFit?: boolean
  defaultLayer?: MapLayerMode
  popupActions?: MapPopupAction[]
  selectedId?: string | null
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

  // Rebuild the marker element tree only when inputs genuinely change — parent
  // polling recreates arrays but the contents stay equal, so memoize on refs.
  const visibleMarkers = useMemo(
    () =>
      (markers ?? []).filter(
        (m) =>
          m &&
          m.position &&
          typeof m.position.lat === 'number' &&
          typeof m.position.lng === 'number',
      ),
    [markers],
  )

  const useCanvas = visibleMarkers.length > CANVAS_MARKER_THRESHOLD

  // On canvas, draw order == paint order, so put the selected circle last.
  const orderedCanvasMarkers = useMemo(() => {
    if (!useCanvas || selectedId == null) return visibleMarkers
    return [...visibleMarkers].sort(
      (a, b) => (a.id === selectedId ? 1 : 0) - (b.id === selectedId ? 1 : 0),
    )
  }, [useCanvas, visibleMarkers, selectedId])

  const domMarkers = useMemo(
    () =>
      useCanvas
        ? []
        : visibleMarkers.map((m) => {
            const isSelected = selectedId != null && m.id === selectedId
            return (
              <Marker
                key={m.id}
                position={[m.position.lat, m.position.lng]}
                icon={markerIcon(m.color ?? '#3b82f6', m.isSos, m.isShelter, isSelected)}
                zIndexOffset={isSelected ? 1000 : 0}
              >
                <Popup>
                  <MarkerPopupContent
                    title={m.title}
                    subtitle={m.subtitle}
                    actions={m.popupActions ?? popupActions ?? EMPTY_ACTIONS}
                  />
                </Popup>
              </Marker>
            )
          }),
    [useCanvas, visibleMarkers, selectedId, popupActions],
  )

  const canvasMarkers = useMemo(
    () =>
      useCanvas
        ? orderedCanvasMarkers.map((m) => {
            const isSelected = selectedId != null && m.id === selectedId
            return (
              <CircleMarker
                key={m.id}
                center={[m.position.lat, m.position.lng]}
                radius={isSelected ? 9 : 7}
                pathOptions={{
                  fillColor: m.color ?? '#3b82f6',
                  fillOpacity: 0.95,
                  color: '#ffffff',
                  weight: 2,
                }}
              >
                <Popup>
                  <MarkerPopupContent
                    title={m.title}
                    subtitle={m.subtitle}
                    actions={m.popupActions ?? popupActions ?? EMPTY_ACTIONS}
                  />
                </Popup>
              </CircleMarker>
            )
          })
        : [],
    [useCanvas, orderedCanvasMarkers, selectedId, popupActions],
  )

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs" style={{ height }}>
      {/* Floating Realistic Layer Selector Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end">
        <button
          type="button"
          onClick={() => setShowLayerMenu((o) => !o)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md transition hover:bg-white dark:border-white/[0.1] dark:bg-slate-900/95 dark:text-slate-100 cursor-pointer"
          title="Change Map View"
        >
          <Layers className="h-3.5 w-3.5 text-slate-900 dark:text-slate-100" />
          <span>{currentLayer.name} View</span>
        </button>

        {showLayerMenu && (
          <div className="mt-1.5 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-white/[0.1] dark:bg-slate-900/95">
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
              onClick={() => selectLayer('streets')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition cursor-pointer ${
                layerMode === 'streets'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Streets (Voyager)</span>
            </button>

            <button
              type="button"
              onClick={() => selectLayer('osm')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition cursor-pointer ${
                layerMode === 'osm'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Classic OSM</span>
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
              <span>Terrain (Esri Topo)</span>
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
        minZoom={5}
        maxZoom={19}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        preferCanvas
        zoomControl={false}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <ScaleControl position="bottomleft" imperial={false} />
        <ZoomControl position="bottomright" />
        <CompactAttribution />

        {/* Base Layer */}
        <TileLayer
          key={layerMode}
          attribution={currentLayer.attribution}
          url={currentLayer.url}
          subdomains={currentLayer.subdomains || 'abc'}
          maxZoom={19}
          keepBuffer={4}
          updateWhenIdle={false}
          updateWhenZooming={false}
          detectRetina={currentLayer.retina === true}
        />

        {/* Optional Satellite Labels/Boundaries Overlay */}
        {currentLayer.overlayUrl && (
          <TileLayer
            key={`${layerMode}-overlay`}
            attribution={currentLayer.overlayAttribution ?? ''}
            url={currentLayer.overlayUrl}
            subdomains="abc"
            maxZoom={19}
            keepBuffer={4}
            updateWhenIdle={false}
            updateWhenZooming={false}
          />
        )}

        <MapController
          center={center}
          zoom={zoom}
          markers={markers}
          polygons={polygons}
          polylines={polylines}
          autoFit={autoFit}
          height={height}
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

        {/* Road-following Routes (OSRM) */}
        {(polylines ?? [])
          .filter((p) => p && Array.isArray(p.points) && p.points.length >= 2)
          .map((p) => (
            <Polyline
              key={p.id}
              pathOptions={{
                color: p.color ?? '#3b82f6',
                weight: 5,
                opacity: 0.92,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: p.dashed ? '10 10' : undefined,
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
        {canvasMarkers}
        {domMarkers}
      </MapContainer>
    </div>
  )
}
