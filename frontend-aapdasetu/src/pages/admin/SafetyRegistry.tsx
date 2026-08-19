import { useCallback, useMemo, useState } from 'react'
import {
  ShieldCheck,
  Search,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  UserCheck
} from 'lucide-react'
import { listSafetyCheckins } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import LeafletMap, { type MapMarker } from '../../components/map/LeafletMap'
import { useRealtime } from '../../hooks/useRealtime'
import { formatDateTime, maskPhone } from '../../lib/helpers'
import type { GeoPoint, SafetyCheckin } from '../../types'

export default function SafetyRegistry() {
  const fetchCheckins = useCallback(() => listSafetyCheckins(), [])
  const checkins = useRealtime<SafetyCheckin[]>(fetchCheckins, 5000)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'safe' | 'need_assistance'>('all')
  const [selectedCheckin, setSelectedCheckin] = useState<SafetyCheckin | null>(null)

  const filtered = useMemo(() => {
    if (!checkins) return []
    return checkins.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        return (
          (c.fullName && c.fullName.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.locationName && c.locationName.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [checkins, statusFilter, search])

  const totalCount = checkins?.length ?? 0
  const safeCount = checkins?.filter((c) => c.status === 'safe').length ?? 0
  const needHelpCount = checkins?.filter((c) => c.status === 'need_assistance').length ?? 0

  const markers = useMemo<MapMarker[]>(() => {
    return filtered
      .filter((c) => c.latitude && c.longitude)
      .map((c) => ({
        id: c.id,
        position: { lat: c.latitude!, lng: c.longitude! },
        title: `${c.fullName || 'Citizen'} (${c.status === 'safe' ? 'SAFE' : 'NEEDS ASSISTANCE'})`,
        subtitle: `${c.locationName || 'GPS Location'} · ${c.notes || ''}`,
        color: c.status === 'safe' ? '#10b981' : '#dc2626',
        isSos: c.status === 'need_assistance',
      }))
  }, [filtered])

  const mapCenter: GeoPoint = useMemo(() => {
    if (markers.length > 0) return markers[0].position
    return { lat: 22.5726, lng: 88.3639 }
  }, [markers])

  if (!checkins) return <Loader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Citizen Safety Registry & Check-ins
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time stream of citizen self-checkins, distress flags, and family welfare verifications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mono">
            {totalCount} Total Submissions
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">Total Check-Ins</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalCount}</div>
          <div className="text-[11px] text-slate-400">Registered citizens</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mono flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Marked Safe</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{safeCount}</div>
          <div className="text-[11px] text-slate-400">
            {totalCount > 0 ? Math.round((safeCount / totalCount) * 100) : 0}% of all records
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mono flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Needs Assistance</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-red-600 dark:text-red-400">{needHelpCount}</div>
          <div className="text-[11px] text-slate-400">Urgent rescue/relief queue</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">GPS Mapped</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {markers.length}
          </div>
          <div className="text-[11px] text-slate-400">Geotagged coordinates</div>
        </div>
      </div>

      {/* Map View of Check-ins */}
      {markers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
            <span>Safety Checkin Geolocation Map ({markers.length} Mapped Pins)</span>
            <span className="text-[11px] text-slate-400">Green = Safe · Red = Needs Assistance</span>
          </div>
          <div className="h-64 rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800">
            <LeafletMap center={mapCenter} markers={markers} height="100%" autoFit />
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search check-ins by citizen name, phone, locality, or notes…"
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-white/[0.1] dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'safe', 'need_assistance'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {st === 'need_assistance' ? 'Needs Assistance' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Check-ins Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-slate-50 dark:bg-slate-800 text-[10px] uppercase text-slate-500 dark:text-slate-400 mono font-bold">
            <tr>
              <th className="px-4 py-3">Citizen Name</th>
              <th className="px-4 py-3">Contact Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Location / Locality</th>
              <th className="px-4 py-3">Check-In Notes</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                  {c.fullName || 'Anonymous Citizen'}
                </td>
                <td className="px-4 py-3 mono text-slate-600 dark:text-slate-400">
                  {c.phone ? maskPhone(c.phone) : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge value={c.status} />
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>{c.locationName || (c.latitude ? `${c.latitude.toFixed(4)}, ${c.longitude?.toFixed(4)}` : 'GPS Verified')}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                  {c.notes || '—'}
                </td>
                <td className="px-4 py-3 mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDateTime(c.createdAt)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {c.phone ? (
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Phone className="h-3 w-3" />
                      <span>Contact</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => setSelectedCheckin(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      Inspect
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-400">
            No safety check-in records matched your search.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCheckin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedCheckin(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Safety Record Details
            </h3>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Citizen:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedCheckin.fullName || 'Anonymous'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Contact Phone:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{selectedCheckin.phone || 'None'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Status:</span>
                <Badge value={selectedCheckin.status} />
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Reported Locality:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedCheckin.locationName || 'N/A'}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500">Notes:</span>
                <p className="mt-1 text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 p-2.5 rounded-xl dark:bg-slate-800">
                  {selectedCheckin.notes || 'No additional details submitted.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCheckin(null)}
              className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
