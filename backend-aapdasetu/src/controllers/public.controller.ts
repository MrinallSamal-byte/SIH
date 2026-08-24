/** Public (zero-auth) citizen controllers. */
import type { Request, Response } from 'express';
import {
  createSosReport,
  createIncidentReport,
  getReportByTrackingId,
  serializePublicTracking,
} from '../services/reports.service.js';
import { createCheckin } from '../services/checkins.service.js';
import { findNearbyShelters, listShelters } from '../services/shelters.service.js';
import { listActiveAlerts } from '../services/alerts.service.js';
import { getPfaReply, isOpenRouterConfigured } from '../services/pfa.service.js';
import { assessDamage } from '../services/damage.service.js';
import { findMissingPersonMatches } from '../services/missing.service.js';
import { listActiveHazards, computeSafeReroute } from '../services/routes.service.js';
import { listMissingPersons, createMissingPerson } from '../services/missing-persons.service.js';

export async function sosHandler(req: Request, res: Response): Promise<void> {
  const result = await createSosReport(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function reportHandler(req: Request, res: Response): Promise<void> {
  const result = await createIncidentReport(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function trackingHandler(req: Request, res: Response): Promise<void> {
  const { trackingId } = (req as Request & { validatedParams: { trackingId: string } }).validatedParams;
  const report = await getReportByTrackingId(trackingId);
  // ponytail: public tracking payload only — no relations/PII leak via includeRelations
  res.json({ success: true, data: serializePublicTracking(report) });
}

export async function checkinHandler(req: Request, res: Response): Promise<void> {
  const checkin = await createCheckin(req.body);
  res.status(201).json({ success: true, data: checkin });
}

export async function nearbySheltersHandler(req: Request, res: Response): Promise<void> {
  const query = (req as Request & { validatedQuery: { latitude: number; longitude: number; radiusKm?: number } }).validatedQuery;
  const shelters = await findNearbyShelters(query);
  res.json({ success: true, data: shelters });
}

export async function publicSheltersHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const shelters = await listShelters(q as never);
  res.json({ success: true, data: shelters });
}

export async function publicAlertsHandler(_req: Request, res: Response): Promise<void> {
  const alerts = await listActiveAlerts();
  res.json({ success: true, data: alerts });
}

export async function pfaChatHandler(req: Request, res: Response): Promise<void> {
  const { message, history } = req.body;
  const reply = await getPfaReply(message, history);
  res.json({ success: true, data: reply });
}

export async function pfaHealthHandler(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: { openRouterConfigured: isOpenRouterConfigured() } });
}

export async function damageAssessmentHandler(req: Request, res: Response): Promise<void> {
  const result = await assessDamage(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function missingMatchesHandler(req: Request, res: Response): Promise<void> {
  const { reportId, threshold } = req.body;
  const matches = await findMissingPersonMatches({ reportId, threshold });
  res.json({ success: true, data: matches });
}

export async function safeRouteHazardsHandler(_req: Request, res: Response): Promise<void> {
  const hazards = await listActiveHazards();
  res.json({ success: true, data: hazards });
}

export async function safeRerouteHandler(req: Request, res: Response): Promise<void> {
  const result = await computeSafeReroute(req.body);
  res.json({ success: true, data: result });
}

export async function listMissingPersonsHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const persons = await listMissingPersons(q as never);
  res.json({ success: true, data: persons });
}

export async function createMissingPersonHandler(req: Request, res: Response): Promise<void> {
  const person = await createMissingPerson(req.body);
  res.status(201).json({ success: true, data: person });
}