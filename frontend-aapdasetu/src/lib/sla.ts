import type { Report } from '../types'

/** Minutes an unassigned RED report may wait before it breaches the response SLA. */
export const SLA_THRESHOLD_MINUTES = 5

/** Whole minutes since `createdAt`, or null when the timestamp is unusable. */
export function slaWaitingMinutes(createdAt: string, now = Date.now()): number | null {
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return null
  return Math.max(0, Math.floor((now - created) / 60000))
}

/**
 * Client-side mirror of the backend SLA rule (escalation.service): RED +
 * pending + unassigned + older than the threshold. Used for breach badges;
 * the authoritative flag is set by POST /admin/escalations/sweep.
 */
export function isSlaBreached(
  report: Pick<Report, 'priorityLabel' | 'status' | 'assignedVolunteerId' | 'assignedAgencyId' | 'createdAt'>,
  thresholdMinutes = SLA_THRESHOLD_MINUTES,
  now = Date.now(),
): boolean {
  if (report.priorityLabel !== 'RED') return false
  if (report.status !== 'pending') return false
  if (report.assignedVolunteerId || report.assignedAgencyId) return false
  const waiting = slaWaitingMinutes(report.createdAt, now)
  return waiting !== null && waiting > thresholdMinutes
}
