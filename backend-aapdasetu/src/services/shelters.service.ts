/** Shelter finder & management service. */
// ponytail: list endpoints keep returning bare arrays for FE compat; envelope upgrade path is {items,total,page,pageSize}
import { prisma } from '../lib/prisma.js';
import { haversineDistanceKm } from '../lib/haversine.js';
import { NotFoundError, UnprocessableEntityError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';
import { realtimeHub } from '../realtime/hub.js';

export async function findNearbyShelters(params: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}) {
  const radius = params.radiusKm ?? 50;
  const shelters = await prisma.shelter.findMany({ include: { resources: true } });

  const withDistance = shelters
    .map((s: (typeof shelters)[number]) => ({
      ...s,
      distanceKm: haversineDistanceKm(params.latitude, params.longitude, s.latitude, s.longitude),
    }))
    .filter((s: { distanceKm: number }) => s.distanceKm <= radius)
    .sort((a: { distanceKm: number }, b: { distanceKm: number }) => a.distanceKm - b.distanceKm);

  return withDistance.map((row: (typeof withDistance)[number]) => {
    const { resources, ...s } = row as (typeof row) & { resources?: unknown };
    return {
      ...s,
      capacityAvailable: Math.max(0, s.capacity - s.occupancy),
      resources,
    };
  });
}

export async function listShelters(params: { status?: string; page?: number; pageSize?: number }) {
  // page/pageSize absent → return all rows (legacy behavior)
  const take =
    params.page !== undefined || params.pageSize !== undefined
      ? Math.min(params.pageSize ?? 50, 200)
      : undefined;
  return prisma.shelter.findMany({
    where: params.status ? { status: params.status as never } : {},
    orderBy: { createdAt: 'desc' },
    include: { resources: true },
    ...(take !== undefined ? { skip: ((params.page ?? 1) - 1) * take, take } : {}),
  });
}

export async function getShelter(id: string) {
  const shelter = await prisma.shelter.findUnique({ where: { id }, include: { resources: true } });
  if (!shelter) throw new NotFoundError('Shelter not found');
  return shelter;
}

export async function createShelter(input: {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  facilities: string[];
  contactPhone?: string;
  status?: string;
  adminEmail: string;
}) {
  const shelter = await prisma.shelter.create({
    data: {
      name: input.name,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      capacity: input.capacity,
      facilities: input.facilities as never,
      contactPhone: input.contactPhone,
      status: (input.status as never) ?? 'open',
    },
  });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'CREATE_SHELTER',
    entityType: 'shelter',
    entityId: shelter.id,
  });
  return shelter;
}

export async function updateShelter(input: {
  id: string;
  adminEmail: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  occupancy?: number;
  facilities?: string[];
  contactPhone?: string;
  status?: string;
}) {
  const existing = await prisma.shelter.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError('Shelter not found');

  // Merge input over existing before validating capacity math.
  const nextCapacity = input.capacity ?? existing.capacity;
  const nextOccupancy = input.occupancy ?? existing.occupancy ?? 0;
  if (nextOccupancy > nextCapacity) {
    throw new UnprocessableEntityError('occupancy cannot exceed capacity');
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.address !== undefined) data.address = input.address;
  if (input.latitude !== undefined) data.latitude = input.latitude;
  if (input.longitude !== undefined) data.longitude = input.longitude;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.occupancy !== undefined) data.occupancy = input.occupancy;
  if (input.facilities !== undefined) data.facilities = input.facilities;
  if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone;
  if (input.status !== undefined) {
    data.status = input.status;
  } else if (input.occupancy !== undefined || input.capacity !== undefined) {
    // Auto-derive status from capacity math when the caller didn't pin one.
    data.status = nextOccupancy >= nextCapacity ? 'full' : 'open';
  }

  const shelter = await prisma.shelter.update({ where: { id: input.id }, data });

  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'UPDATE_SHELTER',
    entityType: 'shelter',
    entityId: input.id,
    details: { ...input, adminEmail: undefined },
  });

  if (input.occupancy !== undefined || input.status !== undefined) {
    realtimeHub.broadcast(
      { type: 'shelter:capacity', payload: serializeShelter(shelter), timestamp: new Date().toISOString() },
      'public',
    );
  }

  return shelter;
}

function serializeShelter(s: Record<string, unknown>) {
  return { ...s, capacityAvailable: Math.max(0, Number(s.capacity) - Number(s.occupancy ?? 0)) };
}