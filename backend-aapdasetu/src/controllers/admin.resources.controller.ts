/** Admin controllers — resources (volunteers, shelters, agencies, resources). */
import type { Request, Response } from 'express';
import {
  listVolunteers,
  createVolunteer,
  updateVolunteer,
  updateVolunteerStatus,
} from '../services/volunteers.service.js';
import {
  listShelters,
  getShelter,
  createShelter,
  updateShelter,
} from '../services/shelters.service.js';
import { listAgencies, createAgency, updateAgency } from '../services/agencies.service.js';
import { listResources, createResource, updateResourceQuantity } from '../services/resources.service.js';

export async function adminListVolunteersHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const volunteers = await listVolunteers(q as never);
  res.json({ success: true, data: volunteers });
}

export async function adminCreateVolunteerHandler(req: Request, res: Response): Promise<void> {
  const volunteer = await createVolunteer({ ...req.body, adminEmail: req.admin!.email });
  res.status(201).json({ success: true, data: volunteer });
}

export async function adminUpdateVolunteerHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const volunteer = await updateVolunteer({ id, adminEmail: req.admin!.email, ...req.body });
  res.json({ success: true, data: volunteer });
}

export async function adminUpdateVolunteerStatusHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const volunteer = await updateVolunteerStatus({ id, adminEmail: req.admin!.email, ...req.body });
  res.json({ success: true, data: volunteer });
}

export async function adminListSheltersHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const shelters = await listShelters(q as never);
  res.json({ success: true, data: shelters });
}

export async function adminGetShelterHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const shelter = await getShelter(id);
  res.json({ success: true, data: shelter });
}

export async function adminCreateShelterHandler(req: Request, res: Response): Promise<void> {
  const shelter = await createShelter({ ...req.body, adminEmail: req.admin!.email });
  res.status(201).json({ success: true, data: shelter });
}

export async function adminUpdateShelterHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const shelter = await updateShelter({ id, adminEmail: req.admin!.email, ...req.body });
  res.json({ success: true, data: shelter });
}

export async function adminListAgenciesHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const agencies = await listAgencies(q as never);
  res.json({ success: true, data: agencies });
}

export async function adminCreateAgencyHandler(req: Request, res: Response): Promise<void> {
  const agency = await createAgency({ ...req.body, adminEmail: req.admin!.email });
  res.status(201).json({ success: true, data: agency });
}

export async function adminUpdateAgencyHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const agency = await updateAgency({ id, adminEmail: req.admin!.email, ...req.body });
  res.json({ success: true, data: agency });
}

export async function adminListResourcesHandler(req: Request, res: Response): Promise<void> {
  const q = (req as Request & { validatedQuery: Record<string, unknown> }).validatedQuery;
  const resources = await listResources(q as never);
  res.json({ success: true, data: resources });
}

export async function adminCreateResourceHandler(req: Request, res: Response): Promise<void> {
  const resource = await createResource({ ...req.body, adminEmail: req.admin!.email });
  res.status(201).json({ success: true, data: resource });
}

export async function adminUpdateResourceQuantityHandler(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { validatedParams: { id: string } }).validatedParams;
  const resource = await updateResourceQuantity({ id, adminEmail: req.admin!.email, ...req.body });
  res.json({ success: true, data: resource });
}