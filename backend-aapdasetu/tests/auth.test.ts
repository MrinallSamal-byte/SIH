import { describe, it, expect, vi } from 'vitest';
import { getAdminSession } from '../src/services/auth.service.js';
import { prisma } from '../src/lib/prisma.js';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
    },
  },
}));

describe('getAdminSession', () => {
  it('returns active admin session without isActive property', async () => {
    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'SUPER_ADMIN',
      lastLoginAt: new Date(),
      isActive: true,
    };
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValueOnce(mockAdmin as never);

    const session = await getAdminSession('admin-123');

    expect(session).toEqual({
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'SUPER_ADMIN',
      lastLoginAt: mockAdmin.lastLoginAt,
    });
    expect(session).not.toHaveProperty('isActive');
  });

  it('returns null when admin account is deactivated (isActive = false)', async () => {
    const mockAdmin = {
      id: 'admin-456',
      email: 'disabled@example.com',
      name: 'Disabled Admin',
      role: 'OPERATOR',
      lastLoginAt: new Date(),
      isActive: false,
    };
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValueOnce(mockAdmin as never);

    const session = await getAdminSession('admin-456');

    expect(session).toBeNull();
  });

  it('returns null when admin user is not found', async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValueOnce(null as never);

    const session = await getAdminSession('non-existent');

    expect(session).toBeNull();
  });
});
