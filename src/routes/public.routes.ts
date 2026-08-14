/** Public citizen routes (zero authentication). */
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { publicRateLimiter, uploadRateLimiter } from '../middleware/rateLimit.js';
import * as c from '../controllers/public.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as schemas from '../schemas/index.js';

export const publicRouter = Router();

// 1-Tap SOS
publicRouter.post(
  '/sos',
  publicRateLimiter,
  validateBody(schemas.createSosSchema),
  asyncHandler(c.sosHandler),
);

// Full incident report form
publicRouter.post(
  '/reports',
  publicRateLimiter,
  validateBody(schemas.createReportSchema),
  asyncHandler(c.reportHandler),
);

// Incident tracking ID lookup
publicRouter.get(
  '/reports/track/:trackingId',
  publicRateLimiter,
  validateParams(schemas.trackingParamsSchema),
  asyncHandler(c.trackingHandler),
);

// Safety check-in
publicRouter.post(
  '/checkins',
  publicRateLimiter,
  validateBody(schemas.createCheckinSchema),
  asyncHandler(c.checkinHandler),
);

// Nearby shelter finder (Haversine)
publicRouter.get(
  '/shelters/nearby',
  publicRateLimiter,
  validateQuery(schemas.nearbySheltersSchema),
  asyncHandler(c.nearbySheltersHandler),
);

// Live public alerts
publicRouter.get('/alerts', publicRateLimiter, asyncHandler(c.publicAlertsHandler));

// PFA chatbot (OpenRouter LLM)
publicRouter.post('/pfa/chat', publicRateLimiter, validateBody(schemas.pfaChatSchema), asyncHandler(c.pfaChatHandler));
publicRouter.get('/pfa/health', publicRateLimiter, asyncHandler(c.pfaHealthHandler));

// Crowdsourced damage assessment (anti-fraud)
publicRouter.post(
  '/damage-assessment',
  uploadRateLimiter,
  validateBody(schemas.damageAssessmentSchema),
  asyncHandler(c.damageAssessmentHandler),
);

// Missing person deterministic matching
publicRouter.post(
  '/missing/matches',
  publicRateLimiter,
  validateBody(schemas.missingMatchSchema),
  asyncHandler(c.missingMatchesHandler),
);

// Safe routes / hazards
publicRouter.get('/safe-routes/hazards', publicRateLimiter, asyncHandler(c.safeRouteHazardsHandler));
publicRouter.post('/safe-routes/reroute', publicRateLimiter, validateBody(schemas.rerouteSchema), asyncHandler(c.safeRerouteHandler));