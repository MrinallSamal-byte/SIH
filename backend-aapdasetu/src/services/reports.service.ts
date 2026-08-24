/** Reports, SOS, tracking and dispatch services. */
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { computeTriage, IncidentType, PriorityLabel } from '../lib/triage.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';
import { realtimeHub } from '../realtime/hub.js';

export interface CreateSosInput {
  type: IncidentType;
  latitude: number;
  longitude: number;
  description?: string;
  landmark?: string;
  reporterName?: string;
  reporterPhone?: string;
  medicalCondition?: string;
  bloodType?: string;
  mediaData?: string;
  mediaType?: string;
  source?: string;
}

export interface CreateReportInput extends CreateSosInput {
  missingPersonName?: string;
  missingPersonAge?: number;
  missingPersonDesc?: string;
}

export async function createSosReport(input: CreateSosInput) {
  const triage = computeTriage({
    type: input.type,
    description: input.description,
    medicalCondition: input.medicalCondition,
    landmark: input.landmark,
  });

  const report = await prisma.report.create({
    data: {
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
      description: input.description,
      landmark: input.landmark,
      reporterName: input.reporterName,
      reporterPhone: input.reporterPhone,
      medicalCondition: input.medicalCondition,
      bloodType: input.bloodType,
      mediaData: input.mediaData,
      mediaType: input.mediaType ?? (input.mediaData ? 'media' : 'none'),
      source: input.source ?? 'sos',
      priorityScore: triage.score,
      priorityLabel: triage.label as PriorityLabel,
      triageFactors: triage.factors as unknown as object,
    },
  });

  realtimeHub.emitSos(serializeReport(report));

  return { ...serializeReport(report), triage };
}

export async function createIncidentReport(input: CreateReportInput) {
  const triage = computeTriage({
    type: input.type,
    description: input.description,
    medicalCondition: input.medicalCondition,
    missingPersonAge: input.missingPersonAge,
    landmark: input.landmark,
  });

  const report = await prisma.report.create({
    data: {
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
      description: input.description,
      landmark: input.landmark,
      reporterName: input.reporterName,
      reporterPhone: input.reporterPhone,
      missingPersonName: input.missingPersonName,
      missingPersonAge: input.missingPersonAge,
      missingPersonDesc: input.missingPersonDesc,
      medicalCondition: input.medicalCondition,
      bloodType: input.bloodType,
      mediaData: input.mediaData,
      mediaType: input.mediaType ?? (input.mediaData ? 'media' : 'none'),
      source: input.source ?? 'form',
      priorityScore: triage.score,
      priorityLabel: triage.label as PriorityLabel,
      triageFactors: triage.factors as unknown as object,
    },
  });

  realtimeHub.broadcast({
    type: 'report:new',
    payload: serializeReport(report),
    timestamp: new Date().toISOString(),
    highPriority: report.priorityLabel === 'RED',
  });

  return { ...serializeReport(report), triage };
}

export async function getReportByTrackingId(trackingId: string) {
  const report = await prisma.report.findUnique({
    where: { trackingId },
    include: {
      assignedVolunteer: { select: { id: true, name: true, phone: true, status: true } },
      assignedAgency: { select: { id: true, name: true, type: true } },
    },
  });
  if (!report) throw new NotFoundError('Report not found');
  return serializeReport(report, true);
}

export async function getReportById(id: string) {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      assignedVolunteer: { select: { id: true, name: true, phone: true, status: true } },
      assignedAgency: { select: { id: true, name: true, type: true } },
      damageAssessments: { select: { id: true, classification: true, status: true } },
    },
  });
  if (!report) throw new NotFoundError('Report not found');
  return serializeReport(report, true);
}

export async function updateReportStatus(input: {
  id: string;
  adminEmail: string;
  status?: 'pending' | 'in_progress' | 'resolved';
  resolutionNotes?: string;
}) {
  const existing = await prisma.report.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError('Report not found');

  const data: Record<string, unknown> = {};
  if (input.status) data.status = input.status;
  if (input.resolutionNotes !== undefined) data.resolutionNotes = input.resolutionNotes;
  if (input.status === 'resolved') data.resolvedAt = new Date();
  else if (input.status && existing.status === 'resolved') data.resolvedAt = null;

  const report = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // If resolving report, release the assigned volunteer back to available
    if (input.status === 'resolved' && existing.assignedVolunteerId) {
      await tx.volunteer.update({
        where: { id: existing.assignedVolunteerId },
        data: { status: 'available' },
      }).catch(() => {});
    }

    return tx.report.update({ where: { id: input.id }, data });
  });

  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'UPDATE_REPORT_STATUS',
    entityType: 'report',
    entityId: input.id,
    details: { status: input.status, resolutionNotes: input.resolutionNotes },
  });

  realtimeHub.broadcast({
    type: input.status === 'resolved' ? 'report:resolution' : 'report:update',
    payload: serializeReport(report),
    timestamp: new Date().toISOString(),
    highPriority: report.priorityLabel === 'RED',
  });

  return serializeReport(report);
}

export async function assignDispatch(input: {
  id: string;
  adminEmail: string;
  volunteerId?: string;
  agencyId?: string;
}) {
  // ponytail: validate-first, then one transaction — availability enforced by conditional updateMany guard
  const report = await prisma.report.findUnique({ where: { id: input.id } });
  if (!report) throw new NotFoundError('Report not found');

  if (input.volunteerId) {
    const volunteer = await prisma.volunteer.findUnique({ where: { id: input.volunteerId } });
    if (!volunteer) throw new NotFoundError('Volunteer not found');
  }

  if (input.agencyId) {
    const agency = await prisma.agency.findUnique({ where: { id: input.agencyId } });
    if (!agency) throw new NotFoundError('Agency not found');
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // If reassigning away from a previous volunteer, release the old volunteer back to available
    if (report.assignedVolunteerId && report.assignedVolunteerId !== input.volunteerId) {
      await tx.volunteer.update({
        where: { id: report.assignedVolunteerId },
        data: { status: 'available' },
      }).catch(() => {});
    }

    if (input.volunteerId) {
      const r = await tx.volunteer.updateMany({ where: { id: input.volunteerId, status: 'available' }, data: { status: 'on_duty' } });
      if (r.count === 0) throw new ConflictError('Volunteer not available');
    }

    const updated = await tx.report.update({
      where: { id: input.id },
      data: {
        assignedVolunteerId: input.volunteerId,
        assignedAgencyId: input.agencyId,
        status: report.status === 'pending' ? 'in_progress' : report.status,
      },
      include: {
        assignedVolunteer: { select: { id: true, name: true, phone: true } },
        assignedAgency: { select: { id: true, name: true, type: true } },
      },
    });

    await tx.dispatch.create({
      data: {
        reportId: input.id,
        volunteerId: input.volunteerId,
        agencyId: input.agencyId,
        action: 'assign',
        assignedBy: input.adminEmail,
      },
    });

    return updated;
  });

  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'ASSIGN_DISPATCH',
    entityType: 'report',
    entityId: input.id,
    details: { volunteerId: input.volunteerId, agencyId: input.agencyId },
  });

  realtimeHub.broadcast({
    type: 'report:assignment',
    payload: serializeReport(updated, true),
    timestamp: new Date().toISOString(),
    highPriority: updated.priorityLabel === 'RED',
  });

  return serializeReport(updated, true);
}

export async function unassignDispatch(input: {
  id: string;
  adminEmail: string;
  target: 'volunteer' | 'agency';
}) {
  const report = await prisma.report.findUnique({ where: { id: input.id } });
  if (!report) throw new NotFoundError('Report not found');

  const volunteerId = input.target === 'volunteer' ? null : report.assignedVolunteerId;
  const agencyId = input.target === 'agency' ? null : report.assignedAgencyId;

  if (input.target === 'volunteer' && report.assignedVolunteerId) {
    await prisma.volunteer.update({
      where: { id: report.assignedVolunteerId },
      data: { status: 'available' },
    });
  }

  const updated = await prisma.report.update({
    where: { id: input.id },
    data: { assignedVolunteerId: volunteerId, assignedAgencyId: agencyId },
    include: {
      assignedVolunteer: { select: { id: true, name: true, phone: true } },
      assignedAgency: { select: { id: true, name: true, type: true } },
    },
  });

  await prisma.dispatch.create({
    data: {
      reportId: input.id,
      volunteerId: input.target === 'volunteer' ? report.assignedVolunteerId : undefined,
      agencyId: input.target === 'agency' ? report.assignedAgencyId : undefined,
      action: 'unassign',
      assignedBy: input.adminEmail,
    },
  });

  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'UNASSIGN_DISPATCH',
    entityType: 'report',
    entityId: input.id,
    details: { target: input.target },
  });

  realtimeHub.broadcast({
    type: 'dispatch:update',
    payload: serializeReport(updated, true),
    timestamp: new Date().toISOString(),
  });

  return serializeReport(updated, true);
}

export async function listReports(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  priorityLabel?: string;
  search?: string;
}) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 50, 200);

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;
  if (params.priorityLabel) where.priorityLabel = params.priorityLabel;
  if (params.search) {
    where.OR = [
      { trackingId: { contains: params.search, mode: 'insensitive' } },
      { reporterName: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
      { landmark: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: [{ priorityLabel: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedVolunteer: { select: { id: true, name: true } },
        assignedAgency: { select: { id: true, name: true, type: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return { items: items.map((r: (typeof items)[number]) => serializeReport(r, true)), total, page, pageSize };
}

export function serializeReport(report: Record<string, unknown>, includeRelations = false) {
  const { mediaData, ...rest } = report as { mediaData?: string; [k: string]: unknown };
  // Never leak raw base64 media payloads over the public API unless explicitly needed.
  const out: Record<string, unknown> = { ...rest, hasMedia: Boolean(mediaData) };
  if (!includeRelations) {
    delete out.assignedVolunteer;
    delete out.assignedAgency;
  }
  return out;
}

// ponytail: public tracking payload only — no reporter PII, volunteer phone or medicalCondition
export function serializePublicTracking(report: Record<string, unknown>) {
  const r = report as { mediaData?: string | null; mediaType?: string | null; [k: string]: unknown };
  return {
    trackingId: r.trackingId,
    type: r.type,
    status: r.status,
    priorityLabel: r.priorityLabel,
    priorityScore: r.priorityScore,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    landmark: r.landmark,
    hasMedia: Boolean(r.mediaData || r.mediaType),
  };
}
