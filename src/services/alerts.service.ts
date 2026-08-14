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

  realtimeHub.emitAlert(alert);
  return alert;
}

export async function listAlerts(params: { severity?: string; limit?: number }) {
  return prisma.alert.findMany({
    where: params.severity ? { severity: params.severity as never } : {},
    orderBy: { createdAt: 'desc' },
    take: params.limit ?? 100,
  });
}

export async function listActiveAlerts() {
  return prisma.alert.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
}

export async function getAlert(id: string) {
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) throw new NotFoundError('Alert not found');
  return alert;
}