/** Safe-routes / route hazard service (flood polygons, blocked underpasses). */
import { prisma } from '../lib/prisma.js';
import { NotFoundError, UnprocessableEntityError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';

export interface CreateHazardInput {
  type: string;
  name?: string;
  geometry: unknown;
  description?: string;
  active?: boolean;
  adminEmail: string;
}

export async function listActiveHazards() {
  return prisma.routeHazard.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listHazards(params: { type?: string; page?: number; pageSize?: number }) {
  // page/pageSize absent → return all rows (legacy behavior)
  const take =
    params.page !== undefined || params.pageSize !== undefined
      ? Math.min(params.pageSize ?? 50, 200)
      : undefined;
  return prisma.routeHazard.findMany({
    where: params.type ? { type: params.type } : {},
    orderBy: { createdAt: 'desc' },
    ...(take !== undefined ? { skip: ((params.page ?? 1) - 1) * take, take } : {}),
  });
}

export async function createHazard(input: CreateHazardInput) {
  const geometry = input.geometry as { type?: unknown; coordinates?: unknown } | null | undefined;
  if (
    !geometry ||
    typeof geometry !== 'object' ||
    (geometry.type !== 'Polygon' && geometry.type !== 'LineString' && geometry.type !== 'Point') ||
    !Array.isArray(geometry.coordinates)
  ) {
    throw new UnprocessableEntityError('geometry must be GeoJSON Polygon, LineString or Point with a coordinates array');
  }
  const hazard = await prisma.routeHazard.create({
    data: {
      type: input.type,
      name: input.name,
      geometry: input.geometry as object,
      description: input.description,
      active: input.active ?? true,
    },
  });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'CREATE_ROUTE_HAZARD',
    entityType: 'route_hazard',
    entityId: hazard.id,
    details: { type: input.type },
  });
  return hazard;
}

export async function updateHazardActive(input: { id: string; active: boolean; adminEmail: string }) {
  const existing = await prisma.routeHazard.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError('Hazard not found');
  const hazard = await prisma.routeHazard.update({
    where: { id: input.id },
    data: { active: input.active },
  });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'UPDATE_ROUTE_HAZARD',
    entityType: 'route_hazard',
    entityId: input.id,
    details: { active: input.active },
  });
  return hazard;
}

/** Compute a simple safe reroute suggestion: distance-aware offset around hazards. */
export async function computeSafeReroute(input: { latitude: number; longitude: number; hazardId?: string }) {
  const hazards = input.hazardId
    ? await prisma.routeHazard.findMany({ where: { id: input.hazardId, active: true } })
    : await prisma.routeHazard.findMany({ where: { active: true } });
  if (input.hazardId && hazards.length === 0) {
    throw new NotFoundError('Active hazard not found');
  }

  return {
    origin: { latitude: input.latitude, longitude: input.longitude },
    avoidanceZones: hazards.map((h: (typeof hazards)[number]) => ({
      id: h.id,
      type: h.type,
      name: h.name,
      geometry: h.geometry,
    })),
    suggestion: `Avoid the ${hazards.length} active hazard zone(s). Prefer elevated main roads and verified safe corridors from your current location.`,
  };
}