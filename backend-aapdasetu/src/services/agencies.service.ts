/** Multi-agency response roster service. */
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';

export async function listAgencies(params: { type?: string; page?: number; pageSize?: number }) {
  // page/pageSize absent → return all rows (legacy behavior)
  const take =
    params.page !== undefined || params.pageSize !== undefined
      ? Math.min(params.pageSize ?? 50, 200)
      : undefined;
  return prisma.agency.findMany({
    where: params.type ? { type: params.type as never } : {},
    orderBy: { name: 'asc' },
    include: { assignments: { select: { id: true, trackingId: true, status: true } } },
    ...(take !== undefined ? { skip: ((params.page ?? 1) - 1) * take, take } : {}),
  });
}

export async function createAgency(input: {
  name: string;
  type: string;
  contactPhone?: string;
  contactEmail?: string;
  jurisdiction?: string;
  latitude?: number;
  longitude?: number;
  adminEmail: string;
}) {
  const agency = await prisma.agency.create({
    data: {
      name: input.name,
      type: input.type as never,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      jurisdiction: input.jurisdiction,
      latitude: input.latitude,
      longitude: input.longitude,
    },
  });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'CREATE_AGENCY',
    entityType: 'agency',
    entityId: agency.id,
  });
  return agency;
}

export async function updateAgency(input: {
  id: string;
  adminEmail: string;
  name?: string;
  type?: string;
  contactPhone?: string;
  contactEmail?: string;
  jurisdiction?: string;
  latitude?: number;
  longitude?: number;
}) {
  const existing = await prisma.agency.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError('Agency not found');

  const data: Record<string, unknown> = {};
  for (const key of ['name', 'type', 'contactPhone', 'contactEmail', 'jurisdiction', 'latitude', 'longitude'] as const) {
    if ((input as Record<string, unknown>)[key] !== undefined) data[key] = (input as Record<string, unknown>)[key];
  }

  const agency = await prisma.agency.update({ where: { id: input.id }, data });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'UPDATE_AGENCY',
    entityType: 'agency',
    entityId: input.id,
  });
  return agency;
}