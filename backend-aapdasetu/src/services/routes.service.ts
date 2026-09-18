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

function isNumericPair(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length >= 2 &&
    typeof v[0] === 'number' && Number.isFinite(v[0]) &&
    typeof v[1] === 'number' && Number.isFinite(v[1])
  );
}

/** Validates GeoJSON geometry so malformed rings/lines (junk coordinates,
 * unclosed polygons) are rejected at write time instead of stored verbatim
 * for map clients to choke on. */
function validateGeometry(geometry: { type?: unknown; coordinates?: unknown }): void {
  if (geometry.type === 'Point') {
    if (!isNumericPair(geometry.coordinates)) {
      throw new UnprocessableEntityError('Point coordinates must be [lng, lat] numbers');
    }
    return;
  }
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    throw new UnprocessableEntityError('coordinates must be a non-empty array of positions');
  }
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isNumericPair)) {
      throw new UnprocessableEntityError('Polygon ring must contain at least 4 [lng, lat] positions');
    }
    const [first, last] = [ring[0], ring[ring.length - 1]];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw new UnprocessableEntityError('Polygon ring must be closed (first and last positions identical)');
    }
    return;
  }
  // LineString
  if (!geometry.coordinates.every(isNumericPair) || geometry.coordinates.length < 2) {
    throw new UnprocessableEntityError('LineString must contain at least 2 [lng, lat] positions');
  }
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
  validateGeometry(geometry as { type?: unknown; coordinates?: unknown });
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
  // Only hazards near the origin are relevant — a national-scale hazard list
  // would tell a citizen in Odisha to avoid a flooded road in Kolkata.
  const NEARBY_RADIUS_KM = 25;
  const latDelta = NEARBY_RADIUS_KM / 111;
  const lngDelta = NEARBY_RADIUS_KM / (111 * Math.max(Math.cos((input.latitude * Math.PI) / 180), 0.01));

  const hazards = input.hazardId
    ? await prisma.routeHazard.findMany({ where: { id: input.hazardId, active: true } })
    : // Hazards are admin-authored (small table): fetch active rows, then
      // filter to the origin's bounding box in memory below.
      await prisma.routeHazard.findMany({ where: { active: true } });
  if (input.hazardId && hazards.length === 0) {
    throw new NotFoundError('Active hazard not found');
  }

  const extractPoints = (geometry: unknown): Array<[number, number]> => {
    const g = geometry as { type?: unknown; coordinates?: unknown } | null;
    if (!g || !Array.isArray(g.coordinates)) return [];
    const flat: Array<[number, number]> = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node) && typeof node[0] === 'number' && typeof node[1] === 'number') {
        flat.push([node[0] as number, node[1] as number]);
      } else if (Array.isArray(node)) {
        node.forEach(walk);
      }
    };
    walk(g.coordinates);
    return flat;
  };

  const nearby = hazards
    .map((h) => {
      const points = extractPoints(h.geometry);
      const inBox = points.some(
        ([lng, lat]) =>
          Math.abs(lat - input.latitude) <= latDelta && Math.abs(lng - input.longitude) <= lngDelta,
      );
      return { hazard: h, inBox };
    })
    .filter((h) => h.inBox || input.hazardId === h.hazard.id)
    .map((h) => h.hazard);

  return {
    origin: { latitude: input.latitude, longitude: input.longitude },
    avoidanceZones: nearby.map((h: (typeof nearby)[number]) => ({
      id: h.id,
      type: h.type,
      name: h.name,
      geometry: h.geometry,
    })),
    suggestion:
      nearby.length > 0
        ? `Avoid the ${nearby.length} active hazard zone(s) near you. Prefer elevated main roads and verified safe corridors from your current location.`
        : 'No active hazards reported near your location. Prefer elevated main roads and follow official evacuation guidance.',
  };
}