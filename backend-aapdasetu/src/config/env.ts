/**
 * Centralized environment configuration.
 * All secrets/credentials come from environment variables — never hardcoded.
 */
import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
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

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  host: required('HOST', '0.0.0.0'),
  port: number('PORT', 4000),

  databaseUrl: required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/aapdasetu'),

  jwtSecret: required('JWT_SECRET', 'aapdasetu-dev-jwt-secret-key-32chars-min'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '12h'),

  adminEmail: required('ADMIN_EMAIL', 'admin@aapdasetu.org'),
  adminPassword: required('ADMIN_PASSWORD', 'Admin@123'),

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
};