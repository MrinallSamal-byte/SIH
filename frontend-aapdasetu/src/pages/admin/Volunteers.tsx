import { useCallback } from 'react'
import { listVolunteers, updateVolunteer } from '../../api/endpoints'
import { Select } from '../../components/common/Input'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../components/common/Toast'
import type { Volunteer } from '../../types'

export default function Volunteers() {
  const { toast } = useToast()
  const fetchVolunteers = useCallback(() => listVolunteers(), [])
  const volunteers = useRealtime<Volunteer[]>(fetchVolunteers, 10000)

  const update = async (id: string, patch: Partial<Volunteer>) => {
    await updateVolunteer(id, patch)
    toast('Volunteer updated')
  }

  if (!volunteers) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Volunteer roster & skill dispatch</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Skills: medical · search_rescue · driving · logistics</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {volunteers.map((v) => (
          <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{v.name}</div>
              <Badge value={v.status} />
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{v.phone ?? '—'}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {v.skills.map((s) => (
                <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 border border-slate-200 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 mono uppercase">
                  {s.replace('_', ' ')}
                </span>
              ))}
              {v.skills.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">no skills</span>}
            </div>
            <div className="mt-3">
              <Select
                value={v.status}
                onChange={(e) => update(v.id, { status: e.target.value as Volunteer['status'] })}
                className="w-auto py-1 text-xs"
              >
                <option value="available">available</option>
                <option value="on_duty">on_duty</option>
                <option value="offline">offline</option>
              </Select>
              {v.assignedReportId && <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Task: {v.assignedReportId}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
