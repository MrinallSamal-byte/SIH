import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAgencies, listReports, listVolunteers, updateReport } from '../../api/endpoints'
import { Field, Input, Select } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
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
  const [reports, setReports] = useState<Report[] | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Report | null>(null)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [saving, setSaving] = useState(false)

  const [draft, setDraft] = useState<DispatchDraft>({
    volunteerId: '',
    agencyId: '',
    status: 'in_progress',
    notes: '',
  })

  const load = useCallback(async () => {
    setReports(
      await listReports({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        q: query || undefined,
      }),
    )
  }, [statusFilter, priorityFilter, query])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    listVolunteers('available').then(setVolunteers)
    listAgencies().then(setAgencies)
  }, [])

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
      // 1. Skill match preference
      const aSkill = (a.skills as string[]).includes(selected.type) ? 1 : 0
      const bSkill = (b.skills as string[]).includes(selected.type) ? 1 : 0
      if (aSkill !== bSkill) return bSkill - aSkill

      // 2. Distance sorting if coordinates exist
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
      toast('Incident dispatch successfully updated', 'success')
      setSelected(null)
      load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Dispatch failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!reports) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Incident Reports & Dispatch Control</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Search, filter, triage, and dispatch responders to distress signals.</p>

      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <Field label="Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending (Unassigned)</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="RED">RED (Critical Urgency)</option>
            <option value="YELLOW">YELLOW (High Priority)</option>
            <option value="GREEN">GREEN (Normal Priority)</option>
          </Select>
        </Field>
        <Field label="Search">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tracking ID, phone, landmark…" />
        </Field>
        <div className="flex items-end">
          <Button onClick={load} variant="secondary" className="w-full font-bold">
            Filter Incidents
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Tracking ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Location / Landmark</th>
              <th className="px-4 py-3">Assigned Units</th>
              <th className="px-4 py-3">Reported</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{r.trackingId}</td>
                <td className="px-4 py-3 capitalize font-medium">{r.type}</td>
                <td className="px-4 py-3"><PriorityBadge label={r.priorityLabel} /></td>
                <td className="px-4 py-3"><Badge value={r.status} /></td>
                <td className="px-4 py-3 text-xs">{r.landmark ?? 'GPS Coordinates'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {r.assignedVolunteerName ?? r.assignedAgencyName ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => setSelected(r)} className="font-semibold">
                    Dispatch →
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reports.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No reports matched the specified filters.</div>}
      </div>

      {selected && (
        <Modal open title="Operational Incident Dispatch" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">{selected.trackingId}</span>
                <PriorityBadge label={selected.priorityLabel} />
              </div>
              <p className="mt-2 text-slate-700 dark:text-slate-300 font-medium">{selected.description}</p>
              {selected.landmark && <div className="mt-1 text-slate-500">Landmark: {selected.landmark}</div>}
              {selected.reporterPhone && <div className="mt-1 text-slate-500">Phone: {selected.reporterPhone}</div>}
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
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress (Dispatched)</option>
                <option value="resolved">Resolved (Evacuated / Safe)</option>
              </Select>
            </Field>

            <Field label="Resolution / Field Notes">
              <Input
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Enter field instructions or rescue summary notes…"
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

