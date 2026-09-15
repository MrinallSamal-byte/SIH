import { describe, it, expect } from 'vitest';
import {
  normalizeOtpPhone,
  isValidOtpPhone,
  generateOtpCode,
  sha256Hex,
  safeEqualHex,
  splitVerificationToken,
} from '../src/services/otp.service.js';

describe('otp phone normalization', () => {
  it('strips country codes and formatting to last-10 digits', () => {
    expect(normalizeOtpPhone('+91-98765 43210')).toBe('9876543210');
    expect(normalizeOtpPhone('09876543210')).toBe('9876543210');
    expect(normalizeOtpPhone('9876543210')).toBe('9876543210');
  });

  it('validates 10-digit numbers only', () => {
    expect(isValidOtpPhone('9876543210')).toBe(true);
    expect(isValidOtpPhone('12345')).toBe(false);
    expect(isValidOtpPhone('')).toBe(false);
    expect(isValidOtpPhone('abcdefghij')).toBe(false);
  });
});

describe('otp code generation', () => {
  it('produces zero-padded 6-digit codes', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe('hashing helpers', () => {
  it('sha256Hex is deterministic and 64 hex chars', () => {
    expect(sha256Hex('123456')).toBe(sha256Hex('123456'));
    expect(sha256Hex('123456')).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex('123456')).not.toBe(sha256Hex('123457'));
  });

  it('safeEqualHex compares in constant time without throwing', () => {
    expect(safeEqualHex('abc', 'abc')).toBe(true);
    expect(safeEqualHex('abc', 'abd')).toBe(false);
    expect(safeEqualHex('abc', 'abcd')).toBe(false);
    expect(safeEqualHex('', '')).toBe(true);
  });
});

describe('verification token parsing', () => {
  it('splits valid <id>.<secret> tokens', () => {
    const secret = 'a'.repeat(64);
    expect(splitVerificationToken(`550e8400-e29b-41d4-a716-446655440000.${secret}`)).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      secret,
    });
  });

  it('rejects malformed tokens', () => {
    expect(splitVerificationToken('')).toBeNull();
    expect(splitVerificationToken('no-dot-here')).toBeNull();
    expect(splitVerificationToken('.secret')).toBeNull();
    expect(splitVerificationToken('id.')).toBeNull();
    expect(splitVerificationToken('id.short')).toBeNull();
  });
});
