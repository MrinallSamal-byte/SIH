import { apiCall, withMockFallback } from './client'
import { mocks } from './mocks'
import type {
  Agency,
  Alert,
  AnalyticsData,
  AuditLog,
  BroadcastPayload,
  DamageAssessmentReport,
  DamageGrade,
  MissingPerson,
  OverviewKPIs,
  Report,
  ReportInput,
  SafetyCheckin,
  Shelter,
  Volunteer,
  VolunteerUser,
} from '../types'

// =============================================================================
// EXPRESS REST BACKEND — REAL CONTRACT (backend-aapdasetu)
// -----------------------------------------------------------------------------
// The backend (src/app.ts) mounts public routes under `/api/v1` and admin
// routes under `/api/v1/admin`. Every response is wrapped in { success, data }
// (unwrapped by client.ts::apiCall) and admin routes require a Bearer JWT
// (attached automatically from the stored admin session).
//
// Every function still falls back to in-memory mock data when the backend is
// unreachable (or VITE_USE_MOCK_ONLY=true) via withMockFallback.
// =============================================================================

// ---- field/response mappers ------------------------------------------------

interface RawReport {
  id: string
  trackingId: string
  type: Report['type']
  status: Report['status']
  priorityScore: number
  priorityLabel: Report['priorityLabel']
  source?: string
  latitude?: number
  longitude?: number
  landmark?: string | null
  description?: string | null
  registerNumber?: string
  reporterName?: string | null
  reporterPhone?: string | null
  triageFactors?: unknown
  assignedVolunteerId?: string | null
  assignedAgencyId?: string | null
  assignedVolunteer?: { id: string; name: string } | null
  assignedAgency?: { id: string; name: string } | null
  resolutionNotes?: string | null
  createdAt: string
  updatedAt?: string | null
}

interface RawVolunteer {
  id: string
  name: string
  phone?: string
  skills?: string[]
  latitude?: number | null
  longitude?: number | null
  status: Volunteer['status']
  assignments?: { id: string; trackingId?: string }[]
}

interface RawAlert {
  id: string
  severity: Alert['severity']
  title: string
  message: string
  channel?: string | null
  targetArea?: string | null
  createdAt: string
}

interface RawMissingMatch {
  id: string
  score?: number | null
  createdAt: string
  missingPersonName?: string | null
  matchedPersonName?: string | null
  missingPerson?: { name?: string | null } | null
  matchedPerson?: { name?: string | null } | null
}

interface RawKpis {
  totalReports: number
  activeRed: number
  openShelters: number
  availableVolunteers: number
  pendingReports: number
  inProgressReports: number
  crisisGaugeScore: number
  avgPriorityScore?: number
}

interface RawAnalytics {
  byType: { type: string; count: number }[]
  byPriority: { priorityLabel: string; count: number }[]
  byStatus: { status: string; count: number }[]
  trendsByDay: { day: string; count: number }[]
  avgResponseMinutes?: number | null
}

function normalizeTriageFactors(raw: unknown): Report['triageFactors'] {
  if (Array.isArray(raw)) {
    return raw.map((f: { rule?: string; reason?: string; points?: number }) => ({
      reason: f.rule ?? f.reason ?? 'TRIAGE',
      points: Number(f.points) || 0,
    }))
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as { factors?: unknown }).factors)) {
    return ((raw as { factors: string[] }).factors).map((rule: string) => ({ reason: rule, points: 0 }))
  }
  return undefined
}

function toReport(r: RawReport): Report {
  return {
    id: r.id,
    trackingId: r.trackingId,
    type: r.type,
    status: r.status,
    priorityScore: r.priorityScore,
    priorityLabel: r.priorityLabel,
    source: r.source,
    latitude: r.latitude,
    longitude: r.longitude,
    landmark: r.landmark ?? undefined,
    description: r.description ?? undefined,
    registerNumber: r.registerNumber,
    reporterName: r.reporterName ?? undefined,
    reporterPhone: r.reporterPhone ?? undefined,
    triageFactors: normalizeTriageFactors(r.triageFactors),
    assignedVolunteerId: r.assignedVolunteerId ?? undefined,
    assignedVolunteerName: r.assignedVolunteer?.name,
    assignedAgencyId: r.assignedAgencyId ?? undefined,
    assignedAgencyName: r.assignedAgency?.name,
    resolutionNotes: r.resolutionNotes ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? undefined,
  }
}

function toVolunteer(r: RawVolunteer): Volunteer & { assignedTrackingId?: string } {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    skills: r.skills ?? [],
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    status: r.status,
    assignedReportId: r.assignments?.[0]?.id ?? undefined,
    assignedTrackingId: r.assignments?.[0]?.trackingId,
  }
}

function toAlert(r: RawAlert): Alert {
  return {
    id: r.id,
    severity: r.severity,
    title: r.title,
    message: r.message,
    channel: r.channel ?? undefined,
    createdAt: r.createdAt,
  }
}

function reportBody(input: ReportInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: input.type,
    description: input.description,
    landmark: input.landmark ?? null,
    reporterName: input.reporterName ?? null,
    reporterPhone: input.reporterPhone ?? null,
    latitude: input.location?.lat,
    longitude: input.location?.lng,
  }

  if (input.victim) {
    const flags: string[] = []
    if (input.victim.isPregnant) flags.push('pregnant')
    if (input.victim.isCardiac) flags.push('cardiac')
    if (input.victim.isBleeding) flags.push('bleeding')
    if (flags.length) body.medicalCondition = flags.join(', ')
  }
  if (input.missing) {
    if (input.missing.name) body.missingPersonName = input.missing.name
    if (input.missing.age !== undefined) body.missingPersonAge = input.missing.age
    if (input.missing.desc) body.missingPersonDesc = input.missing.desc
  }
  // Send ALL attachments: legacy single fields keep the current backend
  // contract for entry 0, extras ride along as additionalMedia entries.
  const media = input.media ?? []
  if (media.length > 0) {
    body.mediaData = media[0].dataUrl
    body.mediaType = media[0].kind
    if (media.length > 1) {
      body.additionalMedia = media.slice(1).map((m) => ({ dataUrl: m.dataUrl, kind: m.kind }))
    }
  }
  return body
}

// ---- reports -----------------------------------------------------------------

/** POST /api/v1/sos | /api/v1/reports — create incident (server runs triage). */
export function createReport(input: ReportInput): Promise<Report> {
  const path = input.isOneTapSos ? '/api/v1/sos' : '/api/v1/reports'
  return withMockFallback(
    () => apiCall<RawReport & { triage?: unknown }>('POST', path, reportBody(input)).then((d) => toReport(d)),
    () => mocks.createReport(input),
    { mutating: true },
  )
}

/** GET /api/v1/admin/reports?status=&priorityLabel=&search=&page=&pageSize= — server-paginated list. */
export function listReports(params: {
  status?: string
  priority?: string
  type?: string
  q?: string
  page?: number
  pageSize?: number
} = {}): Promise<{ items: Report[]; total: number }> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.priority) qs.set('priorityLabel', params.priority)
  if (params.type) qs.set('type', params.type)
  if (params.q) qs.set('search', params.q)
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  return withMockFallback(
    () =>
      apiCall<{ items: RawReport[]; total: number }>(`GET`, `/api/v1/admin/reports?${qs.toString()}`).then((d) => ({
        items: (d.items ?? []).map(toReport),
        total: Number(d.total) || (d.items?.length ?? 0),
      })),
    () => {
      const items = mocks.listReports(params)
      return { items, total: items.length }
    },
  )
}

/** GET /api/v1/reports/track/:trackingId — single report via public tracking lookup. */
export function getReport(id: string): Promise<Report> {
  return withMockFallback(
    () => apiCall<RawReport>('GET', `/api/v1/reports/track/${encodeURIComponent(id)}`).then(toReport),
    () => {
      const report = mocks.getReport(id)
      if (!report) throw new Error('Report not found')
      return report
    },
  )
}

/** PATCH /api/v1/admin/reports/:id/status | POST :id/assign — dispatch actions. */
export function updateReport(
  id: string,
  patch: { status?: Report['status']; assignedVolunteerId?: string; assignedAgencyId?: string; resolutionNotes?: string },
): Promise<Report> {
  const realCall = () => {
    if (patch.assignedVolunteerId !== undefined || patch.assignedAgencyId !== undefined) {
      const assigned = apiCall<RawReport>('POST', `/api/v1/admin/reports/${encodeURIComponent(id)}/assign`, {
        volunteerId: patch.assignedVolunteerId,
        agencyId: patch.assignedAgencyId,
      }).then(toReport)
      // The /assign route only takes ids — chain a status update so
      // status/resolutionNotes chosen in the dispatch modal are not lost.
      if (patch.status !== undefined || patch.resolutionNotes !== undefined) {
        return assigned.then(() =>
          apiCall<RawReport>('PATCH', `/api/v1/admin/reports/${encodeURIComponent(id)}/status`, {
            status: patch.status,
            resolutionNotes: patch.resolutionNotes,
          }).then(toReport),
        )
      }
      return assigned
    }
    return apiCall<RawReport>('PATCH', `/api/v1/admin/reports/${encodeURIComponent(id)}/status`, {
      status: patch.status,
      resolutionNotes: patch.resolutionNotes,
    }).then(toReport)
  }
  return withMockFallback(
    realCall,
    () => {
      const updated = mocks.updateReport(id, patch)
      if (!updated) throw new Error('Report not found')
      return updated
    },
    { mutating: true },
  )
}

/** POST /api/v1/admin/reports/:id/unassign — clear volunteer/agency assignment. */
export function unassignReport(id: string, target: 'volunteer' | 'agency'): Promise<Report> {
  return withMockFallback(
    () =>
      apiCall<RawReport>('POST', `/api/v1/admin/reports/${encodeURIComponent(id)}/unassign`, { target }).then(toReport),
    () => {
      const report = mocks.getReport(id)
      if (!report) throw new Error('Report not found')
      return report
    },
    { mutating: true },
  )
}

// ---- admin overview -----------------------------------------------------------

/** GET /api/v1/admin/overview — admin KPI cards + crisis gauge. */
export function getOverviewKPIs(): Promise<OverviewKPIs> {
  return withMockFallback(async () => {
    const d = await apiCall<{ kpis: RawKpis }>('GET', '/api/v1/admin/overview')
    const k = d.kpis
    let avgResponseMinutes = 0
    try {
      const analytics = await apiCall<RawAnalytics>('GET', '/api/v1/admin/analytics?rangeDays=14')
      avgResponseMinutes = Number(analytics.avgResponseMinutes) || 0
    } catch {
      // non-critical: keep 0
    }
    return {
      totalReports: Number(k.totalReports) || 0,
      activeRedAlerts: Number(k.activeRed) || 0,
      openShelters: Number(k.openShelters) || 0,
      availableVolunteers: Number(k.availableVolunteers) || 0,
      avgResponseTimeMins: avgResponseMinutes,
      crisisScore: Number(k.crisisGaugeScore) || 0,
      openCases: (Number(k.pendingReports) || 0) + (Number(k.inProgressReports) || 0),
    }
  }, mocks.overviewKpis)
}

// ---- safety check-ins ----------------------------------------------------------

/** GET /api/v1/admin/checkins — recent check-ins. */
export function listSafetyCheckins(): Promise<SafetyCheckin[]> {
  return withMockFallback(
    () => apiCall<{ items: SafetyCheckin[] }>('GET', '/api/v1/admin/checkins').then((d) => d.items ?? []),
    () => mocks.listSafetyCheckins(),
  )
}

/** POST /api/v1/checkins — citizen check-in. */
export function createSafetyCheckin(
  input: Omit<SafetyCheckin, 'id' | 'createdAt'>,
): Promise<SafetyCheckin> {
  return withMockFallback(
    () =>
      apiCall<SafetyCheckin>('POST', '/api/v1/checkins', {
        fullName: input.fullName,
        phone: input.phone ?? null,
        status: input.status,
        locationName: input.locationName ?? null,
        notes: input.notes ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      }),
    () => mocks.createSafetyCheckin(input),
    { mutating: true },
  )
}

// ---- shelters (Admin Full Control) ---------------------------------------------

/** GET /api/v1/shelters?status= — shelter list (public; distance computed client-side). */
export function listShelters(status?: string, includeHidden = false): Promise<Shelter[]> {
  return withMockFallback(
    () => apiCall<Shelter[]>(`GET`, `/api/v1/shelters${status || includeHidden ? `?${new URLSearchParams({ ...(status ? { status } : {}), ...(includeHidden ? { includeHidden: 'true' } : {}) }).toString()}` : ''}`),
    () => mocks.listShelters(status, includeHidden),
  )
}

/** POST /api/v1/admin/shelters — create new shelter. */
export function createShelter(input: Omit<Shelter, 'id'>): Promise<Shelter> {
  return withMockFallback(
    () => apiCall<Shelter>('POST', '/api/v1/admin/shelters', input),
    () => mocks.createShelter(input),
    { mutating: true },
  )
}

/** PATCH /api/v1/admin/shelters/:id — capacity/status update. */
export function updateShelter(id: string, patch: Partial<Shelter>): Promise<Shelter> {
  return withMockFallback(
    () => apiCall<Shelter>('PATCH', `/api/v1/admin/shelters/${encodeURIComponent(id)}`, patch),
    () => {
      const updated = mocks.updateShelter(id, patch)
      if (!updated) throw new Error('Shelter not found')
      return updated
    },
    { mutating: true },
  )
}

/** DELETE /api/v1/admin/shelters/:id — delete shelter. */
export function deleteShelter(id: string): Promise<boolean> {
  return withMockFallback(
    () => apiCall<{ success: boolean }>('DELETE', `/api/v1/admin/shelters/${encodeURIComponent(id)}`).then(() => true),
    () => mocks.deleteShelter(id),
    { mutating: true },
  )
}

/** Reset mock database to 1000+ fresh records. */
export function resetMockDatabase(): Promise<void> {
  return Promise.resolve(mocks.resetData())
}

// ---- alerts --------------------------------------------------------------------

/** GET /api/v1/alerts — public live alerts (backend exposes targetArea, not region). */
export function listAlerts(): Promise<Alert[]> {
  return withMockFallback(
    () => apiCall<RawAlert[]>('GET', '/api/v1/alerts').then((d) => (d ?? []).map(toAlert)),
    () => mocks.listAlerts(),
  )
}

/** POST /api/v1/admin/alerts — create web alert. */
export function createAlert(input: Omit<Alert, 'id' | 'createdAt'>): Promise<Alert> {
  return withMockFallback(
    () =>
      apiCall<Alert>('POST', '/api/v1/admin/alerts', {
        title: input.title,
        message: input.message,
        severity: input.severity,
        channel: input.channel,
        targetArea: input.targetArea,
      }),
    () => mocks.createAlert(input),
    { mutating: true },
  )
}

// ---- volunteers -----------------------------------------------------------------

/** GET /api/v1/admin/volunteers?status= — volunteer roster (with current assignment trackingId). */
export function listVolunteers(status?: string): Promise<(Volunteer & { assignedTrackingId?: string })[]> {
  return withMockFallback(
    () =>
      apiCall<RawVolunteer[]>(`GET`, `/api/v1/admin/volunteers${status ? `?status=${status}` : ''}`).then((d) =>
        (d ?? []).map(toVolunteer),
      ),
    () => mocks.listVolunteers(status),
  )
}

/** PATCH /api/v1/admin/volunteers/:id[/status] — dispatch status / assignment. */
export function updateVolunteer(id: string, patch: Partial<Volunteer>): Promise<Volunteer> {
  const realCall = () => {
    if (patch.status) {
      return apiCall<RawVolunteer>('PATCH', `/api/v1/admin/volunteers/${encodeURIComponent(id)}/status`, {
        status: patch.status,
      }).then(toVolunteer)
    }
    return apiCall<RawVolunteer>('PATCH', `/api/v1/admin/volunteers/${encodeURIComponent(id)}`, {
      name: patch.name,
      phone: patch.phone,
      skills: patch.skills,
      latitude: patch.latitude,
      longitude: patch.longitude,
    }).then(toVolunteer)
  }
  return withMockFallback(
    realCall,
    () => {
      const updated = mocks.updateVolunteer(id, patch)
      if (!updated) throw new Error('Volunteer not found')
      return updated
    },
    { mutating: true },
  )
}

// ---- agencies ------------------------------------------------------------------

/** GET /api/v1/admin/agencies — multi-agency roster. */
export function listAgencies(): Promise<Agency[]> {
  return withMockFallback(
    () => apiCall<Agency[]>('GET', '/api/v1/admin/agencies'),
    () => mocks.listAgencies(),
  )
}

// ---- missing persons --------------------------------------------------------------

export interface MissingMatch {
  id: string
  missingPersonName: string | null
  matchedPersonName: string | null
  score: number | null
  createdAt: string
}

/** GET /api/v1/admin/missing/matches?status=pending — AI sighting matches awaiting review. */
export function listMissingMatches(): Promise<MissingMatch[]> {
  return withMockFallback(
    () =>
      apiCall<RawMissingMatch[]>('GET', '/api/v1/admin/missing/matches?status=pending').then((rows) =>
        (rows ?? []).map((m) => ({
          id: m.id,
          missingPersonName:
            m.missingPersonName ?? m.missingPerson?.name ?? null,
          matchedPersonName:
            m.matchedPersonName ?? m.matchedPerson?.name ?? null,
          score: m.score === null || m.score === undefined ? null : Number(m.score),
          createdAt: m.createdAt,
        })),
      ),
    () => [],
  )
}

/** POST /api/v1/admin/missing/matches/:id/review — confirm or reject a sighting match. */
export function reviewMissingMatch(id: string, decision: 'confirmed' | 'rejected'): Promise<void> {
  return withMockFallback(
    () =>
      apiCall<unknown>('POST', `/api/v1/admin/missing/matches/${encodeURIComponent(id)}/review`, { decision }).then(
        () => undefined,
      ),
    async () => undefined,
    { mutating: true },
  )
}

/** GET /api/v1/missing-persons — public missing persons registry. */
export function listMissingPersons(): Promise<MissingPerson[]> {
  return withMockFallback(
    () => apiCall<{ items: MissingPerson[] }>('GET', '/api/v1/missing-persons').then((d) => d.items ?? []),
    () => mocks.listMissingPersons(),
  )
}

/** POST /api/v1/missing-persons — citizen report-missing. */
export function createMissingPerson(input: Omit<MissingPerson, 'id' | 'status'>): Promise<MissingPerson> {
  return withMockFallback(
    () =>
      apiCall<MissingPerson>('POST', '/api/v1/missing-persons', {
        name: input.name,
        age: input.age ?? null,
        gender: input.gender ?? null,
        lastSeenAt: input.lastSeenAt ?? null,
        lastSeenLocation: input.lastSeenLocation ?? null,
        clothes: input.clothes ?? null,
        contactPhone: input.contactPhone ?? null,
        photoUrl: input.photoUrl ?? null,
      }),
    () => mocks.createMissingPerson(input),
    { mutating: true },
  )
}

/** PATCH /api/v1/admin/missing-persons/:id — match / status update. */
export function updateMissingPerson(id: string, patch: Partial<MissingPerson>): Promise<MissingPerson> {
  return withMockFallback(
    () => apiCall<MissingPerson>('PATCH', `/api/v1/admin/missing-persons/${encodeURIComponent(id)}`, patch),
    () => {
      const updated = mocks.updateMissingPerson(id, patch)
      if (!updated) throw new Error('Missing person record not found')
      return updated
    },
    { mutating: true },
  )
}

// ---- audit logs ------------------------------------------------------------------

/** GET /api/v1/admin/audit-logs — read-only compliance log. */
export function listAuditLogs(): Promise<{ items: AuditLog[]; total: number }> {
  return withMockFallback(
    // ponytail: server-side filter params pending UI — single large page fetch,
    // filtering/sorting stay client-side for now.
    () =>
      apiCall<{ items: AuditLog[]; total: number }>('GET', '/api/v1/admin/audit-logs?pageSize=200').then((d) => ({
        items: d.items ?? [],
        total: Number(d.total) || (d.items?.length ?? 0),
      })),
    () => {
      const items = mocks.listAuditLogs()
      return { items, total: items.length }
    },
  )
}

// ---- auth & broadcast --------------------------------------------------------------

/** POST /api/v1/admin/auth/login — admin auth (backend scrypt/JWT). */
export function adminLogin(email: string, password: string): Promise<{ token: string; email: string; name: string }> {
  return withMockFallback(
    () =>
      apiCall<{ token: string; admin: { id: string; email: string; name: string } }>('POST', '/api/v1/admin/auth/login', {
        email,
        password,
      }).then((d) => ({ token: d.token, email: d.admin.email, name: d.admin.name })),
    () => ({ token: 'mock-token', email, name: 'Admin' }),
    { allowDemoMock: true },
  )
}

/** POST /api/v1/volunteer/auth/login — volunteer auth (phone + access code) with demo fallback. */
export function volunteerLogin(phone: string, accessCode: string): Promise<VolunteerUser> {
  return withMockFallback(
    () =>
      apiCall<{ token: string; volunteer: { id: string; name: string; email?: string; phone?: string; skills?: string[] } }>(
        'POST',
        '/api/v1/volunteer/auth/login',
        { phone, accessCode },
      ).then((d) => ({
        token: d.token,
        id: d.volunteer.id,
        email: d.volunteer.email ?? '',
        name: d.volunteer.name,
        phone: d.volunteer.phone ?? phone,
        skills: d.volunteer.skills,
      })),
    () => {
      const vols = mocks.listVolunteers()
      const found = vols[0]
      return {
        token: 'mock-volunteer-token',
        id: found?.id || 'vol-001',
        email: '',
        name: found?.name || 'Rahul Sharma',
        phone: found?.phone || phone,
        skills: found?.skills || ['search_rescue', 'medical'],
      }
    },
    { allowDemoMock: true },
  )
}

// ---- volunteer self-service API -----------------------------------------------------
// Authenticated via client.ts::apiCall, which attaches the volunteer bearer token
// for /api/v1/volunteer paths.

/** GET /api/v1/volunteer/me — profile for the signed-in volunteer. */
export function volunteerMe(): Promise<Omit<VolunteerUser, 'token'> & { status?: string }> {
  return apiCall<{ id: string; name: string; email?: string; phone?: string; skills?: string[]; status?: string }>(
    'GET',
    '/api/v1/volunteer/me',
  ).then((v) => ({ id: v.id, name: v.name, email: v.email ?? '', phone: v.phone, skills: v.skills, status: v.status }))
}

/** GET /api/v1/volunteer/tasks — active assignments for the signed-in volunteer. */
export function listVolunteerTasks(): Promise<Report[]> {
  return apiCall<{ items: RawReport[] }>('GET', '/api/v1/volunteer/tasks').then((d) =>
    (d.items ?? []).map(toReport),
  )
}

/** PATCH /api/v1/volunteer/tasks/:id/report-status — mark an assigned rescue resolved. */
export function completeVolunteerTask(reportId: string): Promise<void> {
  return apiCall<void>(
    'PATCH',
    `/api/v1/volunteer/tasks/${encodeURIComponent(reportId)}/report-status`,
    { status: 'resolved' },
  )
}

/** PATCH /api/v1/volunteer/me/status — go available/offline (409 while tasks are active). */
export function setVolunteerStatus(status: 'available' | 'offline'): Promise<void> {
  return apiCall<void>('PATCH', '/api/v1/volunteer/me/status', { status })
}

export interface BroadcastChannelResult {
  channel: string
  ok?: boolean
  note?: string
}

/** POST /api/v1/admin/communications/broadcast — multi-channel push (persists alert; Twilio/WhatsApp only if creds set). */
export function broadcastAlert(
  input: BroadcastPayload,
): Promise<{ delivered: number; channels: string[]; details?: BroadcastChannelResult[] }> {
  return withMockFallback(
    () =>
      apiCall<{ delivered: number; channels: string[]; details?: BroadcastChannelResult[] }>(
        'POST',
        '/api/v1/admin/communications/broadcast',
        {
          severity: input.severity,
          title: input.title,
          body: input.body,
          region: input.region,
          channels: input.channels,
          recipientNumbers: input.recipientNumbers,
        },
      ),
    () => mocks.broadcast(input),
    { mutating: true },
  )
}

/** GET /api/v1/admin/analytics — crisis charts data. */
export function getAnalytics(): Promise<AnalyticsData> {
  return withMockFallback(async () => {
    const d = await apiCall<RawAnalytics>('GET', '/api/v1/admin/analytics?rangeDays=14')
    const byKey = (rows: { count: number }[] | undefined, key: string) =>
      Object.fromEntries(
        (rows ?? []).map((r: { [k: string]: string | number; count: number }) => [r[key], Number(r.count) || 0]),
      )
    const mapped: AnalyticsData & { avgResponseMinutes?: number | null } = {
      byType: byKey(d.byType, 'type'),
      byPriority: byKey(d.byPriority, 'priorityLabel'),
      byStatus: byKey(d.byStatus, 'status'),
      byTime: (d.trendsByDay ?? []).map((t: { day: string; count: number }) => ({
        date: t.day,
        count: Number(t.count) || 0,
      })),
      avgResponseMinutes:
        d.avgResponseMinutes === null || d.avgResponseMinutes === undefined ? null : Number(d.avgResponseMinutes),
    }
    return mapped
  }, mocks.analytics)
}

// ---- damage assessments ---------------------------------------------------------

export type DamageClassification = 'MINOR_DAMAGE' | 'MAJOR_STRUCTURAL_DAMAGE' | 'FULLY_DESTROYED'

export interface DamageRow {
  id: string
  classification: DamageClassification
  confidence: number | null
  compensation: number
  status: string
  imageHash?: string
  duplicate?: boolean
  photoUrl?: string
  createdAt: string
}

export interface DamageCreated {
  id: string
  classification: DamageClassification
  confidence: number | null
  compensation: number
  locationVerified: boolean | null
  status: string
  createdAt: string
}

interface RawDamageRow {
  id: string
  classification: DamageClassification
  confidence: number | null
  compensation: number
  status: string
  imageHash?: string | null
  duplicate?: boolean
  photoUrl?: string | null
  createdAt: string
}

function toDamageRow(r: RawDamageRow): DamageRow {
  return {
    id: r.id,
    classification: r.classification,
    confidence: r.confidence ?? null,
    compensation: Number(r.compensation) || 0,
    status: r.status,
    imageHash: r.imageHash ?? undefined,
    duplicate: Boolean(r.duplicate),
    photoUrl: r.photoUrl ?? undefined,
    createdAt: r.createdAt,
  }
}

const LEGACY_CLASSIFICATION: Record<DamageGrade, DamageClassification> = {
  DESTROYED: 'FULLY_DESTROYED',
  MAJOR: 'MAJOR_STRUCTURAL_DAMAGE',
  MINOR: 'MINOR_DAMAGE',
}

/** Maps a legacy mock DamageAssessmentReport onto the new admin wire shape so demo mode keeps working. */
function legacyDamageRow(m: DamageAssessmentReport): DamageRow & { locationVerified: boolean | null } {
  return {
    id: m.id,
    classification: LEGACY_CLASSIFICATION[m.damageGrade],
    confidence: m.confidence ?? null,
    compensation: Number(m.compensationInr) || 0,
    status: m.status === 'pending_review' ? 'needs_review' : m.status,
    imageHash: undefined,
    duplicate: false,
    photoUrl: m.photoUrl,
    createdAt: m.createdAt,
    locationVerified: m.verified ?? null,
  }
}

/** GET /api/v1/admin/damage-assessments?page&pageSize=100 — claim review list. */
export function listDamageAssessments(): Promise<DamageRow[]> {
  return withMockFallback(
    () =>
      apiCall<{ items: RawDamageRow[] }>('GET', '/api/v1/admin/damage-assessments?page=1&pageSize=100').then((d) =>
        (d.items ?? []).map(toDamageRow),
      ),
    () => mocks.listDamageAssessments().map(legacyDamageRow),
  )
}

/** POST /api/v1/admin/damage-assessments/:id/flag — mark a suspect claim for review. */
export function flagDamageAssessment(id: string): Promise<DamageRow> {
  return withMockFallback(
    () => apiCall<RawDamageRow>('POST', `/api/v1/admin/damage-assessments/${encodeURIComponent(id)}/flag`).then(toDamageRow),
    () => {
      const updated = mocks.updateDamageAssessmentStatus(id, 'flagged_fraud')
      if (!updated) throw new Error('Damage assessment not found')
      return legacyDamageRow(updated)
    },
    { mutating: true },
  )
}

/** POST /api/v1/damage-assessment — persist disaster property damage relief claim. */
export function createDamageAssessment(input: {
  photoDataUrl: string
  latitude?: number
  longitude?: number
  reporterName?: string
  reporterPhone?: string
}): Promise<DamageCreated> {
  const body: Record<string, unknown> = {
    imageBase64: input.photoDataUrl,
    mimeType: 'image/jpeg',
  }
  if (input.latitude !== undefined) body.reportedLatitude = input.latitude
  if (input.longitude !== undefined) body.reportedLongitude = input.longitude
  if (input.reporterName) body.reporterName = input.reporterName
  if (input.reporterPhone) body.reporterPhone = input.reporterPhone

  const mapCreated = (r: RawDamageRow & { locationVerified?: boolean | null }): DamageCreated => ({
    id: r.id,
    classification: r.classification,
    confidence: r.confidence ?? null,
    compensation: Number(r.compensation) || 0,
    locationVerified: r.locationVerified ?? null,
    status: r.status,
    createdAt: r.createdAt,
  })

  return withMockFallback(
    () => apiCall<RawDamageRow & { locationVerified?: boolean | null }>('POST', '/api/v1/damage-assessment', body).then(mapCreated),
    () => {
      const m = mocks.createDamageAssessment({
        claimantName: input.reporterName,
        claimantPhone: input.reporterPhone ?? '+91-0000000000',
        latitude: input.latitude,
        longitude: input.longitude,
        photoUrl: input.photoDataUrl,
        damageGrade: 'MAJOR',
        damageScore: 75.0,
        confidence: 98.36,
        compensationInr: 47550,
      })
      return mapCreated({ ...legacyDamageRow(m), createdAt: m.createdAt })
    },
    { mutating: true },
  )
}

// ---- system status (read-only integration truth) ---------------------------------

export interface SystemStatus {
  sms: { provider: string; configured: boolean }
  whatsapp: { provider: string; configured: boolean }
  ai: { pfaLlmConfigured: boolean; damageMlConfigured: boolean; damageMlBaseUrl?: string }
  realtimePath: string
  rateLimits: { publicPerMinute: number; adminPer15Min: number; uploadsPerHour: number }
}

/** GET /api/v1/admin/system/status — what is actually configured on the server. */
export function getSystemStatus(): Promise<SystemStatus> {
  return apiCall<SystemStatus>('GET', '/api/v1/admin/system/status')
}
