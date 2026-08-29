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

// ponytail: ''/null query values become undefined so optional numeric fields fall through to defaults instead of 400/0
const qnum = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema);

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
  // Base64 media from the client (compressed before upload). The effective
  // ceiling is Vercel's ~4.5MB request-body cap, so anything larger fails
  // with a clear validation message rather than an opaque platform 413.
  mediaData: z.string().max(4_000_000).optional().nullable(),
  mediaType: z.enum(['video', 'audio', 'image', 'none']).optional().nullable(),
  // 1-Tap SOS provenance — drives the +55 triage boost so an unadorned SOS
  // can never triage GREEN (see lib/triage.ts ONE_TAP_SOS_BOOST).
  isOneTapSos: z.boolean().optional().nullable(),
  // Offline-replay idempotency: the client generates this once per logical
  // submission; the backend dedupes on it so an outbox replay after a
  // timeout never creates a duplicate rescue dispatch.
  clientRequestId: z.string().min(8).max(64).optional().nullable(),
  // Original on-device timestamp for submissions queued offline and replayed
  // later — the report time must reflect when the citizen raised it. Bounded:
  // 1999 test data or year-2099 spoofing degrades to null (server receipt
  // time applies) instead of poisoning admin queue displays.
  clientCreatedAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((v) => {
      if (!v) return v;
      const t = Date.parse(v);
      const now = Date.now();
      if (!Number.isFinite(t) || t < now - 7 * 24 * 60 * 60 * 1000 || t > now + 5 * 60 * 1000) {
        return null;
      }
      return v;
    }),
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
  latitude: qnum(z.coerce.number().min(-90).max(90)),
  longitude: qnum(z.coerce.number().min(-180).max(180)),
  radiusKm: qnum(z.coerce.number().min(1).max(500)).optional(),
});

// Public family search by phone — results are PII-masked server-side.
export const familyCheckinSearchSchema = z.object({
  phone: z.string().min(6).max(30),
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
  // Vercel serverless rejects request bodies > 4.5 MB at the edge before this
  // route ever runs — a smaller explicit cap fails fast with a clear message
  // instead of an opaque platform 413 (clients compress before upload).
  imageBase64: z.string().min(24).max(4_000_000),
  mimeType: z.string().optional(),
  reportedLatitude: latSchema,
  reportedLongitude: lngSchema,
  reportId: z.string().uuid().optional(),
  reporterName: z.string().max(200).optional(),
  reporterPhone: z.string().max(30).optional(),
});

export const missingMatchSchema = z.object({
  reportId: z.string().uuid(),
  // Floor of 0.2: recency alone scores above 0, so a threshold of 0 would
  // let a caller force every candidate to "match".
  threshold: z.coerce.number().min(0.2).max(1).optional(),
});

export const createMissingPersonSchema = z.object({
  name: z.string().min(1).max(200),
  age: z.number().int().min(0).max(130).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  lastSeenAt: z.string().datetime().optional().nullable(),
  lastSeenLocation: z.string().max(300).optional().nullable(),
  clothes: z.string().max(500).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  // Citizens submit device-compressed JPEG data URLs (~100-300K chars); the
  // old 2000-char cap rejected every real submission with a photo attached.
  photoUrl: z.string().max(4_000_000).optional().nullable(),
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
  photoUrl: z.string().max(4_000_000).optional().nullable(),
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
  page: qnum(z.coerce.number().int().min(1)).optional(),
  pageSize: qnum(z.coerce.number().int().min(1).max(200)).optional(),
});

export const listReportsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'in_progress', 'resolved']).optional(),
  type: incidentTypeSchema.optional(),
  priorityLabel: z.enum(['RED', 'YELLOW', 'GREEN']).optional(),
  search: z.string().max(200).optional(),
});

export const listSheltersQuerySchema = paginationQuerySchema.partial().extend({
  status: z.enum(['open', 'full', 'closed']).optional(),
});

export const adminAgencyQuerySchema = paginationQuerySchema.partial().extend({
  type: z.enum(['fire_department', 'police', 'ndrf', 'hospital', 'ngo']).optional(),
});

export const adminResourceQuerySchema = paginationQuerySchema.partial().extend({
  shelterId: z.string().uuid().optional(),
  category: z.enum(['food', 'water', 'medical', 'clothing', 'fuel']).optional(),
});

export const adminAlertQuerySchema = paginationQuerySchema.partial().extend({
  severity: z.enum(['info', 'warning', 'critical']).optional(),
});

export const adminHazardQuerySchema = paginationQuerySchema.partial().extend({
  // ponytail: enum mirrors the documented RouteHazard.type set in schema.prisma
  type: z.enum(['flood_polygon', 'blocked_underpass', 'road_closed']).optional(),
});

export const missingMatchQuerySchema = paginationQuerySchema.partial().extend({
  status: z.enum(['pending', 'confirmed', 'rejected']).optional(),
});

export const missingPersonListQuerySchema = paginationQuerySchema.partial().extend({
  status: z.enum(['open', 'matched', 'resolved']).optional(),
});

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'resolved']),
  resolutionNotes: z.string().max(5000).optional(),
});

export const assignDispatchSchema = z
  .object({
    volunteerId: z.string().uuid().optional(),
    agencyId: z.string().uuid().optional(),
  })
  .refine((data) => data.volunteerId || data.agencyId, {
    message: 'volunteerId or agencyId required',
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

export const listVolunteersQuerySchema = paginationQuerySchema.partial().extend({
  status: z.enum(['available', 'on_duty', 'offline']).optional(),
  skill: z.enum(['medical', 'search_rescue', 'driving', 'logistics']).optional(),
});

export const analyticsQuerySchema = z.object({
  rangeDays: qnum(z.coerce.number().int().min(1).max(90)).optional(),
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