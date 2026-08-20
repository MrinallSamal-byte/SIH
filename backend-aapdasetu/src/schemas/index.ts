/** Zod schemas for all public + admin request validation. */
import { z } from 'zod';

export const incidentTypeSchema = z.enum([
  'fire',
  'flood',
  'medical',
  'missing_person',
  'earthquake',
  'accident',
  'other',
]);

const latSchema = z.number().min(-90).max(90);
const lngSchema = z.number().min(-180).max(180);

const reportCommon = {
  type: incidentTypeSchema,
  latitude: latSchema,
  longitude: lngSchema,
  description: z.string().max(5000).optional().nullable(),
  landmark: z.string().max(500).optional().nullable(),
  reporterName: z.string().max(200).optional().nullable(),
  reporterPhone: z.string().max(30).optional().nullable(),
  medicalCondition: z.string().max(500).optional().nullable(),
  bloodType: z.string().max(10).optional().nullable(),
  mediaData: z.string().max(30_000_000).optional().nullable(),
  mediaType: z.enum(['video', 'audio', 'image', 'none']).optional().nullable(),
};

export const createSosSchema = z.object({
  ...reportCommon,
});

export const createReportSchema = z.object({
  ...reportCommon,
  missingPersonName: z.string().max(200).optional().nullable(),
  missingPersonAge: z.number().int().min(0).max(130).optional().nullable(),
  missingPersonDesc: z.string().max(5000).optional().nullable(),
});

export const trackingParamsSchema = z.object({
  trackingId: z.string().min(3).max(64),
});

export const createCheckinSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().max(30).optional().nullable(),
  locationName: z.string().max(300).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(['safe', 'need_assistance']),
  latitude: latSchema.optional().nullable(),
  longitude: lngSchema.optional().nullable(),
});

export const nearbySheltersSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(500).optional(),
});

export const listSheltersQuerySchema = z.object({
  status: z.enum(['open', 'full', 'closed']).optional(),
});

export const pfaChatSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
});

export const damageAssessmentSchema = z.object({
  imageBase64: z.string().min(24),
  mimeType: z.string().optional(),
  reportedLatitude: latSchema,
  reportedLongitude: lngSchema,
  reportId: z.string().uuid().optional(),
  reporterName: z.string().max(200).optional(),
  reporterPhone: z.string().max(30).optional(),
});

export const missingMatchSchema = z.object({
  reportId: z.string().uuid(),
  threshold: z.coerce.number().min(0).max(1).optional(),
});

export const createMissingPersonSchema = z.object({
  name: z.string().min(1).max(200),
  age: z.number().int().min(0).max(130).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  lastSeenAt: z.string().datetime().optional().nullable(),
  lastSeenLocation: z.string().max(300).optional().nullable(),
  clothes: z.string().max(500).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  photoUrl: z.string().max(2000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateMissingPersonSchema = z.object({
  name: z.string().max(200).optional(),
  age: z.number().int().min(0).max(130).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  lastSeenAt: z.string().datetime().optional().nullable(),
  lastSeenLocation: z.string().max(300).optional().nullable(),
  clothes: z.string().max(500).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  photoUrl: z.string().max(2000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(['open', 'matched', 'resolved']).optional(),
});

export const broadcastSchema = z.object({
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(5000),
  region: z.string().max(300).optional(),
  channels: z.array(z.enum(['sms', 'whatsapp', 'web'])).min(1).max(5),
  recipientNumbers: z.array(z.string().max(30)).max(500).optional(),
});

export const rerouteSchema = z.object({
  latitude: latSchema,
  longitude: lngSchema,
  hazardId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const listReportsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'in_progress', 'resolved']).optional(),
  type: incidentTypeSchema.optional(),
  priorityLabel: z.enum(['RED', 'YELLOW', 'GREEN']).optional(),
  search: z.string().max(200).optional(),
});

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'resolved']),
  resolutionNotes: z.string().max(5000).optional(),
});

export const assignDispatchSchema = z.object({
  volunteerId: z.string().uuid().optional(),
  agencyId: z.string().uuid().optional(),
});

export const unassignDispatchSchema = z.object({
  target: z.enum(['volunteer', 'agency']),
});

export const createVolunteerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30),
  skills: z.array(z.enum(['medical', 'search_rescue', 'driving', 'logistics'])).max(20),
  latitude: latSchema.optional(),
  longitude: lngSchema.optional(),
  status: z.enum(['available', 'on_duty', 'offline']).optional(),
});

export const updateVolunteerSchema = z.object({
  name: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  skills: z.array(z.enum(['medical', 'search_rescue', 'driving', 'logistics'])).max(20).optional(),
  latitude: latSchema.optional(),
  longitude: lngSchema.optional(),
});

export const updateVolunteerStatusSchema = z.object({
  status: z.enum(['available', 'on_duty', 'offline']),
});

export const createShelterSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  latitude: latSchema,
  longitude: lngSchema,
  capacity: z.number().int().min(0),
  facilities: z.array(z.enum(['food', 'water', 'medical_station', 'power_generator'])).max(20),
  contactPhone: z.string().max(30).optional(),
  status: z.enum(['open', 'full', 'closed']).optional(),
});

export const updateShelterSchema = z.object({
  name: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  latitude: latSchema.optional(),
  longitude: lngSchema.optional(),
  capacity: z.number().int().min(0).optional(),
  occupancy: z.number().int().min(0).optional(),
  facilities: z.array(z.enum(['food', 'water', 'medical_station', 'power_generator'])).max(20).optional(),
  contactPhone: z.string().max(30).optional(),
  status: z.enum(['open', 'full', 'closed']).optional(),
});

export const createAgencySchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['fire_department', 'police', 'ndrf', 'hospital', 'ngo']),
  contactPhone: z.string().max(30).optional(),
  contactEmail: z.string().email().optional(),
  jurisdiction: z.string().max(300).optional(),
  latitude: latSchema.optional(),
  longitude: lngSchema.optional(),
});

export const updateAgencySchema = createAgencySchema.partial();

export const createResourceSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['food', 'water', 'medical', 'clothing', 'fuel']),
  quantity: z.number().int().min(0),
  unit: z.string().min(1).max(30),
  shelterId: z.string().uuid().optional(),
});

export const updateResourceQuantitySchema = z.object({
  quantity: z.number().int().min(0),
});

export const createAlertSchema = z.object({
  title: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
  severity: z.enum(['info', 'warning', 'critical']),
  channel: z.enum(['sms', 'whatsapp', 'public', 'all']).optional(),
  targetArea: z.string().max(300).optional(),
});

export const reviewMatchSchema = z.object({
  status: z.enum(['confirmed', 'rejected']),
});

export const listVolunteersQuerySchema = z.object({
  status: z.enum(['available', 'on_duty', 'offline']).optional(),
  skill: z.string().optional(),
});

export const analyticsQuerySchema = z.object({
  rangeDays: z.coerce.number().int().min(1).max(90).optional(),
});

export const createHazardSchema = z.object({
  type: z.string().min(1).max(100),
  name: z.string().max(200).optional(),
  geometry: z.unknown(),
  description: z.string().max(1000).optional(),
  active: z.boolean().optional(),
});

export const updateHazardSchema = z.object({
  active: z.boolean(),
});