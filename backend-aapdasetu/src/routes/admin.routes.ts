/** Admin command-center routes (JWT protected). */
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { adminRateLimiter, loginRateLimiter } from '../middleware/rateLimit.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as schemas from '../schemas/index.js';
import * as core from '../controllers/admin.core.controller.js';
import * as res from '../controllers/admin.resources.controller.js';
import * as sys from '../controllers/admin.system.controller.js';

export const adminRouter = Router();

// ---- Auth ----
adminRouter.post('/auth/login', loginRateLimiter, validateBody(schemas.adminLoginSchema), asyncHandler(core.adminLoginHandler));

// Everything below requires an admin session (guards must sit ABOVE /auth/me and /auth/change-password).
adminRouter.use(requireAdmin);
adminRouter.use(adminRateLimiter);

adminRouter.get('/auth/me', asyncHandler(core.adminMeHandler));
adminRouter.post('/auth/change-password', validateBody(schemas.changePasswordSchema), asyncHandler(core.adminChangePasswordHandler));

// ---- Overview / KPI ----
adminRouter.get('/overview', asyncHandler(core.adminOverviewHandler));

// ---- Reports & dispatch ----
adminRouter.get('/reports', validateQuery(schemas.listReportsQuerySchema), asyncHandler(core.adminListReportsHandler));
adminRouter.get('/reports/:id', validateParams(schemas.idParamsSchema), asyncHandler(core.adminGetReportHandler));
adminRouter.patch('/reports/:id/status', validateParams(schemas.idParamsSchema), validateBody(schemas.updateReportStatusSchema), asyncHandler(core.adminUpdateReportStatusHandler));
adminRouter.post('/reports/:id/assign', validateParams(schemas.idParamsSchema), validateBody(schemas.assignDispatchSchema), asyncHandler(core.adminAssignHandler));
adminRouter.post('/reports/:id/unassign', validateParams(schemas.idParamsSchema), validateBody(schemas.unassignDispatchSchema), asyncHandler(core.adminUnassignHandler));

// ---- Volunteers ----
adminRouter.get('/volunteers', validateQuery(schemas.listVolunteersQuerySchema), asyncHandler(res.adminListVolunteersHandler));
adminRouter.post('/volunteers', validateBody(schemas.createVolunteerSchema), asyncHandler(res.adminCreateVolunteerHandler));
adminRouter.patch('/volunteers/:id', validateParams(schemas.idParamsSchema), validateBody(schemas.updateVolunteerSchema), asyncHandler(res.adminUpdateVolunteerHandler));
adminRouter.patch('/volunteers/:id/status', validateParams(schemas.idParamsSchema), validateBody(schemas.updateVolunteerStatusSchema), asyncHandler(res.adminUpdateVolunteerStatusHandler));

// ---- Shelters ----
adminRouter.get('/shelters', validateQuery(schemas.listSheltersQuerySchema), asyncHandler(res.adminListSheltersHandler));
adminRouter.get('/shelters/:id', validateParams(schemas.idParamsSchema), asyncHandler(res.adminGetShelterHandler));
adminRouter.post('/shelters', validateBody(schemas.createShelterSchema), asyncHandler(res.adminCreateShelterHandler));
adminRouter.patch('/shelters/:id', validateParams(schemas.idParamsSchema), validateBody(schemas.updateShelterSchema), asyncHandler(res.adminUpdateShelterHandler));

// ---- Agencies ----
adminRouter.get('/agencies', validateQuery(schemas.adminAgencyQuerySchema), asyncHandler(res.adminListAgenciesHandler));
adminRouter.post('/agencies', validateBody(schemas.createAgencySchema), asyncHandler(res.adminCreateAgencyHandler));
adminRouter.patch('/agencies/:id', validateParams(schemas.idParamsSchema), validateBody(schemas.updateAgencySchema), asyncHandler(res.adminUpdateAgencyHandler));

// ---- Resources ----
adminRouter.get('/resources', validateQuery(schemas.adminResourceQuerySchema), asyncHandler(res.adminListResourcesHandler));
adminRouter.post('/resources', validateBody(schemas.createResourceSchema), asyncHandler(res.adminCreateResourceHandler));
adminRouter.patch('/resources/:id/quantity', validateParams(schemas.idParamsSchema), validateBody(schemas.updateResourceQuantitySchema), asyncHandler(res.adminUpdateResourceQuantityHandler));

// ---- Alerts ----
adminRouter.get('/alerts', validateQuery(schemas.adminAlertQuerySchema), asyncHandler(sys.adminListAlertsHandler));
adminRouter.post('/alerts', validateBody(schemas.createAlertSchema), asyncHandler(sys.adminCreateAlertHandler));

// ---- Analytics ----
adminRouter.get('/analytics', validateQuery(schemas.analyticsQuerySchema), asyncHandler(sys.adminAnalyticsHandler));

// ---- Audit logs ----
adminRouter.get('/audit-logs', validateQuery(schemas.paginationQuerySchema), asyncHandler(sys.adminAuditLogsHandler));

// ---- Safety check-ins ----
adminRouter.get('/checkins', validateQuery(schemas.paginationQuerySchema.partial()), asyncHandler(sys.adminListCheckinsHandler));

// ---- Missing person matches ----
adminRouter.get('/missing/matches', validateQuery(schemas.missingMatchQuerySchema), asyncHandler(sys.adminListMatchesHandler));
adminRouter.post('/missing/matches/:id/review', validateParams(schemas.idParamsSchema), validateBody(schemas.reviewMatchSchema), asyncHandler(sys.adminReviewMatchHandler));

// ---- Damage assessments ----
adminRouter.get('/damage-assessments', validateQuery(schemas.paginationQuerySchema), asyncHandler(sys.adminListDamageHandler));
adminRouter.post('/damage-assessments/:id/flag', validateParams(schemas.idParamsSchema), asyncHandler(sys.adminFlagDamageHandler));

// ---- Route hazards (safe routes admin) ----
adminRouter.get('/hazards', validateQuery(schemas.adminHazardQuerySchema), asyncHandler(sys.adminListHazardsHandler));
adminRouter.post('/hazards', validateBody(schemas.createHazardSchema), asyncHandler(sys.adminCreateHazardHandler));
adminRouter.patch('/hazards/:id', validateParams(schemas.idParamsSchema), validateBody(schemas.updateHazardSchema), asyncHandler(sys.adminUpdateHazardHandler));

// ---- Missing-persons registry (admin) ----
adminRouter.patch(
  '/missing-persons/:id',
  validateParams(schemas.idParamsSchema),
  validateBody(schemas.updateMissingPersonSchema),
  asyncHandler(sys.adminUpdateMissingPersonHandler),
);

// ---- Communications broadcast ----
adminRouter.post(
  '/communications/broadcast',
  validateBody(schemas.broadcastSchema),
  asyncHandler(sys.adminBroadcastHandler),
);

// ---- System status (read-only integration truth) ----
adminRouter.get('/system/status', asyncHandler(sys.adminSystemStatusHandler));