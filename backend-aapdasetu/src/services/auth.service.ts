/** Admin authentication service (replaces Supabase RPC `verify_admin_login`). */
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import { signAdminToken } from '../lib/jwt.js';
import { BadRequestError, UnauthorizedError } from '../lib/errors.js';
import { writeAuditLog } from './audit.service.js';

export async function bootstrapAdminUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ created: boolean }> {
  const existing = await prisma.adminUser.findUnique({ where: { email: input.email } });
  if (existing) return { created: false };

  await prisma.adminUser.create({
    data: {
      email: input.email,
      name: input.name ?? 'Administrator',
      passwordHash: hashPassword(input.password),
    },
  });
  return { created: true };
}

export async function loginAdmin(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !verifyPassword(input.password, admin.passwordHash)) {
    await writeAuditLog({
      adminEmail: email,
      action: 'LOGIN_FAILED',
      details: { reason: 'invalid_credentials' },
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!admin.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAuditLog({
    adminEmail: admin.email,
    action: 'LOGIN',
    entityType: 'admin_user',
    entityId: admin.id,
  });

  const token = signAdminToken({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  };
}

export async function changeAdminPassword(input: {
  adminId: string;
  currentPassword: string;
  newPassword: string;
}) {
  if (input.newPassword.length < 8) {
    throw new BadRequestError('New password must be at least 8 characters');
  }
  const admin = await prisma.adminUser.findUnique({ where: { id: input.adminId } });
  if (!admin) throw new UnauthorizedError('Admin not found');
  if (!verifyPassword(input.currentPassword, admin.passwordHash)) {
    throw new UnauthorizedError('Current password is incorrect');
  }
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: hashPassword(input.newPassword) },
  });
  await writeAuditLog({
    adminEmail: admin.email,
    action: 'CHANGE_PASSWORD',
    entityType: 'admin_user',
    entityId: admin.id,
  });
}

export async function getAdminSession(adminId: string) {
  return prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true, role: true, lastLoginAt: true },
  });
}