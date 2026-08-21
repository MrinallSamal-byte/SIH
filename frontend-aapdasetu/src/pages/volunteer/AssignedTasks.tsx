import { useCallback, useEffect, useState } from 'react'
import { listReports, updateReport } from '../../api/endpoints'
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'
import Modal from '../../components/common/Modal'
import { Field, Textarea } from '../../components/common/Input'
import { useToast } from '../../components/common/Toast'
import { timeAgo, getNavigationUrl } from '../../lib/helpers'
import type { Report } from '../../types'

export default function AssignedTasks() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Report[] | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [resolveTarget, setResolveTarget] = useState<Report | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')

  const activeVolunteerId = localStorage.getItem('aapdasetu_volunteer_session')

  const loadTasks = useCallback(async () => {
    try {
      const reports = await listReports({ status: 'in_progress' })
      if (!activeVolunteerId) {
        setTasks([])
        return
      }
      const relevant = reports.filter((r) => r.assignedVolunteerId === activeVolunteerId)
      setTasks(relevant)
    } catch {
      toast('Failed to load assigned tasks', 'error')
    }
  }, [activeVolunteerId, toast])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const updateTaskStatus = async (reportId: string, nextStatus: Report['status'], notes?: string) => {
    setUpdatingId(reportId)
    try {
      await updateReport(reportId, { status: nextStatus, resolutionNotes: notes })
      toast(`Task updated: ${nextStatus.toUpperCase()}`, 'success')
      setResolveTarget(null)
      setResolutionNotes('')
      loadTasks()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  if (!tasks) return <Loader />
  if (!activeVolunteerId) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        No volunteer session. Please <a href="#/volunteer/login" className="font-bold underline">log in</a> to view assigned tasks.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Assigned Tasks</h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Active incidents assigned to you.
        </p>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const hasCoords = Boolean(task.latitude && task.longitude)

          return (
            <div
              key={task.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge label={task.priorityLabel} />
                <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">{task.trackingId}</span>
                <span className="text-sm font-bold capitalize">{task.type} Emergency</span>
                <Badge value={task.status} />
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{timeAgo(task.createdAt)}</span>
              </div>

              <p className="mt-3 text-sm text-slate-800 dark:text-slate-200 font-medium">{task.description}</p>
              
              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {task.landmark && <div>Landmark: <strong>{task.landmark}</strong></div>}
                {task.reporterPhone && (
                  <div>
                    Contact:{' '}
                    <a href={`tel:${task.reporterPhone}`} className="text-slate-900 dark:text-slate-100 underline font-bold hover:text-emerald-600">
                      {task.reporterPhone}
                    </a>
                  </div>
                )}
                {task.assignedVolunteerName && (
                  <div>Assignee: <strong>{task.assignedVolunteerName}</strong></div>
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
                      <span>Start Navigation</span>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No GPS Attached</span>
                  )}

                  {task.reporterPhone && (
                    <a
                      href={`tel:${task.reporterPhone}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <span>Call Contact</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={updatingId === task.id}
                    onClick={() => {
                      setResolveTarget(task)
                      setResolutionNotes('Victim safely evacuated and transferred to shelter/medical team.')
                    }}
                    className="font-bold"
                  >
                    Complete Mission
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400 dark:border-slate-800">
            No active tasks currently assigned.
          </div>
        )}
      </div>

      {/* Resolution Notes Modal */}
      {resolveTarget && (
        <Modal open title="Complete Task" onClose={() => setResolveTarget(null)}>
          <div className="space-y-4">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Confirm resolution for incident <strong className="font-mono text-slate-800 dark:text-slate-200">{resolveTarget.trackingId}</strong> ({resolveTarget.type.toUpperCase()}).
            </div>

            <Field label="Resolution Notes">
              <Textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe resolution details..."
              />
            </Field>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setResolveTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={updatingId === resolveTarget.id}
                onClick={() => updateTaskStatus(resolveTarget.id, 'resolved', resolutionNotes)}
                className="font-bold"
              >
                {updatingId === resolveTarget.id ? 'Resolving…' : 'Confirm Resolution'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

