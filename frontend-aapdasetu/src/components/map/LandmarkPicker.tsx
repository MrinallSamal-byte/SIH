import { useEffect, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { config } from '../../config'
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
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
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
  height = '300px',
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
      if (data.length === 0) setError('No places found — try a more specific name')
    } catch {
      setError('Search unavailable — check your connection')
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  const selectResult = (r: SearchResult) => {
    onChange({ lat: r.lat, lng: r.lng }, r.name)
    setQuery(r.name)
    setResults(null)
    setView({ target: { lat: r.lat, lng: r.lng }, zoom: 15 })
  }

  return (
    <div className="relative">
      <div className="mb-2 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="Search for a place, e.g. Salt Lake Stadium"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={searching || !query.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? '…' : 'Search'}
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {results && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-12 z-[1000] max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectResult(r)}
                className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-blue-50 hover:text-blue-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={value ? 15 : view ? view.zoom : 12}
        style={{ height, width: '100%', borderRadius: '0.75rem' }}
      >
        <TileLayer attribution={config.mapAttribution} url={config.mapTileUrl} />
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
  )
}
