/** Rate limiting middleware factories. */
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const publicRateLimiter = rateLimit({
  windowMs: env.rateLimitPublicWindowMs,
  limit: env.rateLimitPublicMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' },
  },
});

// Dedicated, more generous bucket for the 1-Tap SOS route. The general public
// limiter is shared across every citizen endpoint, so during congestion a
// burst of shelter/alert polling could exhaust it and start rejecting actual
// SOS submissions with 429 — unacceptable for a life-safety endpoint.
export const sosRateLimiter = rateLimit({
  windowMs: env.rateLimitPublicWindowMs,
  limit: Math.max(env.rateLimitPublicMax, 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many SOS requests from this network. Please try again shortly.' },
  },
});

export const adminRateLimiter = rateLimit({
  windowMs: env.rateLimitAdminWindowMs,
  limit: env.rateLimitAdminMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' },
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many uploads. Try again later.' },
  },
});