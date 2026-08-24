/** Safety check-in service. */
import { prisma } from '../lib/prisma.js';

export interface CreateCheckinInput {
  fullName: string;
  phone?: string;
  locationName?: string;
  notes?: string;
  status: 'safe' | 'need_assistance';
  latitude?: number;
  longitude?: number;
}

const CHECKIN_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function createCheckin(input: CreateCheckinInput) {
  // ponytail: phone-based window dedupe, not true idempotency keys — scans recent rows because stored phone formats vary
  const normalized = normalizePhone(input.phone);
  if (normalized) {
    const recent = await prisma.safetyCheckin.findMany({
      where: { phone: { not: null }, createdAt: { gte: new Date(Date.now() - CHECKIN_DEDUPE_WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const duplicate = recent.find((c) => normalizePhone(c.phone ?? undefined) === normalized);
    if (duplicate) return duplicate;
  }
  return prisma.safetyCheckin.create({ data: input });
}

export async function listCheckins(params: { page?: number; pageSize?: number; status?: string }) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 50, 200);
  const where = params.status ? { status: params.status as never } : {};
  const [items, total] = await Promise.all([
    prisma.safetyCheckin.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.safetyCheckin.count({ where }),
  ]);
  return { items, total, page, pageSize };
}