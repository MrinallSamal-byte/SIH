import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../src/services/volunteer-auth.service.js';

describe('normalizePhone', () => {
  it('normalizes formatted phone numbers to 10 digits', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhone('+91-9876543210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
    expect(normalizePhone('9876543210')).toBe('9876543210');
  });

  it('handles short digit strings gracefully', () => {
    expect(normalizePhone('12345')).toBe('12345');
    expect(normalizePhone('')).toBe('');
  });
});
