/**
 * Volunteer authentication & self-service operations.
 * Login is phone + access code: a per-volunteer personal code when an admin
 * has issued one, falling back to the shared roster code (legacy path, being
 * phased out — see rotatePersonalCode).
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { signVolunteerToken } from '../lib/jwt.js';
import { NotFoundError, ConflictError, UnauthorizedError } from '../lib/errors.js';
import { serializeReport, updateReportStatus } from './reports.service.js';
import { sha256Hex, safeEqualHex } from './otp.service.js';
import { writeAuditLog } from './audit.service.js';

function accessCodeMatches(candidate: string): boolean {
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(env.volunteerAccessCode).digest();
  return timingSafeEqual(a, b);
}

// Canonical phone form: digits only, last 10 (strips +91 / 0 prefixes and
// formatting). Both the login lookup and volunteer creation normalize the
// same way, so '+91-9876510000' and '98765 10000' resolve to one volunteer.
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10);
}

export async function loginVolunteer(input: { phone: string; accessCode: string }) {
  const phone = normalizePhone(input.phone);
  const volunteer = await prisma.volunteer.findFirst({ where: { phone } });
  // Compare both codes unconditionally-shaped: unknown phone and wrong code
  // both surface as generic 401 so phones cannot be enumerated by timing.
  const personalOk =
    Boolean(volunteer?.personalCodeHash) &&
    safeEqualHex(volunteer?.personalCodeHash ?? '', sha256Hex(input.accessCode));
  const codeOk = personalOk || accessCodeMatches(input.accessCode);
  if (!volunteer || !codeOk) {
    throw new UnauthorizedError('Invalid credentials');
  }
  if (!volunteer.isActive) {
    throw new UnauthorizedError('Volunteer account is disabled');
  }
  if (volunteer.verificationStatus === 'suspended') {
    throw new UnauthorizedError('Volunteer account is suspended');
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
      verificationStatus: volunteer.verificationStatus ?? 'pending',
      loginMethod: personalOk ? 'personal' : 'shared',
    },
  };
}

/**
 * Issue (or rotate) a per-volunteer personal access code. Returns the
 * plaintext ONCE for the admin to hand over out-of-band; only the sha256 is
 * stored. Rotating implicitly keeps any other volunteer's code valid — codes
 * are per-row, never shared.
 */
export async function rotatePersonalCode(input: { id: string; adminEmail: string }): Promise<{ volunteerId: string; accessCode: string }> {
  const existing = await prisma.volunteer.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError('Volunteer not found');
  // 8 chars from a 32-bit space, human-readable (no 0/O/1/I ambiguity).
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let accessCode = '';
  for (let i = 0; i < 8; i++) accessCode += alphabet[bytes[i] % alphabet.length];
  await prisma.volunteer.update({
    where: { id: input.id },
    data: { personalCodeHash: sha256Hex(accessCode) },
  });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'ROTATE_VOLUNTEER_CODE',
    entityType: 'volunteer',
    entityId: input.id,
  });
  return { volunteerId: input.id, accessCode };
}

export async function getVolunteerProfile(volunteerId: string) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { id: volunteerId },
    select: { id: true, name: true, phone: true, skills: true, status: true, verificationStatus: true, trainingCompleted: true },
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
