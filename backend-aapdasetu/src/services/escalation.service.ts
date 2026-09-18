/**
 * RED escalation SLA sweep.
 *
 * A RED report sitting unassigned is the most dangerous state in the system:
 * everyone assumes someone else is handling it. `sweepEscalations()` finds
 * RED + pending + unassigned reports older than the threshold, stamps
 * `escalatedAt`, bumps `escalationLevel`, writes an audit record per report,
 * and emits a realtime `report:escalated` event so the Live SOS wall flashes
 * them. Run it on a cron (e.g. every minute) or from the admin "Run
 * escalation sweep" button.
 */
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { writeAuditLog } from './audit.service.js';
import { realtimeHub } from '../realtime/hub.js';

/** Pure predicate (unit-tested): is this report breaching the response SLA? */
export function isSlaBreached(
  report: { priorityLabel: string; status: string; assignedVolunteerId?: string | null; assignedAgencyId?: string | null; createdAt: Date | string },
  thresholdMinutes: number,
  now = Date.now(),
): boolean {
  if (report.priorityLabel !== 'RED') return false;
  if (report.status !== 'pending') return false;
  if (report.assignedVolunteerId || report.assignedAgencyId) return false;
  const created = new Date(report.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now - created > thresholdMinutes * 60 * 1000;
}

export interface EscalationSweepResult {
  thresholdMinutes: number;
  escalated: { id: string; trackingId: string; escalationLevel: number; waitingMinutes: number }[];
}

export async function findBreaches(thresholdMinutes: number) {
  const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);
  return prisma.report.findMany({
    where: {
      priorityLabel: 'RED',
      status: 'pending',
      assignedVolunteerId: null,
      assignedAgencyId: null,
      createdAt: { lt: cutoff },
    },
    select: { id: true, trackingId: true, escalationLevel: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
}

export async function sweepEscalations(input: {
  thresholdMinutes?: number;
  adminEmail: string;
}): Promise<EscalationSweepResult> {
  const thresholdMinutes = Math.min(Math.max(input.thresholdMinutes ?? env.escalationThresholdMinutes, 1), 120);
  const breaches = await findBreaches(thresholdMinutes);
  const escalated: EscalationSweepResult['escalated'] = [];

  for (const b of breaches) {
    const updated = await prisma.report.update({
      where: { id: b.id },
      data: { escalatedAt: new Date(), escalationLevel: { increment: 1 } },
      select: { id: true, trackingId: true, escalationLevel: true, priorityLabel: true },
    });
    await writeAuditLog({
      adminEmail: input.adminEmail,
      action: 'ESCALATE_RED_BREACH',
      entityType: 'report',
      entityId: b.id,
      details: { thresholdMinutes, escalationLevel: updated.escalationLevel },
    }).catch(() => {});
    realtimeHub.broadcast({
      type: 'report:escalated',
      payload: updated,
      timestamp: new Date().toISOString(),
      highPriority: true,
    });
    escalated.push({
      id: b.id,
      trackingId: b.trackingId,
      escalationLevel: updated.escalationLevel,
      waitingMinutes: Math.round((Date.now() - new Date(b.createdAt).getTime()) / 60000),
    });
  }

  return { thresholdMinutes, escalated };
}
