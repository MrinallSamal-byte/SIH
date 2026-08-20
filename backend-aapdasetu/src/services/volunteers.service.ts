/** Volunteer roster & skill dispatch service. */
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';
import { realtimeHub } from '../realtime/hub.js';

export async function listVolunteers(params: { status?: string; skill?: string }) {
  return prisma.volunteer.findMany({
    where: {
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.skill ? { skills: { has: params.skill as never } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { assignments: { select: { id: true, trackingId: true, status: true } } },
  });
}

export async function createVolunteer(input: {
  name: string;
  phone: string;
  skills: string[];
  latitude?: number;
  longitude?: number;
  status?: string;
  adminEmail: string;
}) {
  const volunteer = await prisma.volunteer.create({
    data: {
      name: input.name,
      phone: input.phone,
      skills: input.skills as never,
      latitude: input.latitude,
      longitude: input.longitude,
      status: (input.status as never) ?? 'available',
    },
  });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'CREATE_VOLUNTEER',
    entityType: 'volunteer',
    entityId: volunteer.id,
  });
  return volunteer;
}

export async function updateVolunteerStatus(input: {
  id: string;
  status: string;
  adminEmail: string;
}) {
  const existing = await prisma.volunteer.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError('Volunteer not found');

  const volunteer = await prisma.volunteer.update({
    where: { id: input.id },
    data: { status: input.status as never },
  });

  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'UPDATE_VOLUNTEER_STATUS',
    entityType: 'volunteer',
    entityId: input.id,
    details: { status: input.status },
  });

  realtimeHub.broadcast({
    type: 'volunteer:status',
    payload: { id: volunteer.id, name: volunteer.name, status: volunteer.status },
    timestamp: new Date().toISOString(),
  });

  return volunteer;
}

export async function updateVolunteer(input: {
  id: string;
  adminEmail: string;
  name?: string;
  phone?: string;
  skills?: string[];
  latitude?: number;
  longitude?: number;
}) {
  const existing = await prisma.volunteer.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError('Volunteer not found');

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.skills !== undefined) data.skills = input.skills;
  if (input.latitude !== undefined) data.latitude = input.latitude;
  if (input.longitude !== undefined) data.longitude = input.longitude;

  const volunteer = await prisma.volunteer.update({ where: { id: input.id }, data });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'UPDATE_VOLUNTEER',
    entityType: 'volunteer',
    entityId: input.id,
  });
  return volunteer;
}