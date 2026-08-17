import { useEffect, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Search, MapPin } from 'lucide-react'
import type { GeoPoint } from '../../types'

const DEFAULT_CENTER: GeoPoint = { lat: 22.5726, lng: 88.3639 }

interface SearchResult {
  name: string
  lat: number
  lng: number
}

function pickIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
        <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:#3b82f6;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

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
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<{ target: GeoPoint; zoom: number } | null>(null)
  const center = value ?? view?.target ?? DEFAULT_CENTER

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setError('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`,
      )
      if (!res.ok) throw new Error('bad status')
      const data: { display_name: string; lat: string; lon: string }[] = await res.json()
      setResults(
        data.map((d) => ({
          name: d.display_name,
          lat: Number(d.lat),
          lng: Number(d.lon),
        })),
      )
      if (data.length === 0) setError('No places found — try a more specific landmark name')
    } catch {
      setError('Search unavailable — check network connection')
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  const selectResult = (r: SearchResult) => {
    onChange({ lat: r.lat, lng: r.lng }, r.name)
    setQuery(r.name)
    setResults(null)
    setView({ target: { lat: r.lat, lng: r.lng }, zoom: 16 })
  }

  return (
    <div className="relative">
      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search place name (e.g. Salt Lake Stadium, New Town)"
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={searching || !query.trim()}
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
        >
          {searching ? 'Searching…' : 'Locate'}
        </button>
      </div>

      {error && <p className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}

      {results && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-12 z-[1000] max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectResult(r)}
                className="flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                <span className="truncate">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-inner dark:border-slate-800">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={value ? 16 : view ? view.zoom : 13}
          style={{ height, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapInteractions onPick={onChange} />
          {view && <Recenter target={view.target} zoom={view.zoom} />}
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pickIcon()}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng() as L.LatLng
                  onChange({ lat: ll.lat, lng: ll.lng })
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        * Click anywhere on the map or drag the blue pin to set exact coordinates.
      </p>
    </div>
  )
}
