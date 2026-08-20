import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/crypto.js';

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

  it('safely handles dummy hash verification for non-existent users', () => {
    const dummyHash =
      'scrypt$16384$8$1$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    expect(verifyPassword('anyPassword', dummyHash)).toBe(false);
  });
});