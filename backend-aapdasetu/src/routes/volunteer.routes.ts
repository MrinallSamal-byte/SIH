/** Volunteer self-service routes (volunteer JWT protected). */
import { Router } from 'express';
import { validateBody, validateParams } from '../middleware/validate.js';
import { loginRateLimiter, publicRateLimiter } from '../middleware/rateLimit.js';
import { requireVolunteer } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as c from '../controllers/volunteer.controller.js';

export const volunteerRouter = Router();

volunteerRouter.post(
  '/auth/login',
  loginRateLimiter,
  validateBody(c.volunteerLoginSchema),
  asyncHandler(c.volunteerLoginHandler),
);

volunteerRouter.get('/me', publicRateLimiter, requireVolunteer, asyncHandler(c.volunteerMeHandler));

volunteerRouter.patch(
  '/me/status',
  publicRateLimiter,
  requireVolunteer,
  validateBody(c.volunteerStatusSchema),
  asyncHandler(c.volunteerUpdateStatusHandler),
);

volunteerRouter.get(
  '/tasks',
  publicRateLimiter,
  requireVolunteer,
  asyncHandler(c.volunteerTasksHandler),
);

volunteerRouter.patch(
  '/tasks/:id/report-status',
  publicRateLimiter,
  requireVolunteer,
  validateParams(c.taskIdParamsSchema),
  validateBody(c.reportStatusSchema),
  asyncHandler(c.volunteerResolveTaskHandler),
);
