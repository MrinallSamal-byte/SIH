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
  const normalized = normalizePhone(input.phone);
  const fullName = input.fullName.trim();
  if (normalized) {
    // Indexed lookup on the normalized column — the old scan-recent-rows
    // approach silently stopped deduping once volume exceeded its page size.
    const duplicate = await prisma.safetyCheckin.findFirst({
      where: { phoneNormalized: normalized, createdAt: { gte: new Date(Date.now() - CHECKIN_DEDUPE_WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
    });
    // Same-status duplicates collapse into the existing row; a STATUS CHANGE
    // (e.g. need_assistance -> safe) must create a new record so family
    // search never keeps showing a stale, more-dangerous state.
    if (duplicate && duplicate.status === input.status) return duplicate;
  }
  return prisma.safetyCheckin.create({
    data: { ...input, fullName: fullName.length > 0 ? fullName : 'Unknown', phoneNormalized: normalized },
  });
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

const FAMILY_SEARCH_WINDOW_DAYS = 14;
const FAMILY_SEARCH_MAX = 20;

export interface FamilyCheckinResult {
  firstName: string;
  lastNameInitial: string | null;
  phoneMasked: string | null;
  status: 'safe' | 'need_assistance';
  locationName: string | null;
  checkedInAt: string;
}

/**
 * Public family search: given a phone number, return that person's recent
 * check-ins with PII masked. This is the honest replacement for the citizen
 * page that previously queried the admin-only endpoint and silently fell back
 * to 800 fabricated demo rows — a relative could appear "SAFE" from pure fake
 * data. Requires knowing the person's phone number, and never exposes full
 * names or unmasked contacts.
 */
export async function searchCheckinsForFamily(params: { phone: string }): Promise<FamilyCheckinResult[]> {
  const normalized = normalizePhone(params.phone);
  if (!normalized) return [];

  const cutoff = new Date(Date.now() - FAMILY_SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  // Direct indexed lookup — scales with matching rows, not total check-ins.
  const rows = await prisma.safetyCheckin.findMany({
    where: {
      phoneNormalized: normalized,
      status: { in: ['safe', 'need_assistance'] as never },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
    take: FAMILY_SEARCH_MAX,
  });

  return rows.map((c) => {
    const parts = c.fullName.trim().split(/\s+/);
    const firstName = parts[0] || 'Unknown';
    const lastNameInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : null;
    const digits = (c.phone ?? '').replace(/\D/g, '');
    const phoneMasked = digits.length >= 4 ? `••••••${digits.slice(-4)}` : null;
    return {
      firstName,
      lastNameInitial,
      phoneMasked,
      status: c.status as 'safe' | 'need_assistance',
      locationName: c.locationName,
      checkedInAt: c.createdAt.toISOString(),
    };
  });
}