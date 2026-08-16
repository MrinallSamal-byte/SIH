import { useCallback, useEffect, useState } from 'react'
import { listAgencies, listReports, listVolunteers, updateReport } from '../../api/endpoints'
import { Field, Input, Select } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import { formatDateTime } from '../../lib/helpers'
import type { Agency, Report, Volunteer } from '../../types'

export default function Reports() {
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[] | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Report | null>(null)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])

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
    listVolunteers('available').then(setVolunteers)
    listAgencies().then(setAgencies)
  }, [load])

  const dispatch = async (patch: { status?: Report['status']; assignedVolunteerId?: string; assignedAgencyId?: string; resolutionNotes?: string }) => {
    if (!selected) return
    await updateReport(selected.id, patch)
    toast('Report updated')
    setSelected(null)
    load()
  }

  if (!reports) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold">Incident reports</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search, filter, triage, and dispatch incidents.</p>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 md:grid-cols-4">
        <Field label="Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="in_progress">in_progress</option>
            <option value="resolved">resolved</option>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All</option>
            <option value="RED">RED</option>
            <option value="YELLOW">YELLOW</option>
            <option value="GREEN">GREEN</option>
          </Select>
        </Field>
        <Field label="Search">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="keyword / tracking id" />
        </Field>
        <div className="flex items-end">
          <Button onClick={load} variant="secondary" className="w-full">
            Apply
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Tracking</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Reported</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50 dark:bg-slate-800">
                <td className="px-4 py-2 font-mono text-xs">{r.trackingId}</td>
                <td className="px-4 py-2 capitalize">{r.type}</td>
                <td className="px-4 py-2"><PriorityBadge label={r.priorityLabel} /></td>
                <td className="px-4 py-2"><Badge value={r.status} /></td>
                <td className="px-4 py-2 text-xs">{r.landmark ?? '—'}</td>
                <td className="px-4 py-2 text-xs">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-2">
                  <Button variant="outline" onClick={() => setSelected(r)}>
                    Dispatch
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reports.length === 0 && <div className="p-6 text-sm text-slate-400 dark:text-slate-500">No reports match the filters.</div>}
      </div>

      {selected && (
        <Modal open title="Dispatch & triage" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="text-sm">
              <div className="font-semibold">{selected.trackingId} · <span className="capitalize">{selected.type}</span></div>
              <div className="mt-1 text-slate-500 dark:text-slate-400">{selected.description}</div>
              {selected.triageFactors && (
                <div className="mt-2 rounded bg-slate-50 dark:bg-slate-900 p-2 text-xs">
                  {selected.triageFactors.map((f, i) => (
                    <div key={i}>+{f.points} — {f.reason}</div>
                  ))}
                </div>
              )}
            </div>

            <Field label="Assign volunteer">
              <Select onChange={(e) => dispatch({ assignedVolunteerId: e.target.value })} defaultValue="">
                <option value="" disabled>Select volunteer…</option>
                {volunteers.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} — {v.skills.join(', ') || 'no skills'}</option>
                ))}
              </Select>
            </Field>

            <Field label="Assign agency">
              <Select onChange={(e) => dispatch({ assignedAgencyId: e.target.value })} defaultValue="">
                <option value="" disabled>Select agency…</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Update status">
              <Select onChange={(e) => dispatch({ status: e.target.value as Report['status'] })} defaultValue="">
                <option value="" disabled>Set status…</option>
                <option value="in_progress">in_progress</option>
                <option value="resolved">resolved</option>
              </Select>
            </Field>

            <Field label="Resolution notes">
              <Input
                placeholder="Notes…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    dispatch({ resolutionNotes: e.currentTarget.value, status: 'resolved' })
                  }
                }}
              />
            </Field>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => dispatch({ status: 'in_progress' })}>
                Mark in progress
              </Button>
              <Button variant="danger" onClick={() => dispatch({ status: 'resolved' })}>
                Resolve
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
