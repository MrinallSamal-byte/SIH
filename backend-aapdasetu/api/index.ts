/**
 * Vercel serverless entrypoint. The WebSocket hub stays dormant here
 * (frontend polls REST; no WS client exists) — safe no-op.
 */
// ponytail: serverless = per-request cold starts + no persistent WS;
// upgrade path: dedicated long-running host (Render/Railway/Fly) when
// realtime push matters.
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { bootstrapAdminUser } from '../src/services/auth.service.js';
import { logger } from '../src/lib/logger.js';

const app = createApp();

// src/index.ts (the long-running entry) bootstraps the admin account, but
// that file never runs on Vercel — without this, admin login 401s forever on
// a fresh database. bootstrapAdminUser is idempotent (checks for the row
// first), so firing it once per cold start is cheap and safe.
let bootstrapped = false;
void (async () => {
  if (bootstrapped) return;
  bootstrapped = true;
  // Same guard as prisma/seed.ts: never install the publicly-known default
  // admin password into a production database.
  if (env.isProduction && env.adminPassword === 'Admin@123') {
    logger.error('Admin bootstrap skipped — set a strong ADMIN_PASSWORD env var before deploying to production');
    return;
  }
  try {
    const result = await bootstrapAdminUser({
      email: env.adminEmail,
      password: env.adminPassword,
      name: 'AapdaSetu Administrator',
    });
    if (result.created) logger.info('Bootstrapped admin user (serverless)');
  } catch (err) {
    // Non-fatal: DB may not be migrated yet; login simply stays unavailable
    // until the bootstrap succeeds on a later cold start.
    logger.warn('Admin bootstrap skipped', { message: (err as Error).message });
  }
})();

export default app;
