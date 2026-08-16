import { aiCall, apiCall, withMockFallback } from './client'
import { mocks } from './mocks'
import type {
  Agency,
  Alert,
  AnalyticsData,
  AuditLog,
  BroadcastPayload,
  MissingPerson,
  OverviewKPIs,
  Report,
  ReportInput,
  SafetyCheckin,
  Shelter,
  Volunteer,
} from '../types'

// =============================================================================
// EXPRESS REST BACKEND — BUILD CONTRACT
// -----------------------------------------------------------------------------
// The frontend calls relative `/api/...` paths; the Vite dev server proxies
// them to `VITE_API_URL` (default http://localhost:4000, see vite.config.ts).
//
// @TODO BUILD: create an Express server (suggested: `server/index.js` at the
// repo root) implementing the routes below EXACTLY. Response shapes must match
// the TypeScript types in src/types.ts. Every function below falls back to
// in-memory mock data (src/api/mocks.ts) when the backend is unreachable.
// =============================================================================

/** POST /api/reports — create incident (server runs triage).
 * body: { type, description, landmark?, location{lat,lng}?, reporterName?, reporterPhone?,
 *         victim{age?,groupSize?,isPregnant?,isCardiac?,isBleeding?}?,
 *         missing{name?,age?,desc?}?, media[{kind,name,mime,dataUrl}]?, isOneTapSos? }
 * resp: { id, trackingId, type, status, priorityScore, priorityLabel, ... }
 */
export function createReport(input: ReportInput): Promise<Report> {
  return withMockFallback(
    () => apiCall<Report>('POST', '/api/reports', input),
    () => mocks.createReport(input),
  )
}

/** GET /api/reports?status=&priority=&q= — list + search reports. */
export function listReports(params: { status?: string; priority?: string; q?: string } = {}): Promise<Report[]> {
  return withMockFallback(
    () => apiCall<Report[]>(`GET`, `/api/reports?${new URLSearchParams(params).toString()}`),
    () => mocks.listReports(params),
  )
}

/** GET /api/reports/:id — single report (tracking lookup); 404 if missing. */
export function getReport(id: string): Promise<Report> {
  return withMockFallback(
    () => apiCall<Report>('GET', `/api/reports/${encodeURIComponent(id)}`),
    () => {
      const report = mocks.getReport(id)
      if (!report) throw new Error('Report not found')
      return report
    },
  )
}

/** PATCH /api/reports/:id — dispatch: assign volunteer/agency, change status, resolve.
 * body: { status?, assignedVolunteerId?, assignedAgencyId?, resolutionNotes? }
 */
export function updateReport(
  id: string,
  patch: { status?: Report['status']; assignedVolunteerId?: string; assignedAgencyId?: string; resolutionNotes?: string },
): Promise<Report> {
  return withMockFallback(
    () => apiCall<Report>('PATCH', `/api/reports/${encodeURIComponent(id)}`, patch),
    () => {
      const updated = mocks.updateReport(id, patch)
      if (!updated) throw new Error('Report not found')
      return updated
    },
  )
}

/** GET /api/overview-kpis — admin KPI cards + crisis gauge. */
export function getOverviewKPIs(): Promise<OverviewKPIs> {
  return withMockFallback(
    () => apiCall<OverviewKPIs>('GET', '/api/overview-kpis'),
    () => mocks.overviewKpis(),
  )
}

/** GET /api/safety-checkins — recent check-ins. */
export function listSafetyCheckins(): Promise<SafetyCheckin[]> {
  return withMockFallback(
    () => apiCall<SafetyCheckin[]>('GET', '/api/safety-checkins'),
    () => mocks.listSafetyCheckins(),
  )
}

/** POST /api/safety-checkins — citizen check-in.
 * body: { fullName?, phone?, status, locationName?, location{lat,lng}?, notes? }
 */
export function createSafetyCheckin(
  input: Omit<SafetyCheckin, 'id' | 'createdAt'>,
): Promise<SafetyCheckin> {
  return withMockFallback(
    () => apiCall<SafetyCheckin>('POST', '/api/safety-checkins', input),
    () => mocks.createSafetyCheckin(input),
  )
}

/** GET /api/shelters?status= — shelter list (distance computed client-side). */
export function listShelters(status?: string): Promise<Shelter[]> {
  return withMockFallback(
    () => apiCall<Shelter[]>(`GET`, `/api/shelters${status ? `?status=${status}` : ''}`),
    () => mocks.listShelters(status),
  )
}

/** PATCH /api/shelters/:id — capacity/status update.
 * body: { occupancy?, status?, facilities?, contactPhone?, notes? }
 */
export function updateShelter(id: string, patch: Partial<Shelter>): Promise<Shelter> {
  return withMockFallback(
    () => apiCall<Shelter>('PATCH', `/api/shelters/${encodeURIComponent(id)}`, patch),
    () => {
      const updated = mocks.updateShelter(id, patch)
      if (!updated) throw new Error('Shelter not found')
      return updated
    },
  )
}

/** GET /api/alerts — public live alerts. */
export function listAlerts(): Promise<Alert[]> {
  return withMockFallback(
    () => apiCall<Alert[]>('GET', '/api/alerts'),
    () => mocks.listAlerts(),
  )
}

/** POST /api/alerts — create web alert.
 * body: { severity, title, body, region? }
 */
export function createAlert(input: Omit<Alert, 'id' | 'createdAt'>): Promise<Alert> {
  return withMockFallback(
    () => apiCall<Alert>('POST', '/api/alerts', input),
    () => mocks.createAlert(input),
  )
}

/** GET /api/volunteers?status= — volunteer roster. */
export function listVolunteers(status?: string): Promise<Volunteer[]> {
  return withMockFallback(
    () => apiCall<Volunteer[]>(`GET`, `/api/volunteers${status ? `?status=${status}` : ''}`),
    () => mocks.listVolunteers(status),
  )
}

/** PATCH /api/volunteers/:id — dispatch status / assignment.
 * body: { status?, assignedReportId? }
 */
export function updateVolunteer(id: string, patch: Partial<Volunteer>): Promise<Volunteer> {
  return withMockFallback(
    () => apiCall<Volunteer>('PATCH', `/api/volunteers/${encodeURIComponent(id)}`, patch),
    () => {
      const updated = mocks.updateVolunteer(id, patch)
      if (!updated) throw new Error('Volunteer not found')
      return updated
    },
  )
}

/** GET /api/agencies — multi-agency roster. */
export function listAgencies(): Promise<Agency[]> {
  return withMockFallback(
    () => apiCall<Agency[]>('GET', '/api/agencies'),
    () => mocks.listAgencies(),
  )
}

/** GET /api/missing-persons — missing persons registry. */
export function listMissingPersons(): Promise<MissingPerson[]> {
  return withMockFallback(
    () => apiCall<MissingPerson[]>('GET', '/api/missing-persons'),
    () => mocks.listMissingPersons(),
  )
}

/** POST /api/missing-persons — citizen report-missing.
 * body: { name, age?, gender?, lastSeenAt?, lastSeenLocation, clothes?, contactPhone, photoUrl? }
 */
export function createMissingPerson(input: Omit<MissingPerson, 'id' | 'status'>): Promise<MissingPerson> {
  return withMockFallback(
    () => apiCall<MissingPerson>('POST', '/api/missing-persons', input),
    () => mocks.createMissingPerson(input),
  )
}

/** PATCH /api/missing-persons/:id — match / status update.
 * body: { status?, matched? }
 */
export function updateMissingPerson(id: string, patch: Partial<MissingPerson>): Promise<MissingPerson> {
  return withMockFallback(
    () => apiCall<MissingPerson>('PATCH', `/api/missing-persons/${encodeURIComponent(id)}`, patch),
    () => {
      const updated = mocks.updateMissingPerson(id, patch)
      if (!updated) throw new Error('Missing person record not found')
      return updated
    },
  )
}

/** GET /api/audit-logs?limit= — read-only compliance log. */
export function listAuditLogs(): Promise<AuditLog[]> {
  return withMockFallback(
    () => apiCall<AuditLog[]>('GET', '/api/audit-logs'),
    () => mocks.listAuditLogs(),
  )
}

/** POST /api/admin/login — admin auth (replaces Supabase verify_admin_login()).
 * @TODO BUILD: server-side bcrypt compare, return { token, email, name }.
 * body: { email, password }
 */
export function adminLogin(email: string, password: string): Promise<{ token: string; email: string; name: string }> {
  return withMockFallback(
    () => apiCall<{ token: string; email: string; name: string }>('POST', '/api/admin/login', { email, password }),
    () => ({ token: 'mock-token', email, name: 'Admin' }),
  )
}

/** POST /api/communications/broadcast — multi-channel push (sms/whatsapp/web).
 * @TODO BUILD: consume Twilio SID+Auth (sms) and WhatsApp Cloud API token+phone
 * number id (whatsapp) — credentials entered in admin Settings.tsx, stored
 * server-side, NEVER in the browser bundle.
 * body: { severity, title, body, region?, channels[], recipientNumbers? }
 */
export function broadcastAlert(input: BroadcastPayload): Promise<{ delivered: number; channels: string[] }> {
  return withMockFallback(
    () => apiCall<{ delivered: number; channels: string[] }>('POST', '/api/communications/broadcast', input),
    () => mocks.broadcast(input),
  )
}

/** GET /api/analytics — crisis charts data. */
export function getAnalytics(): Promise<AnalyticsData> {
  return withMockFallback(
    () => apiCall<AnalyticsData>('GET', '/api/analytics'),
    () => mocks.analytics(),
  )
}

// AI-engine helpers re-exported here for convenience (imported from ai.ts too).
export { aiCall }
