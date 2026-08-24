/**
 * Password hashing using Node's built-in scrypt (no native deps).
 * Format: scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384;
const r = 8;
const p = 1;
const KEYLEN = 64;

const MAX_N = 2 ** 17;
const MAX_R = 16;
const MAX_P = 4;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEYLEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const parsedN = Number(nStr);
  const parsedR = Number(rStr);
  const parsedP = Number(pStr);
  if (
    !Number.isSafeInteger(parsedN) ||
    parsedN < 2 ||
    parsedN > MAX_N ||
    !Number.isSafeInteger(parsedR) ||
    parsedR < 1 ||
    parsedR > MAX_R ||
    !Number.isSafeInteger(parsedP) ||
    parsedP < 1 ||
    parsedP > MAX_P
  ) {
    throw new Error('Invalid scrypt parameters in stored hash');
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(password, salt, expected.length, {
    N: parsedN,
    r: parsedR,
    p: parsedP,
  });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}