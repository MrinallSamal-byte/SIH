import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireVolunteer } from '../src/middleware/auth.js';
import { signVolunteerToken } from '../src/lib/jwt.js';
import { prisma } from '../src/lib/prisma.js';
import { UnauthorizedError } from '../src/lib/errors.js';

describe('requireVolunteer middleware', () => {
  it('rejects request without authorization header', async () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    let nextError: unknown = null;
    const next: NextFunction = (err?: unknown) => {
      nextError = err;
    };

    await requireVolunteer(req, res, next);
    expect(nextError).toBeInstanceOf(UnauthorizedError);
    expect((nextError as UnauthorizedError).message).toBe('Missing authorization header');
  });

  it('validates volunteer existence in DB for valid token', async () => {
    const volunteerId = '00000000-0000-0000-0000-000000000001';
    const token = signVolunteerToken({ sub: volunteerId, name: 'Volunteer Test', role: 'volunteer' });

    vi.spyOn(prisma.volunteer, 'findUnique').mockResolvedValueOnce({
      id: volunteerId,
      name: 'Volunteer Test',
      phone: '1234567890',
      skills: [],
      latitude: null,
      longitude: null,
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = {} as Response;
    let calledNext = false;
    let nextError: unknown = null;
    const next: NextFunction = (err?: unknown) => {
      if (err) nextError = err;
      else calledNext = true;
    };

    await requireVolunteer(req, res, next);
    expect(calledNext).toBe(true);
    expect(nextError).toBeNull();
    expect(req.volunteer?.sub).toBe(volunteerId);
  });

  it('rejects token of non-existent volunteer', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000099';
    const token = signVolunteerToken({ sub: nonExistentId, name: 'Ghost', role: 'volunteer' });

    vi.spyOn(prisma.volunteer, 'findUnique').mockResolvedValueOnce(null);

    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = {} as Response;
    let nextError: unknown = null;
    const next: NextFunction = (err?: unknown) => {
      nextError = err;
    };

    await requireVolunteer(req, res, next);
    expect(nextError).toBeInstanceOf(UnauthorizedError);
    expect((nextError as UnauthorizedError).message).toBe('Volunteer account does not exist');
  });
});
