/** Shelter finder & management service. */
import { prisma } from '../lib/prisma.js';
import { haversineDistanceKm } from '../lib/haversine.js';
import { NotFoundError } from '../lib/errors.js';
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
    .map((s) => ({
      ...s,
      distanceKm: haversineDistanceKm(params.latitude, params.longitude, s.latitude, s.longitude),
    }))
    .filter((s) => s.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return withDistance.map(({ resources, ...s }) => ({
    ...s,
    capacityAvailable: Math.max(0, s.capacity - s.occupancy),
    resources,
  }));
}

export async function listShelters(params: { status?: string }) {
  return prisma.shelter.findMany({
    where: params.status ? { status: params.status as never } : {},
    orderBy: { createdAt: 'desc' },
    include: { resources: true },
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

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.address !== undefined) data.address = input.address;
  if (input.latitude !== undefined) data.latitude = input.latitude;
  if (input.longitude !== undefined) data.longitude = input.longitude;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.occupancy !== undefined) data.occupancy = input.occupancy;
  if (input.facilities !== undefined) data.facilities = input.facilities;
  if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone;
  if (input.status !== undefined) data.status = input.status;

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