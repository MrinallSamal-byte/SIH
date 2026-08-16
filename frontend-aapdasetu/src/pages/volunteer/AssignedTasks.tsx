import { useEffect, useState } from 'react'
import { listReports } from '../../api/endpoints'
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { timeAgo } from '../../lib/helpers'
import type { Report } from '../../types'

export default function AssignedTasks() {
  const [reports, setReports] = useState<Report[] | null>(null)

  useEffect(() => {
    listReports({ status: 'in_progress' }).then(setReports)
  }, [])

  if (!reports) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold">Assigned tasks</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Incidents currently in progress that may need your response.</p>

      <div className="mt-4 space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge label={r.priorityLabel} />
              <span className="text-sm font-semibold capitalize">{r.type}</span>
              <Badge value={r.status} />
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{timeAgo(r.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.description}</p>
            {r.landmark && <div className="text-xs text-slate-400 dark:text-slate-500">Location: {r.landmark}</div>}
            {r.assignedVolunteerName && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Assigned to: {r.assignedVolunteerName}</div>}
          </div>
        ))}
        {reports.length === 0 && <div className="text-sm text-slate-400 dark:text-slate-500">No tasks assigned right now.</div>}
      </div>
    </div>
  )
}
