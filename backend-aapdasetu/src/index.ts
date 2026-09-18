/** Server entrypoint. */
import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { realtimeHub } from './realtime/hub.js';
import { bootstrapAdminUser } from './services/auth.service.js';

async function main() {
  await bootstrapAdminUser({
    email: env.adminEmail,
    password: env.adminPassword,
    name: 'AapdaSetu Administrator',
  }).then((r) => {
    if (r.created) logger.info('Bootstrapped admin user');
  });

  const app = createApp();
  const server = http.createServer(app);

  realtimeHub.attach(server, env.realtimePath);

  server.listen(env.port, env.host, () => {
    logger.info(`AapdaSetu backend listening on http://${env.host}:${env.port}`);
    logger.info(`Realtime WebSocket endpoint: ws://${env.host}:${env.port}${env.realtimePath}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    realtimeHub.closeAll();
    server.close(() => {
      void prisma.$disconnect().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled promise rejection', { message: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { message: err.message, stack: err.stack });
    process.exit(1);
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', { message: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});