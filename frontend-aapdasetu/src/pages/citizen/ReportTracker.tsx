import { useState } from 'react'
import { getReport } from '../../api/endpoints'
import { Field, Input } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import PriorityBadge from '../../components/common/PriorityBadge'
import Loader from '../../components/common/Loader'
import { formatDateTime } from '../../lib/helpers'
import type { Report } from '../../types'

const statusOrder: Report['status'][] = ['pending', 'in_progress', 'resolved']

export default function ReportTracker() {
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lookup = async () => {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      setReport(await getReport(trackingId.trim()))
    } catch {
      setError('Incident not found. Double-check your tracking ID.')
    } finally {
      setLoading(false)
    }
  }

  const currentIdx = report ? statusOrder.indexOf(report.status) : -1

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Track your incident</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter the tracking ID you received when you reported.</p>

      <div className="mt-4 flex gap-2">
        <Field label="Tracking ID">
          <Input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="SOS-XXXX-AB12CD" />
        </Field>
        <div className="flex items-end">
          <Button onClick={lookup} disabled={!trackingId.trim() || loading}>
            Look up
          </Button>
        </div>
      </div>

      {loading && <Loader />}

      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {report && (
        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Tracking ID</div>
              <div className="font-mono text-lg font-bold">{report.trackingId}</div>
            </div>
            <PriorityBadge label={report.priorityLabel} />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold">Status timeline</div>
            <div className="flex items-center">
              {statusOrder.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      i <= currentIdx ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="mx-1 text-[10px] text-slate-500 dark:text-slate-400">{s}</div>
                  {i < statusOrder.length - 1 && (
                    <div className={`h-0.5 flex-1 ${i < currentIdx ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <InfoRow label="Type" value={report.type} />
            <InfoRow label="Location" value={report.landmark ?? '—'} />
            <InfoRow label="Description" value={report.description ?? '—'} />
            <InfoRow label="Reported" value={formatDateTime(report.createdAt)} />
            <InfoRow label="Assigned volunteer" value={report.assignedVolunteerName ?? '—'} />
            <InfoRow label="Assigned agency" value={report.assignedAgencyName ?? '—'} />
            {report.resolutionNotes && <InfoRow label="Resolution notes" value={report.resolutionNotes} />}
          </div>

          <div>
            <span className="mr-2 text-xs text-slate-500 dark:text-slate-400">Status:</span>
            <Badge value={report.status} />
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-1">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="max-w-[60%] text-right font-medium">{value}</span>
    </div>
  )
}
