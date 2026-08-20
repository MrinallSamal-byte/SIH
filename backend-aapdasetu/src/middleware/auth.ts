/** Admin authentication middleware (Bearer JWT). */
import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken, AdminTokenPayload } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing authorization header'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch (err) {
    next(err);
  }
}