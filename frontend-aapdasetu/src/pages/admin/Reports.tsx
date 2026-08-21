import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react'
import { listAgencies, listReports, listVolunteers, updateReport, resetMockDatabase } from '../../api/endpoints'
import { Field, Input, Select } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../components/common/Toast'
import { formatDateTime, haversineKm } from '../../lib/helpers'
import type { Agency, Report, Volunteer } from '../../types'

interface DispatchDraft {
  volunteerId: string
  agencyId: string
  status: Report['status']
  notes: string
}

export default function Reports() {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Report | null>(null)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [draft, setDraft] = useState<DispatchDraft>({
    volunteerId: '',
    agencyId: '',
    status: 'in_progress',
    notes: '',
  })

  // Hook into real-time updates for reports
  const fetchReports = useCallback(() => {
    return listReports({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      type: typeFilter || undefined,
      q: query || undefined,
    })
  }, [statusFilter, priorityFilter, typeFilter, query])

  const reports = useRealtime<Report[]>(fetchReports, 4000)

  useEffect(() => {
    listVolunteers('available').then(setVolunteers)
    listAgencies().then(setAgencies)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, priorityFilter, typeFilter, query])

  useEffect(() => {
    if (selected) {
      setDraft({
        volunteerId: selected.assignedVolunteerId || '',
        agencyId: selected.assignedAgencyId || '',
        status: selected.status,
        notes: selected.resolutionNotes || '',
      })
    }
  }, [selected])

  // Ranked volunteers by proximity and skill matching
  const rankedVolunteers = useMemo(() => {
    if (!selected) return volunteers
    return [...volunteers].sort((a, b) => {
      const aSkills = Array.isArray(a.skills) ? a.skills : []
      const bSkills = Array.isArray(b.skills) ? b.skills : []
      const aSkill = aSkills.includes(selected.type) ? 1 : 0
      const bSkill = bSkills.includes(selected.type) ? 1 : 0
      if (aSkill !== bSkill) return bSkill - aSkill

      if (selected.latitude && selected.longitude && a.latitude && a.longitude && b.latitude && b.longitude) {
        const distA = haversineKm({ lat: selected.latitude, lng: selected.longitude }, { lat: a.latitude, lng: a.longitude })
        const distB = haversineKm({ lat: selected.latitude, lng: selected.longitude }, { lat: b.latitude, lng: b.longitude })
        return distA - distB
      }
      return 0
    })
  }, [volunteers, selected])

  const executeDispatch = async (overrideStatus?: Report['status']) => {
    if (!selected) return
    setSaving(true)
    try {
      await updateReport(selected.id, {
        assignedVolunteerId: draft.volunteerId || undefined,
        assignedAgencyId: draft.agencyId || undefined,
        status: overrideStatus || draft.status,
        resolutionNotes: draft.notes || undefined,
      })
      toast('Incident dispatch successfully updated in real time', 'success')
      setSelected(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Dispatch failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Pagination slice (clamped so realtime list shrinkage can't yield an empty page)
  const totalCount = reports?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  if (safePage !== page) setPage(safePage)
  const paginatedReports = useMemo(() => {
    if (!reports) return []
    const start = (safePage - 1) * pageSize
    return reports.slice(start, start + pageSize)
  }, [reports, safePage, pageSize])

  if (!reports) return <Loader />

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Incident Reports & Dispatch Command
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mono">
              {totalCount.toLocaleString()} Total Records
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time live incident stream across all disaster zones. AI triage scoring, proximity volunteer assignment, and multi-agency dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Reset database to 1,000+ realistic disaster records?')) {
                await resetMockDatabase()
                toast('Database reset with 1,000+ fresh records!', 'success')
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset 1000+ Records</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <Field label="Emergency Type">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Emergency Types</option>
            <option value="flood">Flood / Submersion</option>
            <option value="medical">Critical Medical</option>
            <option value="fire">Fire / Explosion</option>
            <option value="earthquake">Building Collapse / Trapped</option>
            <option value="accident">Transit / Rescue Accident</option>
            <option value="missing_person">Missing Person</option>
            <option value="other">Other Hazards</option>
          </Select>
        </Field>

        <Field label="Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending (Unassigned)</option>
            <option value="in_progress">In Progress (Dispatched)</option>
            <option value="resolved">Resolved (Evacuated)</option>
          </Select>
        </Field>

        <Field label="Priority Tier">
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="RED">RED (Critical Urgency 80-100)</option>
            <option value="YELLOW">YELLOW (High Priority 50-79)</option>
            <option value="GREEN">GREEN (Standard Priority 0-49)</option>
          </Select>
        </Field>

        <Field label="Search Query">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tracking ID, name, phone, landmark…"
              className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-white/[0.1] dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </Field>
      </div>

      {/* Incident Reports Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 mono font-bold">
            <tr>
              <th className="px-4 py-3">Tracking ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Priority Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Location / Landmark</th>
              <th className="px-4 py-3">Reporter</th>
              <th className="px-4 py-3">Assigned Units</th>
              <th className="px-4 py-3">Reported</th>
              <th className="px-4 py-3 text-right">Dispatch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedReports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-1.5">
                    {r.source === 'sos' && <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />}
                    <span>{r.trackingId}</span>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize font-bold text-xs text-slate-800 dark:text-slate-200">
                  {r.type.replace('_', ' ')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge label={r.priorityLabel} />
                    <span className="mono text-xs font-bold text-slate-600 dark:text-slate-400">
                      {r.priorityScore}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge value={r.status} /></td>
                <td className="px-4 py-3 text-xs max-w-[200px] truncate text-slate-700 dark:text-slate-300">
                  {r.landmark ?? (r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude?.toFixed(4)}` : 'GPS Record')}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{r.reporterName || 'Citizen'}</div>
                  <div className="mono text-[11px] text-slate-400">{r.reporterPhone || '—'}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[160px] truncate">
                  {r.assignedVolunteerName ? (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.assignedVolunteerName}</span>
                  ) : r.assignedAgencyName ? (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.assignedAgencyName}</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[11px] text-slate-400 mono whitespace-nowrap">
                  {formatDateTime(r.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <span>Dispatch</span>
                    <span>→</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalCount === 0 && (
          <div className="p-12 text-center text-sm text-slate-400">
            No incident reports matched your specified filter criteria.
          </div>
        )}

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <div>
              Showing <strong className="mono">{(page - 1) * pageSize + 1}</strong> to{' '}
              <strong className="mono">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
              <strong className="mono">{totalCount.toLocaleString()}</strong> incidents
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-2 font-bold mono">
                Page {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-300"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dispatch Modal */}
      {selected && (
        <Modal open title="Operational Incident Dispatch & Assignment" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">{selected.trackingId}</span>
                <PriorityBadge label={selected.priorityLabel} />
              </div>
              <p className="mt-2 text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{selected.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-slate-500 border-t border-slate-200/60 pt-2 dark:border-slate-800">
                {selected.landmark && <div>Landmark: <strong className="text-slate-700 dark:text-slate-300">{selected.landmark}</strong></div>}
                {selected.reporterPhone && <div>Phone: <strong className="text-slate-700 dark:text-slate-300 mono">{selected.reporterPhone}</strong></div>}
                <div>Type: <strong className="capitalize text-slate-700 dark:text-slate-300">{selected.type}</strong></div>
              </div>
            </div>

            <Field label="Assign Recommended Field Volunteer (Ranked by Proximity & Skill)">
              <Select
                value={draft.volunteerId}
                onChange={(e) => setDraft((d) => ({ ...d, volunteerId: e.target.value }))}
              >
                <option value="">-- Select Volunteer --</option>
                {rankedVolunteers.map((v) => {
                  const dist = (selected.latitude && selected.longitude && v.latitude && v.longitude)
                    ? haversineKm({ lat: selected.latitude, lng: selected.longitude }, { lat: v.latitude, lng: v.longitude })
                    : null
                  return (
                    <option key={v.id} value={v.id}>
                      {v.name} {dist !== null ? `(${dist.toFixed(1)} km away)` : ''} — Skills: {v.skills.join(', ') || 'General'}
                    </option>
                  )
                })}
              </Select>
            </Field>

            <Field label="Assign Disaster Agency Unit">
              <Select
                value={draft.agencyId}
                onChange={(e) => setDraft((d) => ({ ...d, agencyId: e.target.value }))}
              >
                <option value="">-- Select Agency --</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type.toUpperCase()})</option>
                ))}
              </Select>
            </Field>

            <Field label="Update Operational Status">
              <Select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Report['status'] }))}
              >
                <option value="pending">Pending (Unassigned)</option>
                <option value="in_progress">In Progress (Dispatched / En Route)</option>
                <option value="resolved">Resolved (Evacuated / Safe)</option>
              </Select>
            </Field>

            <Field label="Resolution / Field Instructions">
              <Input
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Enter dispatch notes, rescue directives, or hospital transfer details…"
              />
            </Field>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => executeDispatch()}
                disabled={saving}
                className="font-bold"
              >
                {saving ? 'Saving Dispatch…' : 'Save & Execute Dispatch'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
