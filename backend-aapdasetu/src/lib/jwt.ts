/** JWT helpers for admin sessions. */
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

export interface AdminTokenPayload {
  sub: string;
  email: string;
  name?: string | null;
  role: string;
}

export interface DecodedToken extends AdminTokenPayload {
  iat?: number;
  exp?: number;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAdminToken(token: string): DecodedToken {
  try {
    // Pin the algorithm — hardening against cross-algorithm confusion if the
    // secret format ever changes.
    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as DecodedToken;
    if (!decoded.sub || !decoded.email) throw new Error('missing claims');
    if (decoded.role !== 'admin') throw new Error('wrong role');
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired session token');
  }
}

export interface VolunteerTokenPayload {
  sub: string;
  name: string;
  role: 'volunteer';
}

export interface DecodedVolunteerToken extends VolunteerTokenPayload {
  iat?: number;
  exp?: number;
}

export function signVolunteerToken(payload: VolunteerTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyVolunteerToken(token: string): DecodedVolunteerToken {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as DecodedVolunteerToken;
    if (!decoded.sub || decoded.role !== 'volunteer') throw new Error('missing claims');
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired session token');
  }
}