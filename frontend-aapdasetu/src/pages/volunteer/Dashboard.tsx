import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { volunteerMe, listVolunteerTasks, setVolunteerStatus } from '../../api/endpoints'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import { useVolunteerAuth } from '../../hooks/useVolunteerAuth'
import { useLanguage } from '../../lib/i18n'
import type { Report } from '../../types'

export default function Dashboard() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { user: authUser } = useVolunteerAuth()
  const [volunteer, setVolunteer] = useState<(Awaited<ReturnType<typeof volunteerMe>> & { status?: string }) | null>(null)
  const [activeTasks, setActiveTasks] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const loadErrorToastedRef = useRef(false)
  const load = useCallback(async () => {
    try {
      const me = await volunteerMe()
      setVolunteer(me)
      setActiveTasks(await listVolunteerTasks())
      loadErrorToastedRef.current = false
    } catch {
      if (authUser) {
        setVolunteer({
          id: authUser.id,
          name: authUser.name,
          email: authUser.email || '',
          phone: authUser.phone,
          skills: authUser.skills,
          status: 'available',
        })
      }
      // Poll errors toast only ONCE — 12s polling during an outage must
      // not spam toasts nonstop.
      if (!loadErrorToastedRef.current) {
        loadErrorToastedRef.current = true
        toast(t('vd.loadFailed'), 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [toast, t, authUser])

  useEffect(() => {
    load()
    // Poll for new assignments — the WS hub is dormant on serverless, so this
    // is the only way a dispatched rescue reaches the volunteer's screen.
    const tick = () => {
      if (!document.hidden && navigator.onLine) void load()
    }
    const id = window.setInterval(tick, 12_000)
    return () => window.clearInterval(id)
  }, [load])

  const statusLabel = useCallback(
    (status: string) =>
      status === 'available'
        ? t('vd.available', 'Available')
        : t('vl.statusOffline', 'Off Duty / Offline'),
    [t],
  )

  const toggleAvailability = async () => {
    if (!volunteer) return
    const next = volunteer.status === 'available' ? 'offline' : 'available'
    try {
      await setVolunteerStatus(next)
      setVolunteer({ ...volunteer, status: next })
      toast(`${t('vd.dutyStatusNow')}: ${statusLabel(next)}`, 'success')
    } catch (err) {
      // ponytail: 409 means an active task blocks going offline
      if (err instanceof Error && /409|conflict/i.test(err.message)) {
        toast('Resolve your active task first', 'error')
      } else {
        toast(err instanceof Error ? err.message : t('vd.statusUpdateFailed'), 'error')
      }
    }
  }

  if (loading) return <Loader />
  if (!volunteer) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        {t('vd.noSession')} <Link to="/volunteer/login" className="font-bold underline">{t('vd.logIn')}</Link> {t('vd.toViewDashboard')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('vd.title')}</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('vd.subtitle')}
          </p>
        </div>

      </div>

      {volunteer && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Volunteer Profile Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{volunteer.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{volunteer.phone ?? t('vd.contactOnFile')}</div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  volunteer.status === 'offline'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {volunteer.status === 'offline' ? t('vl.statusOffline', 'Off Duty / Offline') : t('vd.available')}
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('vd.registeredSkills')}:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(volunteer.skills ?? []).map((s) => (
                  <span key={s} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 mono">
                    {s.replace('_', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="text-xs text-slate-500">{t('vd.toggleReadiness')}:</span>
              <Button
                variant={volunteer.status === 'available' ? 'danger' : 'primary'}
                size="sm"
                onClick={toggleAvailability}
                className="font-bold"
              >
                {volunteer.status === 'available' ? 'Go Offline' : t('vd.markAvailable')}
              </Button>
            </div>
          </div>

          {/* Active Tasks Summary Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('vd.activeMissions')}</h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900 mono">
                  {activeTasks.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {activeTasks.length > 0
                  ? t('vd.tasksAssignedCount').replace('{n}', String(activeTasks.length))
                  : t('vd.noActiveTasks')}
              </p>
            </div>

            <div className="mt-6">
              <Link
                to="/volunteer/tasks"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
              >
                <span className="font-bold">{t('vd.viewTaskQueue')}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

