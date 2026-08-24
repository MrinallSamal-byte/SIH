/** Shelter resources (food/water/medical/etc.) management service. */
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';

export async function listResources(params: {
  shelterId?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  // page/pageSize absent → return all rows (legacy behavior)
  const take =
    params.page !== undefined || params.pageSize !== undefined
      ? Math.min(params.pageSize ?? 50, 200)
      : undefined;
  return prisma.resource.findMany({
    where: {
      ...(params.shelterId ? { shelterId: params.shelterId } : {}),
      ...(params.category ? { category: params.category as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { shelter: { select: { id: true, name: true } } },
    ...(take !== undefined ? { skip: ((params.page ?? 1) - 1) * take, take } : {}),
  });
}

export async function createResource(input: {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  shelterId?: string;
  adminEmail: string;
}) {
  let resource;
  try {
    resource = await prisma.resource.create({
      data: {
        name: input.name,
        category: input.category as never,
        quantity: input.quantity,
        unit: input.unit,
        shelterId: input.shelterId,
      },
    });
  } catch (err) {
    if ((err as { code?: unknown }).code === 'P2003') {
      throw new NotFoundError('Shelter not found');
    }
    throw err;
  }
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'CREATE_RESOURCE',
    entityType: 'resource',
    entityId: resource.id,
  });
  return resource;
}

export async function updateResourceQuantity(input: {
  id: string;
  adminEmail: string;
  quantity: number;
}) {
  // ponytail: conditional updateMany closes the findUnique+update TOCTOU window
  const updated = await prisma.resource.updateMany({
    where: { id: input.id },
    data: { quantity: input.quantity },
  });
  if (updated.count === 0) throw new NotFoundError('Resource not found');
  const resource = await prisma.resource.findUniqueOrThrow({ where: { id: input.id } });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'UPDATE_RESOURCE_QUANTITY',
    entityType: 'resource',
    entityId: input.id,
    details: { quantity: input.quantity },
  });
  return resource;
}