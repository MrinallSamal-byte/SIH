/** Volunteer self-service controllers. */
import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  loginVolunteer,
  getVolunteerProfile,
  listVolunteerTasks,
  resolveAssignedTask,
  updateVolunteerAvailability,
} from '../services/volunteer-auth.service.js';

export const volunteerLoginSchema = z.object({
  phone: z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits'),
  accessCode: z.string().min(1),
});

export const taskIdParamsSchema = z.object({ id: z.string().uuid() });

export const reportStatusSchema = z.object({ status: z.literal('resolved') });

export const volunteerStatusSchema = z.object({ status: z.enum(['available', 'offline']) });

export async function volunteerLoginHandler(req: Request, res: Response): Promise<void> {
  const result = await loginVolunteer(req.body);
  res.json({ success: true, data: result });
}

export async function volunteerMeHandler(req: Request, res: Response): Promise<void> {
  const volunteer = await getVolunteerProfile(req.volunteer!.sub);
  res.json({ success: true, data: volunteer });
}

export async function volunteerTasksHandler(req: Request, res: Response): Promise<void> {
  const tasks = await listVolunteerTasks(req.volunteer!.sub);
  res.json({ success: true, data: tasks });
}

export async function volunteerResolveTaskHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const report = await resolveAssignedTask({ id, volunteerId: req.volunteer!.sub });
  res.json({ success: true, data: report });
}

export async function volunteerUpdateStatusHandler(req: Request, res: Response): Promise<void> {
  const volunteer = await updateVolunteerAvailability({
    id: req.volunteer!.sub,
    status: req.body.status,
  });
  res.json({ success: true, data: volunteer });
}
