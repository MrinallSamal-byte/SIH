/** Audit logging service — every admin action, status change and login is recorded. */
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export interface AuditEntry {
  adminEmail: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminEmail: entry.adminEmail,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: (entry.details as object) ?? undefined,
      },
    });
  } catch (err) {
    // Audit failures must never break the primary operation.
    logger.error('audit_write_failed', { action: entry.action, err });
  }
}

export async function listAuditLogs(params: {
  page?: number;
  pageSize?: number;
  adminEmail?: string;
  action?: string;
  entityType?: string;
}) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 50, 200);

  const where: Record<string, unknown> = {};
  if (params.adminEmail) where.adminEmail = params.adminEmail;
  if (params.action) where.action = params.action;
  if (params.entityType) where.entityType = params.entityType;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize };
}