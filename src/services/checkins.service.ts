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

export async function createCheckin(input: CreateCheckinInput) {
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