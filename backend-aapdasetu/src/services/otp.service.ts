/**
 * SOS caller OTP challenge.
 *
 * Flow: POST /otp/request { phone } → 6-digit code (demo mode returns it in
 * the response; otherwise it is SMSed when a provider is configured) →
 * POST /otp/verify { requestId, phone, code } → single-use
 * `phoneOtpToken` (`<id>.<secret>`) → attach to SOS/report payloads as
 * `phoneOtpToken`. Report creation consumes the token and stamps
 * `reporterPhoneVerified`.
 *
 * Verification is OPTIONAL for SOS (life-safety first: an unverified SOS is
 * still dispatched) but verified callers skip the duplicate-review path and
 * give dispatchers a callback number they can trust.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { HttpError, BadRequestError, UnauthorizedError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { sendSmsBatch } from './sms.service.js';

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested in tests/otp.test.ts)
// ---------------------------------------------------------------------------

/** Canonical phone form: digits only, last 10 (strips +91 / 0 / formatting). */
export function normalizeOtpPhone(raw: string): string {
  return (raw ?? '').replace(/\D/g, '').slice(-10);
}

export function isValidOtpPhone(normalized: string): boolean {
  return /^\d{10}$/.test(normalized);
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Constant-time string comparison that never throws on length mismatch. */
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function splitVerificationToken(token: string): { id: string; secret: string } | null {
  if (typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot >= token.length - 1) return null;
  const id = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  if (!/^[0-9a-f-]{8,64}$/i.test(id) || !/^[0-9a-f]{16,128}$/i.test(secret)) return null;
  return { id, secret };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const OTP_REQUESTS_PER_PHONE_PER_HOUR = 3;
const VERIFICATION_TOKEN_TTL_MINUTES = 30;

export interface OtpRequestResult {
  requestId: string;
  phone: string;
  expiresAt: string;
  /** Present ONLY in demo mode (or when no SMS provider is configured in dev). */
  demoCode?: string;
  /** Whether the code was dispatched over SMS. */
  smsSent: boolean;
}

export async function requestOtp(input: { phone: string; purpose?: string }): Promise<OtpRequestResult> {
  const phone = normalizeOtpPhone(input.phone);
  if (!isValidOtpPhone(phone)) {
    throw new BadRequestError('Enter a valid 10-digit mobile number');
  }
  const purpose = input.purpose === 'volunteer_verify' ? 'volunteer_verify' : 'sos_verify';

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.otpRequest.count({
    where: { phone, purpose, createdAt: { gte: hourAgo } },
  });
  if (recent >= OTP_REQUESTS_PER_PHONE_PER_HOUR) {
    // 429 without a dedicated error class — HttpError carries status + code.
    throw new HttpError(429, 'Too many codes requested. Try again in an hour.', 'OTP_THROTTLED');
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60 * 1000);
  const row = await prisma.otpRequest.create({
    data: { phone, codeHash: sha256Hex(code), purpose, expiresAt },
  });

  // Opportunistic hygiene: expired rows are useless and PII-adjacent.
  void prisma.otpRequest
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});

  let smsSent = false;
  if (!env.otpDemoMode) {
    try {
      const res = await sendSmsBatch({
        to: [phone],
        text: `AapdaSetu verification code: ${code}. Valid ${env.otpTtlMinutes} min. Never share this code.`,
      });
      smsSent = res.sent > 0;
    } catch (err) {
      logger.warn('OTP SMS dispatch failed', { error: (err as Error).message });
    }
  }

  return {
    requestId: row.id,
    phone,
    expiresAt: expiresAt.toISOString(),
    // Demo mode exists so reviewers can exercise the flow without burning SMS
    // budget. Production MUST set OTP_DEMO_MODE=false (env default).
    ...(env.otpDemoMode ? { demoCode: code } : {}),
    smsSent,
  };
}

export interface OtpVerifyResult {
  verificationToken: string;
  phone: string;
  expiresAt: string;
}

export async function verifyOtp(input: { requestId: string; phone: string; code: string }): Promise<OtpVerifyResult> {
  const phone = normalizeOtpPhone(input.phone);
  const code = (input.code ?? '').replace(/\D/g, '');
  if (!/^[0-9a-f-]{8,64}$/i.test(input.requestId) || code.length !== 6) {
    throw new UnauthorizedError('Invalid code');
  }

  const row = await prisma.otpRequest.findUnique({ where: { id: input.requestId } });
  // Compare unconditionally-shaped failure: unknown id and wrong code both
  // surface as generic 401 so requestIds cannot be probed.
  if (!row || row.consumed || row.expiresAt.getTime() < Date.now() || !safeEqualHex(row.phone, phone)) {
    throw new UnauthorizedError('Invalid or expired code');
  }
  if (row.attempts >= env.otpMaxAttempts) {
    await prisma.otpRequest.update({ where: { id: row.id }, data: { consumed: true } }).catch(() => {});
    throw new UnauthorizedError('Too many attempts. Request a new code.');
  }

  if (!safeEqualHex(row.codeHash, sha256Hex(code))) {
    await prisma.otpRequest.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } }).catch(() => {});
    throw new UnauthorizedError('Invalid code');
  }

  const secret = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000);
  const verification = await prisma.phoneVerification.create({
    data: { phone: row.phone, tokenHash: sha256Hex(secret), expiresAt },
  });
  await prisma.otpRequest.update({ where: { id: row.id }, data: { consumed: true, attempts: { increment: 1 } } }).catch(() => {});

  return {
    verificationToken: `${verification.id}.${secret}`,
    phone: row.phone,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Single-use consumption for report creation. Returns the verified normalized
 * phone on success, null on any failure (caller treats null as unverified —
 * SOS is never blocked by this).
 */
export async function consumePhoneToken(token: string | null | undefined, phone: string | null | undefined): Promise<string | null> {
  try {
    const parts = splitVerificationToken(token ?? '');
    const normalized = normalizeOtpPhone(phone ?? '');
    if (!parts || !isValidOtpPhone(normalized)) return null;

    const row = await prisma.phoneVerification.findUnique({ where: { id: parts.id } });
    if (
      !row ||
      row.consumedAt ||
      row.expiresAt.getTime() < Date.now() ||
      !safeEqualHex(row.phone, normalized) ||
      !safeEqualHex(row.tokenHash, sha256Hex(parts.secret))
    ) {
      return null;
    }
    await prisma.phoneVerification.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return row.phone;
  } catch {
    return null;
  }
}
