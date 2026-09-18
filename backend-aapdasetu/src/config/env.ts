/**
 * Centralized environment configuration.
 * All secrets/credentials come from environment variables — never hardcoded.
 */
import 'dotenv/config';

const PROD_REQUIRED = new Set(['JWT_SECRET', 'ADMIN_PASSWORD', 'DATABASE_URL', 'VOLUNTEER_ACCESS_CODE']);

function required(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (process.env.NODE_ENV === 'production' && PROD_REQUIRED.has(name)) {
      throw new Error(`Missing required environment variable in production: ${name}`);
    }
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function number(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

/** Tri-state flag: explicit 'true'/'false' win, otherwise the default. */
function parseFlag(name: string, fallback: boolean): boolean {
  const raw = (process.env[name] ?? '').trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return fallback;
}

// Vercel serverless always sits behind exactly one proxy hop that sets
// x-forwarded-for. Without `trust proxy`, express-rate-limit v7 throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every request and the whole public
// API 500s — so default to 1 whenever we detect a Vercel runtime.
const VERCEL_RUNTIME = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  host: required('HOST', '0.0.0.0'),
  port: number('PORT', 4000),
  trustProxy: number('TRUST_PROXY', VERCEL_RUNTIME ? 1 : 0),

  databaseUrl: required('DATABASE_URL', 'postgresql://aapdasetu:aapdasetu@localhost:5432/aapdasetu?schema=public'),

  jwtSecret: required('JWT_SECRET', 'aapdasetu-dev-jwt-secret-key-32chars-min'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '12h'),

  adminEmail: required('ADMIN_EMAIL', 'admin@aapdasetu.org'),
  adminPassword: required('ADMIN_PASSWORD', 'Admin@123'),

  volunteerAccessCode: required('VOLUNTEER_ACCESS_CODE', 'aapdasetu-dev-volunteer-code'),

  openRouterApiKey: required('OPENROUTER_API_KEY', ''),
  openRouterBaseUrl: required('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
  openRouterModel: required('OPENROUTER_MODEL', 'meta-llama/llama-3.1-8b-instruct:free'),
  pfaEscapeMode: required('PFA_ESCAPE_MODE', 'strict'),

  damageMlBaseUrl: required('DAMAGE_ML_BASE_URL', 'http://localhost:8001'),
  damageMlTimeoutMs: number('DAMAGE_ML_TIMEOUT_MS', 30000),

  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  rateLimitPublicWindowMs: number('RATE_LIMIT_PUBLIC_WINDOW_MS', 60000),
  rateLimitPublicMax: number('RATE_LIMIT_PUBLIC_MAX', 60),
  rateLimitAdminWindowMs: number('RATE_LIMIT_ADMIN_WINDOW_MS', 900000),
  rateLimitAdminMax: number('RATE_LIMIT_ADMIN_MAX', 300),

  realtimePath: required('REALTIME_PATH', '/ws'),

  uploadMaxSizeBytes: number('UPLOAD_MAX_SIZE_MB', 15) * 1024 * 1024,

  // Optional broadcast providers — empty means the channel is skipped
  // (alert is still persisted to the DB / web channel).
  twilioAccountSid: required('TWILIO_ACCOUNT_SID', ''),
  twilioAuthToken: required('TWILIO_AUTH_TOKEN', ''),
  twilioFromNumber: required('TWILIO_FROM_NUMBER', ''),
  twilioDefaultToNumber: required('TWILIO_DEFAULT_TO_NUMBER', ''),
  whatsappCloudApiToken: required('WHATSAPP_CLOUD_API_TOKEN', ''),
  whatsappPhoneNumberId: required('WHATSAPP_PHONE_NUMBER_ID', ''),
  whatsappDefaultToNumber: required('WHATSAPP_DEFAULT_TO_NUMBER', ''),

  // Generic SMS gateway (government NIC/DLT or aggregator webhook).
  // `webhook` POSTs { to, text } as JSON with an optional bearer token;
  // `twilio` uses the Twilio credentials above; anything else disables SMS.
  smsProvider: required('SMS_PROVIDER', ''),
  smsWebhookUrl: required('SMS_WEBHOOK_URL', ''),
  smsWebhookToken: required('SMS_WEBHOOK_TOKEN', ''),

  // OTP challenge for SOS caller verification. Demo mode returns the code in
  // the request response so the flow is reviewable without an SMS provider.
  // NEVER enable demo mode in production (the code would leak to any caller).
  otpDemoMode: parseFlag('OTP_DEMO_MODE', process.env.NODE_ENV !== 'production'),
  otpTtlMinutes: number('OTP_TTL_MINUTES', 10),
  otpMaxAttempts: number('OTP_MAX_ATTEMPTS', 5),

  // Web Push (VAPID). Subscriptions are stored regardless; actual delivery
  // needs both keys plus a push sender worker (upgrade path documented in
  // push.service.ts).
  vapidPublicKey: required('VAPID_PUBLIC_KEY', ''),
  vapidSubject: required('VAPID_SUBJECT', 'mailto:admin@aapdasetu.org'),

  // RED escalation SLA: minutes an unassigned RED report may wait before the
  // sweep flags it.
  escalationThresholdMinutes: number('ESCALATION_THRESHOLD_MINUTES', 5),
};