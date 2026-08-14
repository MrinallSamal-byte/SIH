/** Admin controllers — alerts, analytics, audit, checkins, missing, damage, hazards. */
import type { Request, Response } from 'express';
import { createAlert, listAlerts } from '../services/alerts.service.js';
import { getAnalytics } from '../services/analytics.service.js';
import { listAuditLogs } from '../services/audit.service.js';
import { listCheckins } from '../services/checkins.service.js';
import { listMatches, reviewMatch } from '../services/missing.service.js';
import { listDamageAssessments, flagDuplicateAssessment } from '../services/damage.service.js';
import { listHazards, createHazard, updateHazardActive } from '../services/routes.service.js';

export async function adminCreateAlertHandler(req: Request, res: Response): Promise<void> {
  const alert = await createAlert({ ...req.body, adminEmail: req.admin!.email });
  res.status(201).json({ success: true, data: alert });
}

export async function adminListAlertsHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const alerts = await listAlerts(q as never);
  res.json({ success: true, data: alerts });
}

export async function adminAnalyticsHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const analytics = await getAnalytics(Number(q.rangeDays ?? 14));
  res.json({ success: true, data: analytics });
}

export async function adminAuditLogsHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const logs = await listAuditLogs(q as never);
  res.json({ success: true, data: logs });
}

export async function adminListCheckinsHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const checkins = await listCheckins(q as never);
  res.json({ success: true, data: checkins });
}

export async function adminListMatchesHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const matches = await listMatches(q as never);
  res.json({ success: true, data: matches });
}

export async function adminReviewMatchHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const match = await reviewMatch({ id, reviewedBy: req.admin!.email, ...req.body });
  res.json({ success: true, data: match });
}

export async function adminListDamageHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const assessments = await listDamageAssessments(q as never);
  res.json({ success: true, data: assessments });
}

export async function adminFlagDamageHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const assessment = await flagDuplicateAssessment(id, req.admin!.email);
  res.json({ success: true, data: assessment });
}

export async function adminListHazardsHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const hazards = await listHazards(q as never);
  res.json({ success: true, data: hazards });
}

export async function adminCreateHazardHandler(req: Request, res: Response): Promise<void> {
  const hazard = await createHazard({ ...req.body, adminEmail: req.admin!.email });
  res.status(201).json({ success: true, data: hazard });
}

export async function adminUpdateHazardHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const hazard = await updateHazardActive({ id, adminEmail: req.admin!.email, ...req.body });
  res.json({ success: true, data: hazard });
}