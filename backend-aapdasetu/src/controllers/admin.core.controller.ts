/** Admin controllers — auth, overview, reports & dispatch. */
import type { Request, Response } from 'express';
import { loginAdmin, getAdminSession, changeAdminPassword } from '../services/auth.service.js';
import { getOverview } from '../services/overview.service.js';
import {
  listReports,
  getReportById,
  updateReportStatus,
  assignDispatch,
  unassignDispatch,
} from '../services/reports.service.js';
import { UnauthorizedError } from '../lib/errors.js';

export async function adminLoginHandler(req: Request, res: Response): Promise<void> {
  const result = await loginAdmin(req.body);
  res.json({ success: true, data: result });
}

export async function adminMeHandler(req: Request, res: Response): Promise<void> {
  const session = await getAdminSession(req.admin!.sub);
  if (!session) throw new UnauthorizedError('Session no longer valid');
  res.json({ success: true, data: session });
}

export async function adminChangePasswordHandler(req: Request, res: Response): Promise<void> {
  await changeAdminPassword({
    adminId: req.admin!.sub,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });
  res.json({ success: true, data: { message: 'Password updated' } });
}

export async function adminOverviewHandler(_req: Request, res: Response): Promise<void> {
  const overview = await getOverview();
  res.json({ success: true, data: overview });
}

export async function adminListReportsHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const reports = await listReports(q as never);
  res.json({ success: true, data: reports });
}

export async function adminGetReportHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const report = await getReportById(id);
  res.json({ success: true, data: report });
}

export async function adminUpdateReportStatusHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const report = await updateReportStatus({ id, adminEmail: req.admin!.email, ...req.body });
  res.json({ success: true, data: report });
}

export async function adminAssignHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const report = await assignDispatch({ id, adminEmail: req.admin!.email, ...req.body });
  res.json({ success: true, data: report });
}

export async function adminUnassignHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const report = await unassignDispatch({ id, adminEmail: req.admin!.email, ...req.body });
  res.json({ success: true, data: report });
}