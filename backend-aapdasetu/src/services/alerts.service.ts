/** Public alerts & broadcaster service. */
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';
import { realtimeHub } from '../realtime/hub.js';

export interface CreateAlertInput {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  channel?: string;
  targetArea?: string;
  createdBy?: string;
  adminEmail?: string;
}

export async function createAlert(input: CreateAlertInput) {
  const alert = await prisma.alert.create({
    data: {
      title: input.title,
      message: input.message,
      severity: input.severity,
      channel: (input.channel as never) ?? 'public',
      targetArea: input.targetArea,
      createdBy: input.createdBy ?? input.adminEmail,
    },
  });

  if (input.adminEmail) {
    await writeAuditLog({
      adminEmail: input.adminEmail,
      action: 'CREATE_ALERT',
      entityType: 'alert',
      entityId: alert.id,
      details: { severity: input.severity, channel: alert.channel },
    });
  }

  // Mask before broadcast too — the hub pushes the same payload to the
  // public WebSocket channel, where createdBy (admin email) must not leak.
  realtimeHub.emitAlert(serializePublicAlert(alert));
  return alert;
}

export async function listAlerts(params: {
  severity?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}) {
  // The admin route validates page/pageSize — honor them (capped) instead of
  // silently always returning the first 100 rows.
  const pageSize = Math.min(params.pageSize ?? params.limit ?? 100, 200);
  const page = Math.max(params.page ?? 1, 1);
  return prisma.alert.findMany({
    where: params.severity ? { severity: params.severity as never } : {},
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

const ACTIVE_ALERT_TTL_HOURS = 24;

// Public payload: createdBy holds the issuing admin's email — internal PII
// that must not reach citizen clients (REST or the public WS channel).
function serializePublicAlert(alert: {
  id: string;
  title: string;
  message: string;
  severity: string;
  channel: string;
  targetArea: string | null;
  createdAt: Date;
}) {
  return {
    id: alert.id,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    channel: alert.channel,
    targetArea: alert.targetArea,
    createdAt: alert.createdAt,
  };
}

export async function listActiveAlerts() {
  // ponytail: fixed 24h TTL vs an expiresAt column — swap when alerts get explicit expiry
  const cutoff = new Date(Date.now() - ACTIVE_ALERT_TTL_HOURS * 60 * 60 * 1000);
  const alerts = await prisma.alert.findMany({
    where: { createdAt: { gte: cutoff } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return alerts.map(serializePublicAlert);
}

export async function getAlert(id: string) {
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) throw new NotFoundError('Alert not found');
  return alert;
}