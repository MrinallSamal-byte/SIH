/** Shelter resources (food/water/medical/etc.) management service. */
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';

export async function listResources(params: { shelterId?: string; category?: string }) {
  return prisma.resource.findMany({
    where: {
      ...(params.shelterId ? { shelterId: params.shelterId } : {}),
      ...(params.category ? { category: params.category as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { shelter: { select: { id: true, name: true } } },
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
  const resource = await prisma.resource.create({
    data: {
      name: input.name,
      category: input.category as never,
      quantity: input.quantity,
      unit: input.unit,
      shelterId: input.shelterId,
    },
  });
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
  const existing = await prisma.resource.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError('Resource not found');
  const resource = await prisma.resource.update({
    where: { id: input.id },
    data: { quantity: input.quantity },
  });
  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'UPDATE_RESOURCE_QUANTITY',
    entityType: 'resource',
    entityId: input.id,
    details: { quantity: input.quantity },
  });
  return resource;
}