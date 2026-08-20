/** Express application assembly. */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Routes
  app.use('/api/v1', publicRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use(healthRouter);

  app.get('/', (_req, res) => {
    res.json({ success: true, data: { service: 'AapdaSetu Backend', version: '1.0.0', docs: '/docs/api-contract.md' } });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}