/** Server entrypoint. */
import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
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
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { message: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});