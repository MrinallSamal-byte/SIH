import { describe, it, expect } from 'vitest';
import { signAdminToken, verifyAdminToken, signVolunteerToken, verifyVolunteerToken } from '../src/lib/jwt.js';
import { UnauthorizedError } from '../src/lib/errors.js';

describe('JWT role validation', () => {
  it('allows valid admin tokens in verifyAdminToken', () => {
    const token = signAdminToken({ sub: 'admin-1', email: 'admin@aapdasetu.org', role: 'admin' });
    const decoded = verifyAdminToken(token);
    expect(decoded.sub).toBe('admin-1');
    expect(decoded.email).toBe('admin@aapdasetu.org');
    expect(decoded.role).toBe('admin');
  });

  it('allows valid volunteer tokens in verifyVolunteerToken', () => {
    const token = signVolunteerToken({ sub: 'vol-1', name: 'John Doe', role: 'volunteer' });
    const decoded = verifyVolunteerToken(token);
    expect(decoded.sub).toBe('vol-1');
    expect(decoded.name).toBe('John Doe');
    expect(decoded.role).toBe('volunteer');
  });

  it('rejects volunteer token in verifyAdminToken', () => {
    const token = signVolunteerToken({ sub: 'vol-1', name: 'John Doe', role: 'volunteer' });
    expect(() => verifyAdminToken(token)).toThrow(UnauthorizedError);
  });

  it('rejects admin token in verifyVolunteerToken', () => {
    const token = signAdminToken({ sub: 'admin-1', email: 'admin@aapdasetu.org', role: 'admin' });
    expect(() => verifyVolunteerToken(token)).toThrow(UnauthorizedError);
  });
});
