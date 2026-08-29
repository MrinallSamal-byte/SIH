/** Public missing-persons registry service. */
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';

export type MissingPersonStatus = 'open' | 'matched' | 'resolved';

export async function listMissingPersons(params: { status?: string; page?: number; pageSize?: number }) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 100, 200);

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;

  const [items, total] = await Promise.all([
    prisma.missingPerson.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.missingPerson.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getMissingPerson(id: string) {
  const person = await prisma.missingPerson.findUnique({ where: { id } });
  if (!person) throw new NotFoundError('Missing person record not found');
  return person;
}

export async function createMissingPerson(input: {
  name: string;
  age?: number | null;
  gender?: string | null;
  lastSeenAt?: string | Date | null;
  lastSeenLocation?: string | null;
  clothes?: string | null;
  contactPhone?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
}) {
  return prisma.missingPerson.create({
    data: {
      name: input.name,
      age: input.age ?? null,
      gender: input.gender ?? null,
      lastSeenAt: input.lastSeenAt ? new Date(input.lastSeenAt) : null,
      lastSeenLocation: input.lastSeenLocation ?? null,
      clothes: input.clothes ?? null,
      contactPhone: input.contactPhone ?? null,
      photoUrl: input.photoUrl ?? null,
      notes: input.notes ?? null,
    },
  });
}

export async function updateMissingPerson(input: {
  id: string;
  adminEmail?: string;
  name?: string;
  age?: number | null;
  gender?: string | null;
  lastSeenAt?: string | Date | null;
  lastSeenLocation?: string | null;
  clothes?: string | null;
  contactPhone?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  status?: MissingPersonStatus;
}) {
  const existing = await prisma.missingPerson.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError('Missing person record not found');

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.age !== undefined) data.age = input.age;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.lastSeenAt !== undefined) data.lastSeenAt = input.lastSeenAt ? new Date(input.lastSeenAt) : null;
  if (input.lastSeenLocation !== undefined) data.lastSeenLocation = input.lastSeenLocation;
  if (input.clothes !== undefined) data.clothes = input.clothes;
  if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone;
  if (input.photoUrl !== undefined) data.photoUrl = input.photoUrl;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status !== undefined) data.status = input.status;

  const person = await prisma.missingPerson.update({ where: { id: input.id }, data });

  if (input.adminEmail) {
    const { photoUrl: _photoUrl, ...auditInput } = input;
    await writeAuditLog({
      adminEmail: input.adminEmail,
      action: 'UPDATE_MISSING_PERSON',
      entityType: 'missing_person',
      entityId: input.id,
      // photoUrl can be a multi-hundred-KB base64 data URL — storing it in
      // the audit row would bloat every admin audit-logs page that ships it.
      details: { status: input.status, ...auditInput },
    });
  }

  return person;
}
