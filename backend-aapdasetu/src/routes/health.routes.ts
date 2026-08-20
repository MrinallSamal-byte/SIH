/** Health check endpoint. */
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { damageMlClient } from '../adapters/damageMl.client.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
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
});