import { useCallback, useEffect, useState } from 'react'
import { listVolunteers, updateVolunteer } from '../../api/endpoints'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import type { Volunteer } from '../../types'

export default function Dashboard() {
  const { toast } = useToast()
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const volunteers = await listVolunteers()
    setVolunteer(volunteers[0] ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleAvailability = async () => {
    if (!volunteer) return
    const next = volunteer.status === 'available' ? 'on_duty' : 'available'
    const updated = await updateVolunteer(volunteer.id, { status: next })
    setVolunteer(updated)
    toast(`Status: ${updated.status}`)
  }

  if (loading) return <Loader />

  if (!volunteer) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">No volunteer profile found. Add one via GET/PATCH /api/volunteers.</p>
        <Button onClick={load}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="text-lg font-semibold">{volunteer.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{volunteer.phone ?? '—'}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {volunteer.skills.map((s) => (
              <span key={s} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                {s.replace('_', ' ')}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">Status: <strong>{volunteer.status}</strong></div>
          <Button className="mt-3" variant={volunteer.status === 'available' ? 'primary' : 'secondary'} onClick={toggleAvailability}>
            {volunteer.status === 'available' ? 'Go on duty' : 'Mark available'}
          </Button>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-sm font-semibold">Skills matched dispatch</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            When an incident is dispatched, skill-matched volunteers nearest the location (Haversine) are ranked and
            assigned via <code>PATCH /api/volunteers/:id</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
