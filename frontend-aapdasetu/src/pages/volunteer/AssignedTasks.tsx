import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listVolunteerTasks, completeVolunteerTask } from '../../api/endpoints'
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'
import Modal from '../../components/common/Modal'
import { useToast } from '../../components/common/Toast'
import { timeAgo, getNavigationUrl } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
import { useIsVolunteerAuthed } from '../../hooks/useVolunteerAuth'
import { emitRealtimeUpdate } from '../../lib/realtimeEventBus'
import type { Report } from '../../types'

export default function AssignedTasks() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Report[] | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [resolveTarget, setResolveTarget] = useState<Report | null>(null)

  const isAuthed = useIsVolunteerAuthed()

  const statusLabel = useCallback(
    (status: string) =>
      status === 'pending'
        ? t('rp.filterPending', 'Pending Triage')
        : status === 'in_progress'
          ? t('rp.filterInProgress', 'In Progress')
          : t('rp.filterResolved', 'Resolved'),
    [t],
  )

  const loadErrorToastedRef = useRef(false)
  const loadTasks = useCallback(async () => {
    try {
      setTasks(await listVolunteerTasks())
      loadErrorToastedRef.current = false
    } catch {
      setTasks((prev) => prev ?? [])
      // Poll errors toast only ONCE — 12s polling during an outage must
      // not spam toasts nonstop.
      if (!loadErrorToastedRef.current) {
        loadErrorToastedRef.current = true
        toast(t('vt.loadFailed'), 'error')
      }
    }
  }, [toast, t])

  useEffect(() => {
    loadTasks()
    // The realtime WebSocket hub is dormant on Vercel serverless — without
    // polling, a volunteer never learns about an assignment made after this
    // page loaded. 12 s poll, paused while the tab is hidden.
    const tick = () => {
      if (!document.hidden && navigator.onLine) void loadTasks()
    }
    const id = window.setInterval(tick, 12_000)
    return () => window.clearInterval(id)
  }, [loadTasks])

  const completeTask = async (reportId: string) => {
    setUpdatingId(reportId)
    try {
      await completeVolunteerTask(reportId)
      emitRealtimeUpdate('report_updated', reportId)
      toast(`${t('vt.taskUpdated')}: ${statusLabel('resolved')}`, 'success')
      setResolveTarget(null)
      loadTasks()
    } catch (err) {
      toast(err instanceof Error ? err.message : t('vt.updateFailed'), 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  if (!isAuthed) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        {t('vt.noSession')} <Link to="/volunteer/login" className="font-bold underline">{t('vt.logIn')}</Link> {t('vt.toViewTasks')}
      </div>
    )
  }
  if (!tasks) return <Loader />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('vt.title')}</h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('vt.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const hasCoords = Boolean(task.latitude && task.longitude)

          return (
            <div
              key={task.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge label={task.priorityLabel} />
                <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">{task.trackingId}</span>
                <span className="text-sm font-bold capitalize">{task.type} {t('vt.emergency')}</span>
                <Badge value={task.status} label={statusLabel(task.status)} />
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{timeAgo(task.createdAt)}</span>
              </div>

              <p className="mt-3 text-sm text-slate-800 dark:text-slate-200 font-medium">{task.description}</p>
              
              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {task.landmark && <div>{t('vt.landmark')}: <strong>{task.landmark}</strong></div>}
                {task.reporterPhone && (
                  <div>
                    {t('vt.contact')}:{' '}
                    <a href={`tel:${task.reporterPhone}`} className="text-slate-900 dark:text-slate-100 underline font-bold hover:text-emerald-600">
                      {task.reporterPhone}
                    </a>
                  </div>
                )}
                {task.assignedVolunteerName && (
                  <div>{t('vt.assignee')}: <strong>{task.assignedVolunteerName}</strong></div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                  {hasCoords ? (
                    <a
                      href={getNavigationUrl(task.latitude!, task.longitude!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 cursor-pointer"
                    >
                      <span>{t('vt.startNavigation')}</span>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">{t('vt.noGps')}</span>
                  )}

                  {task.reporterPhone && (
                    <a
                      href={`tel:${task.reporterPhone}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <span>{t('vt.callContact')}</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={updatingId === task.id}
                    onClick={() => setResolveTarget(task)}
                    className="font-bold"
                  >
                    {t('vt.completeMission')}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400 dark:border-slate-800">
            {t('vt.noActiveTasks')}
          </div>
        )}
      </div>

      {/* Resolution Notes Modal */}
      {resolveTarget && (
        <Modal open title={t('vt.completeTask')} onClose={() => setResolveTarget(null)}>
          <div className="space-y-4">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {t('vt.confirmResolutionFor')} <strong className="font-mono text-slate-800 dark:text-slate-200">{resolveTarget.trackingId}</strong> ({resolveTarget.type.toUpperCase()}).
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setResolveTarget(null)}>
                {t('vt.cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={updatingId === resolveTarget.id}
                onClick={() => completeTask(resolveTarget.id)}
                className="font-bold"
              >
                {updatingId === resolveTarget.id ? t('vt.resolving') : t('vt.confirmResolution')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

