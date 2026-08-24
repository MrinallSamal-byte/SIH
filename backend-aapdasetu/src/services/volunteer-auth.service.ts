/**
 * Volunteer authentication & self-service operations.
 * Login is phone + shared access code.
 */
// ponytail: shared roster code, no per-volunteer secrets — upgrade path: admin invite flow storing per-user hashes
import { createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { signVolunteerToken } from '../lib/jwt.js';
import { NotFoundError, ConflictError, UnauthorizedError } from '../lib/errors.js';
import { serializeReport, updateReportStatus } from './reports.service.js';

function accessCodeMatches(candidate: string): boolean {
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(env.volunteerAccessCode).digest();
  return timingSafeEqual(a, b);
}

export async function loginVolunteer(input: { phone: string; accessCode: string }) {
  const phone = input.phone.replace(/\D/g, '');
  const volunteer = await prisma.volunteer.findFirst({ where: { phone } });
  if (!volunteer || !accessCodeMatches(input.accessCode)) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = signVolunteerToken({
    sub: volunteer.id,
    role: 'volunteer',
    name: volunteer.name,
  });

  return {
    token,
    volunteer: {
      id: volunteer.id,
      name: volunteer.name,
      phone: volunteer.phone,
      skills: volunteer.skills,
      status: volunteer.status,
    },
  };
}

export async function getVolunteerProfile(volunteerId: string) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { id: volunteerId },
    select: { id: true, name: true, phone: true, skills: true, status: true },
  });
  if (!volunteer) throw new NotFoundError('Volunteer not found');
  return volunteer;
}

export async function listVolunteerTasks(volunteerId: string) {
  const reports = await prisma.report.findMany({
    where: { assignedVolunteerId: volunteerId, status: { in: ['pending', 'in_progress'] as never } },
    orderBy: [{ priorityLabel: 'asc' }, { createdAt: 'desc' }],
  });
  return { items: reports.map((r: (typeof reports)[number]) => serializeReport(r)) };
}

export async function resolveAssignedTask(input: { id: string; volunteerId: string }) {
  const report = await prisma.report.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, assignedVolunteerId: true },
  });
  if (!report || report.assignedVolunteerId !== input.volunteerId) {
    throw new NotFoundError('Task not found');
  }
  if (report.status === 'resolved') {
    throw new ConflictError('Task already resolved');
  }
  return updateReportStatus({
    id: input.id,
    status: 'resolved',
    adminEmail: `volunteer:${input.volunteerId}`,
  });
}

export async function updateVolunteerAvailability(input: { id: string; status: 'available' | 'offline' }) {
  const openAssignments = await prisma.report.count({
    where: { assignedVolunteerId: input.id, status: { not: 'resolved' as never } },
  });
  if (openAssignments > 0) {
    throw new ConflictError('Cannot change status while assignments are open');
  }
  return prisma.volunteer.update({
    where: { id: input.id },
    data: { status: input.status as never },
    select: { id: true, name: true, phone: true, skills: true, status: true },
  });
}
