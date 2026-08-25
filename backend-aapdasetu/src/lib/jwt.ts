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
    const decoded = jwt.verify(token, env.jwtSecret) as DecodedToken;
    if (!decoded.sub || !decoded.email || decoded.role === 'volunteer') throw new Error('missing claims');
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
    const decoded = jwt.verify(token, env.jwtSecret) as DecodedVolunteerToken;
    if (!decoded.sub || decoded.role !== 'volunteer') throw new Error('missing claims');
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired session token');
  }
}