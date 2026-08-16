import { apiCall, withMockFallback } from './client'
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
  assignments?: { id: string }[]
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

function toVolunteer(r: RawVolunteer): Volunteer {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    skills: r.skills ?? [],
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    status: r.status,
    assignedReportId: r.assignments?.[0]?.id ?? undefined,
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
  const media = input.media?.[0]
  if (media) {
    body.mediaData = media.dataUrl
    body.mediaType = media.kind
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
  )
}

/** GET /api/v1/admin/reports?status=&priorityLabel=&search= — list + search reports. */
export function listReports(params: { status?: string; priority?: string; q?: string } = {}): Promise<Report[]> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.priority) qs.set('priorityLabel', params.priority)
  if (params.q) qs.set('search', params.q)
  return withMockFallback(
    () =>
      apiCall<{ items: RawReport[] }>(`GET`, `/api/v1/admin/reports?${qs.toString()}`).then((d) =>
        (d.items ?? []).map(toReport),
      ),
    () => mocks.listReports(params),
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
      return apiCall<RawReport>('POST', `/api/v1/admin/reports/${encodeURIComponent(id)}/assign`, {
        volunteerId: patch.assignedVolunteerId,
        agencyId: patch.assignedAgencyId,
      }).then(toReport)
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
  )
}

// ---- shelters ------------------------------------------------------------------

/** GET /api/v1/shelters?status= — shelter list (public; distance computed client-side). */
export function listShelters(status?: string): Promise<Shelter[]> {
  return withMockFallback(
    () => apiCall<Shelter[]>(`GET`, `/api/v1/shelters${status ? `?status=${status}` : ''}`),
    () => mocks.listShelters(status),
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
  )
}

// ---- alerts --------------------------------------------------------------------

/** GET /api/v1/alerts — public live alerts. */
export function listAlerts(): Promise<Alert[]> {
  return withMockFallback(
    () => apiCall<Alert[]>('GET', '/api/v1/alerts'),
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
        targetArea: input.region,
      }),
    () => mocks.createAlert(input),
  )
}

// ---- volunteers -----------------------------------------------------------------

/** GET /api/v1/admin/volunteers?status= — volunteer roster. */
export function listVolunteers(status?: string): Promise<Volunteer[]> {
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
  )
}

// ---- audit logs ------------------------------------------------------------------

/** GET /api/v1/admin/audit-logs?limit= — read-only compliance log. */
export function listAuditLogs(): Promise<AuditLog[]> {
  return withMockFallback(
    () => apiCall<{ items: AuditLog[] }>('GET', '/api/v1/admin/audit-logs').then((d) => d.items ?? []),
    () => mocks.listAuditLogs(),
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
  )
}

/** POST /api/v1/admin/communications/broadcast — multi-channel push (persists alert; Twilio/WhatsApp only if creds set). */
export function broadcastAlert(input: BroadcastPayload): Promise<{ delivered: number; channels: string[] }> {
  return withMockFallback(
    () =>
      apiCall<{ delivered: number; channels: string[] }>('POST', '/api/v1/admin/communications/broadcast', {
        severity: input.severity,
        title: input.title,
        body: input.body,
        region: input.region,
        channels: input.channels,
        recipientNumbers: input.recipientNumbers,
      }),
    () => mocks.broadcast(input),
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
    return {
      byType: byKey(d.byType, 'type'),
      byPriority: byKey(d.byPriority, 'priorityLabel'),
      byStatus: byKey(d.byStatus, 'status'),
      byTime: (d.trendsByDay ?? []).map((t: { day: string; count: number }) => ({
        date: t.day,
        count: Number(t.count) || 0,
      })),
    }
  }, mocks.analytics)
}

/** POST /api/v1/damage-assessment — persist disaster property damage relief claim. */
export function createDamageAssessment(input: {
  propertyAddress: string
  latitude?: number
  longitude?: number
  structuralDamage: boolean
  floodDepthMeters?: number
  estimatedLossInr: number
  claimantName?: string
  claimantPhone: string
}): Promise<{ id: string; status: string; compensation: number }> {
  return withMockFallback(
    () =>
      apiCall<{ id: string; status: string; compensation: number }>('POST', '/api/v1/damage-assessment', input),
    () => ({
      id: `SDRF-${Date.now().toString(36).toUpperCase()}`,
      status: 'pending_review',
      compensation: input.estimatedLossInr,
    }),
  )
}