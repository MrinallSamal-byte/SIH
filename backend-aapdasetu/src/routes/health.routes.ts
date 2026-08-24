/** Health check endpoints. */
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { damageMlClient } from '../adapters/damageMl.client.js';
import { requireAdmin } from '../middleware/auth.js';
import { publicRateLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const healthRouter = Router();

healthRouter.get('/health/deep', publicRateLimiter, requireAdmin, asyncHandler(async (_req, res) => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'up' : 'down',
      mlService: await damageMlClient.health(),
    },
  });
}));

healthRouter.get('/health', publicRateLimiter, (_req, res) => {
  res.json({ status: 'ok' });
});
