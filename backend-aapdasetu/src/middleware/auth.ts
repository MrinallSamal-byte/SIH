/** Admin & volunteer authentication middleware (Bearer JWT). */
import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken, verifyVolunteerToken, AdminTokenPayload, VolunteerTokenPayload } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
      volunteer?: VolunteerTokenPayload;
    }
  }
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing authorization header'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.admin = verifyAdminToken(token);
  } catch (err) {
    next(err);
    return;
  }
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: req.admin.sub },
      select: { id: true, isActive: true },
    });
    if (!admin || !admin.isActive) {
      next(new UnauthorizedError('Account is disabled'));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireVolunteer(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing authorization header'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.volunteer = verifyVolunteerToken(token);
  } catch (err) {
    next(err);
    return;
  }
  try {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: req.volunteer.sub },
      select: { id: true },
    });
    if (!volunteer) {
      next(new UnauthorizedError('Account no longer exists'));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
