import { describe, it, expect, vi } from 'vitest';
import { realtimeHub } from '../src/realtime/hub.js';
import { signAdminToken } from '../src/lib/jwt.js';
import { prisma } from '../src/lib/prisma.js';

describe('RealtimeHub authorization', () => {
  it('denies admin authorization if the admin account is disabled (isActive: false)', async () => {
    const token = signAdminToken({
      sub: 'disabled-admin-id',
      email: 'disabled@aapdasetu.org',
      role: 'admin',
    });

    vi.spyOn(prisma.adminUser, 'findUnique').mockResolvedValueOnce({
      id: 'disabled-admin-id',
      email: 'disabled@aapdasetu.org',
      name: 'Disabled Admin',
      passwordHash: 'scrypt$...',
      role: 'admin',
      isActive: false,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const hasAuth = await (realtimeHub as unknown as { hasAdminAuth: (h: string) => Promise<boolean> }).hasAdminAuth(
      `Bearer ${token}`,
    );

    expect(hasAuth).toBe(false);
  });

  it('allows admin authorization if the admin account is active (isActive: true)', async () => {
    const token = signAdminToken({
      sub: 'active-admin-id',
      email: 'admin@aapdasetu.org',
      role: 'admin',
    });

    vi.spyOn(prisma.adminUser, 'findUnique').mockResolvedValueOnce({
      id: 'active-admin-id',
      email: 'admin@aapdasetu.org',
      name: 'Active Admin',
      passwordHash: 'scrypt$...',
      role: 'admin',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const hasAuth = await (realtimeHub as unknown as { hasAdminAuth: (h: string) => Promise<boolean> }).hasAdminAuth(
      `Bearer ${token}`,
    );

    expect(hasAuth).toBe(true);
  });

  it('denies admin authorization for invalid tokens or non-admin tokens', async () => {
    const hasAuthInvalid = await (
      realtimeHub as unknown as { hasAdminAuth: (h: string) => Promise<boolean> }
    ).hasAdminAuth('Bearer invalid-token');
    expect(hasAuthInvalid).toBe(false);

    const hasAuthNoBearer = await (
      realtimeHub as unknown as { hasAdminAuth: (h: string) => Promise<boolean> }
    ).hasAdminAuth('invalid-header');
    expect(hasAuthNoBearer).toBe(false);
  });
});
