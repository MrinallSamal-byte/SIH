import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ScaleControl } from 'react-leaflet'
import { Search, MapPin, Crosshair, Sparkles } from 'lucide-react'
import { searchPlaces, reverseGeocode, getHighPrecisionPosition, type PlaceSearchResult } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
import type { GeoPoint } from '../../types'

const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.0, 68.0],
  [37.5, 97.5],
]
const DEFAULT_CENTER: GeoPoint = { lat: 22.5726, lng: 88.3639 }

// Stable instance — react-leaflet diffs the icon prop by reference, so a fresh
// L.divIcon per render would re-add the draggable marker on every render.
const PIN_ICON = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;">
      <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:#3b82f6;opacity:0.35;"></div>
      <div style="width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.6)"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function MapInteractions({ onPick }: { onPick: (p: GeoPoint) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function Recenter({ target, zoom }: { target: GeoPoint; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([target.lat, target.lng], zoom)
  }, [map, target, zoom])
  return null
}

export default function LandmarkPicker({
  value,
  onChange,
  height = '320px',
}: {
  value: GeoPoint | null
  onChange: (p: GeoPoint, address?: string) => void
  height?: string
}) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceSearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [locatingGps, setLocatingGps] = useState(false)
  const [noMatchFallback, setNoMatchFallback] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [view, setView] = useState<{ target: GeoPoint; zoom: number } | null>(null)
  const center = value ?? view?.target ?? DEFAULT_CENTER
  const rootRef = useRef<HTMLDivElement>(null)
  // ponytail: monotonic search id — stale geocode responses are discarded instead of overwriting newer ones
  const searchIdRef = useRef(0)
  const pickSeqRef = useRef(0)
  // Last point this picker itself emitted; lets us detect externally-driven
  // value changes and recenter the map for them.
  const lastEmittedRef = useRef<string | null>(null)

  const pointKey = (p: GeoPoint) => `${p.lat},${p.lng}`

  const emitChange = (p: GeoPoint, address?: string) => {
    lastEmittedRef.current = pointKey(p)
    onChange(p, address)
  }

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    const reqId = ++searchIdRef.current
    setSearching(true)
    setStatusMessage('')
    setNoMatchFallback(null)
    try {
      const places = await searchPlaces(q, {
        proximity: center,
        limit: 5,
      })
      if (reqId !== searchIdRef.current) return // superseded by a newer search
      if (places.length > 0) {
        setResults(places)
      } else {
        setResults([])
        setNoMatchFallback(q)
      }
    } catch {
      if (reqId !== searchIdRef.current) return
      setStatusMessage(t('lp.geocodeUnavailable'))
      setResults(null)
      setNoMatchFallback(q)
    } finally {
      if (reqId === searchIdRef.current) setSearching(false)
    }
  }

  // Recenter when the parent changes `value` from outside (presets, GPS sync);
  // our own picks are already centered and must not double-fire a jump.
  const valueKey = value ? pointKey(value) : null
  useEffect(() => {
    if (!value || !valueKey || lastEmittedRef.current === valueKey) return
    setView({ target: value, zoom: 16 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey])

  // Dismiss the results dropdown on outside pointerdown or Escape.
  useEffect(() => {
    if (!results || results.length === 0) return
    const root = rootRef.current
    const handlePointerDown = (e: PointerEvent) => {
      if (root && e.target instanceof Node && !root.contains(e.target)) {
        setResults(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setResults(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [results])

  const selectResult = (r: PlaceSearchResult) => {
    emitChange({ lat: r.lat, lng: r.lng }, r.name)
    setQuery(r.name)
    setResults(null)
    setNoMatchFallback(null)
    setView({ target: { lat: r.lat, lng: r.lng }, zoom: 16 })
  }

  const handleUseTypedAddress = (customAddr: string) => {
    emitChange(center, customAddr)
    setNoMatchFallback(null)
    setResults(null)
    setStatusMessage(`${t('lp.mapCenterSet')} "${customAddr}"`)
  }

  const handleLocateHighAccuracy = async () => {
    setLocatingGps(true)
    setStatusMessage(t('lp.acquiringGps'))
    try {
      const pos = await getHighPrecisionPosition()
      const p: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      const revAddr = await reverseGeocode(p)
      emitChange(p, revAddr || undefined)
      if (revAddr) setQuery(revAddr)
      setView({ target: p, zoom: 17 })
      setStatusMessage(`${t('lp.gpsLocked')} (±${Math.round(pos.coords.accuracy ?? 5)}m)`)
    } catch {
      setStatusMessage(t('lp.gpsFail'))
    } finally {
      setLocatingGps(false)
    }
  }

  const handleMapPick = async (p: GeoPoint) => {
    const seq = ++pickSeqRef.current
    emitChange(p)
    try {
      const addr = await reverseGeocode(p)
      if (seq !== pickSeqRef.current) return
      emitChange(p, addr || undefined)
      if (addr) setQuery(addr)
    } catch {
      if (seq === pickSeqRef.current) emitChange(p)
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (noMatchFallback) setNoMatchFallback(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder={t('lp.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-white/[0.1] dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={searching || !query.trim()}
          className="shrink-0 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
        >
          {searching ? t('common.searching') : t('lp.locate')}
        </button>
        <button
          type="button"
          onClick={handleLocateHighAccuracy}
          disabled={locatingGps}
          title={t('lp.gpsTitle')}
          className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/80 cursor-pointer"
        >
          <Crosshair className={`h-3.5 w-3.5 ${locatingGps ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{locatingGps ? t('lp.lockingGps') : t('lp.liveGps')}</span>
        </button>
      </div>

      {statusMessage && (
        <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">{statusMessage}</p>
      )}

      {/* Geocoding Results Dropdown */}
      {results && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-12 z-[1000] max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/[0.1] dark:bg-slate-900">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectResult(r)}
                className="flex items-center justify-between gap-2 w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                  <span className="truncate">{r.name}</span>
                </div>
                {r.isRelaxed && (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                    <Sparkles className="h-2.5 w-2.5" />
                    {t('lp.areaMatch')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Fallback for unindexed detailed custom locations */}
      {noMatchFallback && (
        <div className="mb-2.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300">
          <p className="font-semibold mb-1">
            {t('lp.notIndexed')}
          </p>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => handleUseTypedAddress(noMatchFallback)}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-800 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-amber-900 dark:bg-amber-200 dark:text-amber-900 dark:hover:bg-white cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>{t('lp.useAddress')} &ldquo;{noMatchFallback.slice(0, 32)}&hellip;&rdquo;</span>
            </button>
            <span className="text-[11px] opacity-80">{t('lp.dragHint')}</span>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-inner dark:border-slate-800">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={view?.zoom ?? (value ? 16 : 13)}
          minZoom={5}
          maxZoom={18}
          maxBounds={INDIA_BOUNDS}
          maxBoundsViscosity={1.0}
          worldCopyJump={false}
          style={{ height, width: '100%' }}
        >
          <ScaleControl position="bottomleft" imperial={false} />
          <TileLayer
            attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors &copy; <a href=&quot;https://carto.com/attributions&quot;>CARTO</a>"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            detectRetina
            keepBuffer={4}
            updateWhenIdle={false}
            updateWhenZooming={false}
          />
          <MapInteractions onPick={handleMapPick} />
          {view && <Recenter target={view.target} zoom={view.zoom} />}
          {value && typeof value.lat === 'number' && typeof value.lng === 'number' && (
            <Marker
              position={[value.lat, value.lng]}
              icon={PIN_ICON}
              draggable
              eventHandlers={{
                dragend: async (e) => {
                  const ll = e.target.getLatLng() as L.LatLng
                  const p = { lat: ll.lat, lng: ll.lng }
                  const seq = ++pickSeqRef.current
                  emitChange(p)
                  try {
                    const addr = await reverseGeocode(p)
                    if (seq !== pickSeqRef.current) return
                    emitChange(p, addr || undefined)
                    if (addr) setQuery(addr)
                  } catch {
                    if (seq === pickSeqRef.current) emitChange(p)
                  }
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>{t('lp.footerHint')}</span>
        {value && (
          <span className="font-mono text-[10px]">
            {value.lat.toFixed(4)}°N, {value.lng.toFixed(4)}°E
          </span>
        )}
      </div>
    </div>
  )
}

