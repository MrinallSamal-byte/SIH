import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  Layers,
  Globe,
  Mountain,
  Map as MapIcon,
  Moon,
  Maximize2,
  Navigation,
} from 'lucide-react'
import type { GeoPoint } from '../../types'

export interface MapPopupAction {
  label: string
  onClick: () => void
}

export type MarkerKind =
  | 'user'
  | 'shelter'
  | 'saved'
  | 'medical'
  | 'hazard'
  | 'waypoint'
  | 'destination'
  | 'default'

export interface MapMarker {
  id: string
  position: GeoPoint
  title: string
  subtitle?: string
  color?: string
  isSos?: boolean
  isShelter?: boolean
  isSaved?: boolean
  isMedical?: boolean
  isHazard?: boolean
  isWaypoint?: boolean
  isDestination?: boolean
  markerKind?: MarkerKind
  badgeText?: string
  popupActions?: MapPopupAction[]
}

export interface MapPolygon {
  id: string
  points: GeoPoint[]
  color?: string
  fillColor?: string
  fillOpacity?: number
  weight?: number
  label?: string
}

export interface MapPolyline {
  id: string
  points: GeoPoint[]
  color?: string
  dashed?: boolean
  weight?: number
  opacity?: number
  label?: string
}

export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.0, 68.0],
  [37.5, 97.5],
]
export const INDIA_CENTER: GeoPoint = { lat: 22.0, lng: 79.0 }

/** Above this many markers, switch from DOM divIcons to canvas CircleMarkers */
export const CANVAS_MARKER_THRESHOLD = 80

export type MapLayerMode = 'streets' | 'satellite' | 'terrain' | 'dark' | 'traffic' | 'osm'

interface LayerDef {
  name: string
  url: string
  attribution: string
  subdomains: string | string[]
  maxZoom?: number
  retina?: boolean
  overlayUrl?: string
  overlayAttribution?: string
}

const MAP_LAYERS: Record<MapLayerMode, LayerDef> = {
  streets: {
    name: 'High-Definition Streets',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    retina: true,
  },
  satellite: {
    name: 'Satellite (Hybrid)',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    retina: true,
  },
  terrain: {
    name: 'Topographic Terrain',
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    retina: true,
  },
  dark: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '',
    subdomains: 'abcd',
    maxZoom: 20,
    retina: true,
  },
  traffic: {
    name: 'Traffic & Routes',
    url: 'https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
    attribution: '',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    retina: true,
  },
  osm: {
    name: 'Classic Roadmap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '',
    subdomains: 'abc',
    maxZoom: 19,
  },
}

// Stable icon instances: react-leaflet diffs the icon prop by reference, so a
// fresh L.divIcon per render destroys/re-adds every DOM marker. Cache instead.
const ICON_CACHE = new Map<string, L.DivIcon>()

function resolveMarkerKind(m: {
  isSos?: boolean
  isShelter?: boolean
  isSaved?: boolean
  isMedical?: boolean
  isHazard?: boolean
  isWaypoint?: boolean
  isDestination?: boolean
  markerKind?: MarkerKind
}): MarkerKind {
  if (m.markerKind) return m.markerKind
  if (m.isSaved) return 'saved'
  if (m.isHazard) return 'hazard'
  if (m.isWaypoint) return 'waypoint'
  if (m.isDestination) return 'destination'
  if (m.isMedical) return 'medical'
  if (m.isSos) return 'user'
  if (m.isShelter) return 'shelter'
  return 'default'
}

function iconCacheKey(kind: MarkerKind, color: string, selected: boolean, badgeText?: string) {
  return `${kind}|${color}|${selected ? 1 : 0}|${badgeText ?? ''}`
}

function markerIcon(
  color: string,
  markerMeta: {
    isSos?: boolean
    isShelter?: boolean
    isSaved?: boolean
    isMedical?: boolean
    isHazard?: boolean
    isWaypoint?: boolean
    isDestination?: boolean
    markerKind?: MarkerKind
    badgeText?: string
  },
  selected = false,
): L.DivIcon {
  const kind = resolveMarkerKind(markerMeta)
  const badgeText = markerMeta.badgeText
  const key = iconCacheKey(kind, color, selected, badgeText)
  const cached = ICON_CACHE.get(key)
  if (cached) return cached

  let icon: L.DivIcon

  if (kind === 'user') {
    // You Are Here / GPS Live Location: Pulsing high-contrast radar ring
    const size = selected ? 44 : 34
    const core = selected ? 22 : 18
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:#3b82f6;opacity:${selected ? '0.6' : '0.45'};animation:apd-ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
          ${
            selected
              ? `<div style="position:absolute;width:${core + 12}px;height:${core + 12}px;border-radius:50%;border:2px solid rgba(59,130,246,0.6);"></div>`
              : ''
          }
          <div style="position:relative;width:${core}px;height:${core}px;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;">
            <div style="width:${selected ? 8 : 6}px;height:${selected ? 8 : 6}px;border-radius:50%;background:white;"></div>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  } else if (kind === 'saved') {
    // Saved / Bookmarked Safe Shelter: Golden amber badge with Star SVG
    const size = selected ? 38 : 32
    const box = selected ? 32 : 26
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="position:absolute;width:${size}px;height:${size}px;border-radius:10px;background:#f59e0b;opacity:${selected ? '0.5' : '0.3'};"></div>
          <div style="position:relative;width:${box}px;height:${box}px;border-radius:8px;background:#d97706;border:2px solid #fff;box-shadow:${selected ? '0 0 0 3px rgba(245,158,11,0.6), ' : ''}0 3px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;color:white;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          ${badgeText ? `<div style="position:absolute;top:-6px;right:-6px;background:#1e293b;color:#f8fafc;font-size:9px;font-weight:800;padding:1px 4px;border-radius:999px;border:1px solid white;">${badgeText}</div>` : ''}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  } else if (kind === 'medical') {
    // Medical Relief Center: White box with bold Red Medical Cross
    const size = selected ? 36 : 30
    const box = selected ? 30 : 24
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="width:${box}px;height:${box}px;border-radius:8px;background:#ffffff;border:2.5px solid #dc2626;box-shadow:${selected ? '0 0 0 3px rgba(220,38,38,0.45), ' : ''}0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#dc2626;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 3h4v6h6v4h-6v6h-4v-6H4V9h6V3z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  } else if (kind === 'hazard') {
    // Hazard / Danger Point on Route: Crimson Alert Triangle
    const size = selected ? 36 : 28
    const box = selected ? 30 : 24
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:#ef4444;opacity:0.35;animation:apd-ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="width:${box}px;height:${box}px;border-radius:8px;background:#dc2626;border:2px solid white;box-shadow:${selected ? '0 0 0 3px rgba(220,38,38,0.5), ' : ''}0 3px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  } else if (kind === 'waypoint') {
    // Safe Route Waypoint Checkpoint: Emerald Shield / Checkpoint
    const size = selected ? 32 : 26
    const box = selected ? 26 : 20
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="width:${box}px;height:${box}px;border-radius:6px;background:#059669;border:2px solid white;box-shadow:${selected ? '0 0 0 3px rgba(16,185,129,0.5), ' : ''}0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          ${badgeText ? `<div style="position:absolute;bottom:-6px;background:#047857;color:#fff;font-size:8px;font-weight:bold;padding:0 3px;border-radius:4px;border:1px solid white;">${badgeText}</div>` : ''}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  } else if (kind === 'destination') {
    // Destination Beacon: Safe Haven Destination Flag
    const size = selected ? 38 : 32
    const box = selected ? 32 : 26
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:#10b981;opacity:0.35;"></div>
          <div style="width:${box}px;height:${box}px;border-radius:8px;background:#047857;border:2px solid white;box-shadow:${selected ? '0 0 0 3px rgba(16,185,129,0.55), ' : ''}0 3px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;color:white;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  } else if (kind === 'shelter') {
    // Standard Safe Shelter: Rounded square with House SVG
    const size = selected ? 36 : 28
    const box = selected ? 30 : 24
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="width:${box}px;height:${box}px;border-radius:8px;background:${color || '#10b981'};border:2px solid white;box-shadow:${selected ? '0 0 0 3px rgba(59,130,246,0.45), ' : ''}0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  } else {
    // Generic pinpoint
    const size = selected ? 30 : 22
    const dotSize = selected ? 22 : 16
    icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
          <div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color || '#3b82f6'};border:2.5px solid white;box-shadow:${selected ? '0 0 0 3px rgba(59,130,246,0.45), ' : ''}0 2px 6px rgba(0,0,0,0.5);"></div>
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
    <div className="min-w-[190px] p-1">
      <div className="text-sm font-bold text-slate-900 leading-tight">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-slate-600 leading-snug">{subtitle}</div>}
      {actions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                action.onClick()
              }}
              className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-slate-700 cursor-pointer shadow-xs"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MapController({
  center,
  zoom,
  markers = [],
  polygons = [],
  polylines = [],
  autoFit = false,
  selectedId = null,
  fitTrigger = 0,
}: {
  center: GeoPoint
  zoom?: number
  markers?: MapMarker[]
  polygons?: MapPolygon[]
  polylines?: MapPolyline[]
  autoFit?: boolean
  selectedId?: string | null
  fitTrigger?: number
}) {
  const map = useMap()
  const hasInitialFitRef = useRef(false)
  const userInteractedRef = useRef(false)
  const isProgrammaticMoveRef = useRef(false)
  const lastSelectedIdRef = useRef<string | null>(null)
  const lastCenterKeyRef = useRef(`${center?.lat?.toFixed(4) ?? '0'},${center?.lng?.toFixed(4) ?? '0'}`)
  const lastFitTriggerRef = useRef(fitTrigger)

  // Track user interaction (pan / zoom gestures) so background polling NEVER overrides user view
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUserInteraction = (e: any) => {
      if (e?.originalEvent && !isProgrammaticMoveRef.current) {
        userInteractedRef.current = true
      }
    }

    map.on('dragstart', handleUserInteraction)
    map.on('zoomstart', handleUserInteraction)
    map.on('movestart', handleUserInteraction)

    return () => {
      map.off('dragstart', handleUserInteraction)
      map.off('zoomstart', handleUserInteraction)
      map.off('movestart', handleUserInteraction)
    }
  }, [map])

  // Invalidate size once after mounting
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize()
      } catch {
        // Map unmounted
      }
    }, 120)
    return () => clearTimeout(t)
  }, [map])

  // Collect all active points
  const points: GeoPoint[] = useMemo(() => {
    const safeMarkers = markers ?? []
    const safePolygons = polygons ?? []
    const safePolylines = polylines ?? []

    return [
      ...safeMarkers
        .map((m) => m?.position)
        .filter((p): p is GeoPoint => Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number')),
      ...safePolygons
        .flatMap((p) => p?.points ?? [])
        .filter((p): p is GeoPoint => Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number')),
      ...safePolylines
        .flatMap((p) => p?.points ?? [])
        .filter((p): p is GeoPoint => Boolean(p && typeof p.lat === 'number' && typeof p.lng === 'number')),
    ]
  }, [markers, polygons, polylines])

  // 1. Initial Fit Bounds OR User-Triggered Fit Bounds
  useEffect(() => {
    const isManualTrigger = fitTrigger !== lastFitTriggerRef.current
    if (isManualTrigger) {
      lastFitTriggerRef.current = fitTrigger
      userInteractedRef.current = false
    }

    const shouldInitialFit = !hasInitialFitRef.current && autoFit && points.length > 1
    const shouldManualFit = isManualTrigger && points.length > 1

    if (shouldInitialFit || shouldManualFit) {
      try {
        isProgrammaticMoveRef.current = true
        map.fitBounds(
          points.map((pt) => [pt.lat, pt.lng] as [number, number]),
          { padding: [40, 40], maxZoom: 15, animate: hasInitialFitRef.current },
        )
        hasInitialFitRef.current = true
        setTimeout(() => {
          isProgrammaticMoveRef.current = false
        }, 400)
      } catch {
        // fitBounds error
      }
    }
  }, [map, points, fitTrigger, autoFit])

  // 2. Focused marker / selectedId change: Center on selected marker without resetting user zoom
  useEffect(() => {
    if (selectedId && selectedId !== lastSelectedIdRef.current) {
      lastSelectedIdRef.current = selectedId
      const targetMarker = (markers ?? []).find((m) => m.id === selectedId)
      if (targetMarker?.position) {
        try {
          isProgrammaticMoveRef.current = true
          const currentZoom = map.getZoom()
          const targetZoom = Math.max(currentZoom, 14)
          map.setView([targetMarker.position.lat, targetMarker.position.lng], targetZoom, { animate: true })
          setTimeout(() => {
            isProgrammaticMoveRef.current = false
          }, 400)
        } catch {
          // setView failed
        }
      }
    }
  }, [map, selectedId, markers])

  // 3. Center prop change (e.g. user clicked locate or explicit recenter)
  useEffect(() => {
    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') return
    const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`

    // Only update if center genuinely changed and user hasn't actively zoomed/panned elsewhere,
    // OR if user explicitly changed center
    if (key !== lastCenterKeyRef.current) {
      lastCenterKeyRef.current = key
      if (!userInteractedRef.current || selectedId) {
        try {
          isProgrammaticMoveRef.current = true
          map.setView([center.lat, center.lng], zoom ?? map.getZoom(), { animate: true })
          setTimeout(() => {
            isProgrammaticMoveRef.current = false
          }, 400)
        } catch {
          // setView failed
        }
      }
    }
  }, [map, center, zoom, selectedId])

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
  showControls = true,
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
  showControls?: boolean
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
  const [fitTrigger, setFitTrigger] = useState(0)

  const selectLayer = (mode: MapLayerMode) => {
    setLayerMode(mode)
    setShowLayerMenu(false)
    try {
      localStorage.setItem('aapdasetu_map_layer', mode)
    } catch {
      // Storage unavailable
    }
  }

  const handleFitBounds = useCallback(() => {
    setFitTrigger((c) => c + 1)
  }, [])

  const currentLayer = MAP_LAYERS[layerMode]

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
                icon={markerIcon(m.color ?? '#3b82f6', m, isSelected)}
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
                radius={isSelected ? 10 : 7}
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
      {/* Floating Tactical Map Controls */}
      {showControls && (
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5">
          {/* Fit all bounds / Reset View */}
          <button
            type="button"
            onClick={handleFitBounds}
            className="flex items-center gap-1 rounded-xl border border-slate-300/80 bg-white/95 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md transition hover:bg-white dark:border-white/[0.1] dark:bg-slate-900/95 dark:text-slate-100 cursor-pointer"
            title="Fit all markers in view"
            aria-label="Fit all markers in view"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit All</span>
          </button>

          {/* Layer Selector */}
          <div className="relative flex flex-col items-end">
            <button
              type="button"
              onClick={() => setShowLayerMenu((o) => !o)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md transition hover:bg-white dark:border-white/[0.1] dark:bg-slate-900/95 dark:text-slate-100 cursor-pointer"
              title="Change Map View"
            >
              <Layers className="h-3.5 w-3.5 text-slate-900 dark:text-slate-100" />
              <span>{currentLayer.name}</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-9 mt-1 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-white/[0.1] dark:bg-slate-900/95 min-w-[185px] z-50">
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
                  <span>High-Definition Streets</span>
                </button>

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

                <button
                  type="button"
                  onClick={() => selectLayer('traffic')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition cursor-pointer ${
                    layerMode === 'traffic'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Traffic & Routes</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={4}
        maxZoom={20}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={0.7}
        worldCopyJump={false}
        preferCanvas
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <ScaleControl position="bottomleft" imperial={false} />
        <ZoomControl position="bottomright" />

        {/* Base Layer */}
        <TileLayer
          key={layerMode}
          attribution=""
          url={currentLayer.url}
          subdomains={currentLayer.subdomains || 'abc'}
          maxZoom={currentLayer.maxZoom ?? 20}
          keepBuffer={6}
          updateWhenIdle={false}
          updateWhenZooming={false}
          detectRetina={currentLayer.retina === true}
        />

        {/* Optional Satellite Labels/Boundaries Overlay */}
        {currentLayer.overlayUrl && (
          <TileLayer
            key={`${layerMode}-overlay`}
            attribution=""
            url={currentLayer.overlayUrl}
            subdomains="abc"
            maxZoom={currentLayer.maxZoom ?? 20}
            keepBuffer={6}
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
          selectedId={selectedId}
          fitTrigger={fitTrigger}
        />

        {/* Hazard Polygons */}
        {(polygons ?? [])
          .filter((p) => p && Array.isArray(p.points) && p.points.length >= 3)
          .map((p) => (
            <Polygon
              key={p.id}
              pathOptions={{
                color: p.color ?? '#dc2626',
                fillColor: p.fillColor ?? p.color ?? '#dc2626',
                fillOpacity: p.fillOpacity ?? 0.38,
                weight: p.weight ?? 2,
              }}
              positions={p.points.map((pt) => [pt.lat, pt.lng] as [number, number])}
            >
              {p.label && (
                <Popup>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 p-1">{p.label}</div>
                </Popup>
              )}
            </Polygon>
          ))}

        {/* Road-following Routes (OSRM / Detour paths) */}
        {(polylines ?? [])
          .filter((p) => p && Array.isArray(p.points) && p.points.length >= 2)
          .map((p) => (
            <Polyline
              key={p.id}
              pathOptions={{
                color: p.color ?? '#3b82f6',
                weight: p.weight ?? (p.dashed ? 4 : 5),
                opacity: p.opacity ?? 0.92,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: p.dashed ? '8 8' : undefined,
              }}
              positions={p.points.map((pt) => [pt.lat, pt.lng] as [number, number])}
            >
              {p.label && (
                <Popup>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 p-1.5 max-w-[220px]">{p.label}</div>
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
