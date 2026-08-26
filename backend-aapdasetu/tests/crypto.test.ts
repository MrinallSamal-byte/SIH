import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from '../src/lib/crypto.js';

describe('password hashing (scrypt)', () => {
  it('hashes and verifies a password', () => {
    const hash = hashPassword('Admin@123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('Admin@123', hash)).toBe(true);
  });

  it('rejects wrong passwords', () => {
    const hash = hashPassword('Admin@123');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces unique salts', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('handles malformed or invalid hash formats safely without throwing', () => {
    expect(verifyPassword('password', 'invalid_format')).toBe(false);
    expect(verifyPassword('password', 'scrypt$invalid$8$1$abc$def')).toBe(false);
    expect(verifyPassword('password', 'scrypt$999999999$8$1$abc$def')).toBe(false);
    expect(verifyPassword('password', 'scrypt$16384$8$1$$')).toBe(false);
  });

  it('rejects verification against DUMMY_PASSWORD_HASH safely', () => {
    expect(verifyPassword('password', DUMMY_PASSWORD_HASH)).toBe(false);
  });
});