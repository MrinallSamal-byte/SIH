import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireVolunteer } from '../src/middleware/auth.js';
import { signVolunteerToken } from '../src/lib/jwt.js';
import { prisma } from '../src/lib/prisma.js';
import { UnauthorizedError } from '../src/lib/errors.js';

describe('requireVolunteer middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing authorization header', async () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    let errorPassed: unknown;
    const next: NextFunction = (err) => {
      errorPassed = err;
    };

    await requireVolunteer(req, res, next);
    expect(errorPassed).toBeInstanceOf(UnauthorizedError);
    expect((errorPassed as UnauthorizedError).message).toBe('Missing authorization header');
  });

  it('rejects invalid or expired token', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } } as Request;
    const res = {} as Response;
    let errorPassed: unknown;
    const next: NextFunction = (err) => {
      errorPassed = err;
    };

    await requireVolunteer(req, res, next);
    expect(errorPassed).toBeInstanceOf(UnauthorizedError);
    expect((errorPassed as UnauthorizedError).message).toBe('Invalid or expired session token');
  });

  it('rejects if volunteer account no longer exists in DB', async () => {
    const token = signVolunteerToken({
      sub: 'vol-deleted-id',
      name: 'Deleted Volunteer',
      role: 'volunteer',
    });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = {} as Response;
    let errorPassed: unknown;
    const next: NextFunction = (err) => {
      errorPassed = err;
    };

    vi.spyOn(prisma.volunteer, 'findUnique').mockResolvedValue(null as never);

    await requireVolunteer(req, res, next);
    expect(errorPassed).toBeInstanceOf(UnauthorizedError);
    expect((errorPassed as UnauthorizedError).message).toBe('Account no longer exists');
  });

  it('allows access for valid active volunteer in DB', async () => {
    const token = signVolunteerToken({
      sub: 'vol-valid-id',
      name: 'Active Volunteer',
      role: 'volunteer',
    });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = {} as Response;
    let nextCalled = false;
    let errorPassed: unknown;
    const next: NextFunction = (err) => {
      if (err) errorPassed = err;
      else nextCalled = true;
    };

    vi.spyOn(prisma.volunteer, 'findUnique').mockResolvedValue({ id: 'vol-valid-id' } as never);

    await requireVolunteer(req, res, next);
    expect(errorPassed).toBeUndefined();
    expect(nextCalled).toBe(true);
    expect(req.volunteer?.sub).toBe('vol-valid-id');
  });
});
