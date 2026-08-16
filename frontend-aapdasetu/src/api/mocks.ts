import type {
  Agency,
  Alert,
  AnalyticsData,
  AuditLog,
  BroadcastPayload,
  FloodGeoJson,
  MissingPerson,
  OverviewKPIs,
  Report,
  ReportInput,
  SafetyCheckin,
  Shelter,
  TriageResult,
  Volunteer,
} from '../types'
import { computeTriage } from '../lib/triage'
import { generateTrackingId } from '../lib/helpers'

// -----------------------------------------------------------------------------
// In-memory mock store. Mirrors the Express + FastAPI backends so the UI works
// end-to-end in demo mode (VITE_USE_MOCK_ONLY=true or backend unreachable).
// -----------------------------------------------------------------------------

let reports: Report[] = [
  {
    id: 'rep-001',
    trackingId: 'SOS-A1B2C3',
    type: 'flood',
    status: 'in_progress',
    priorityScore: 82,
    priorityLabel: 'RED',
    latitude: 22.5726,
    longitude: 88.3639,
    landmark: 'Salt Lake Sector V',
    description: 'Water rising fast, elderly family trapped on first floor roof',
    reporterName: 'Anita Das',
    reporterPhone: '+91-9000000001',
    assignedVolunteerName: 'Rahul Sharma',
    assignedAgencyName: 'NDRF',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'rep-002',
    trackingId: 'SOS-D4E5F6',
    type: 'fire',
    status: 'pending',
    priorityScore: 88,
    priorityLabel: 'RED',
    latitude: 22.5722,
    longitude: 88.3702,
    landmark: 'New Town Market',
    description: 'Fire spreading, people trapped, possible gas leak',
    reporterName: 'Mohammed Ali',
    reporterPhone: '+91-9000000002',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'rep-003',
    trackingId: 'SOS-G7H8I9',
    type: 'medical',
    status: 'pending',
    priorityScore: 64,
    priorityLabel: 'YELLOW',
    latitude: 22.5731,
    longitude: 88.3611,
    landmark: 'Community Health Centre',
    description: 'Pregnant woman in labour, needs urgent transport',
    reporterName: 'Sita Patel',
    reporterPhone: '+91-9000000003',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'rep-004',
    trackingId: 'SOS-J1K2L3',
    type: 'missing_person',
    status: 'resolved',
    priorityScore: 58,
    priorityLabel: 'YELLOW',
    latitude: 22.5699,
    longitude: 88.3744,
    landmark: 'Action Area 1',
    description: 'Elderly man missing after flood evacuation',
    reporterName: 'Rajesh Gupta',
    reporterPhone: '+91-9000000004',
    resolutionNotes: 'Found safe at shelter S-02',
    assignedVolunteerName: 'Priya Singh',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
]

let checkins: SafetyCheckin[] = [
  {
    id: 'chk-001',
    fullName: 'Anita Das',
    phone: '+91-9000000001',
    status: 'safe',
    locationName: 'Salt Lake Sector V',
    latitude: 22.5726,
    longitude: 88.3639,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
]

const shelters: Shelter[] = [
  {
    id: 'shel-001',
    name: 'Sector V Community Hall',
    address: 'Salt Lake, Sector V',
    latitude: 22.574,
    longitude: 88.365,
    capacity: 300,
    occupancy: 120,
    facilities: ['food', 'water', 'medical_station', 'power_generator'],
    contactPhone: '+91-9111111111',
    status: 'open',
  },
  {
    id: 'shel-002',
    name: 'New Town School Shelter',
    address: 'Action Area 1, New Town',
    latitude: 22.579,
    longitude: 88.378,
    capacity: 200,
    occupancy: 190,
    facilities: ['food', 'water'],
    contactPhone: '+91-9111111112',
    status: 'full',
  },
  {
    id: 'shel-003',
    name: 'Bidhannagar Stadium Camp',
    address: 'Kestopur, Bidhannagar',
    latitude: 22.567,
    longitude: 88.401,
    capacity: 500,
    occupancy: 0,
    facilities: ['food', 'water', 'medical_station'],
    contactPhone: '+91-9111111113',
    status: 'open',
  },
]

const volunteers: Volunteer[] = [
  {
    id: 'vol-001',
    name: 'Rahul Sharma',
    phone: '+91-9222222221',
    skills: ['search_rescue', 'medical'],
    latitude: 22.571,
    longitude: 88.364,
    status: 'on_duty',
    assignedReportId: 'rep-001',
  },
  {
    id: 'vol-002',
    name: 'Priya Singh',
    phone: '+91-9222222222',
    skills: ['medical', 'logistics'],
    latitude: 22.575,
    longitude: 88.369,
    status: 'available',
  },
  {
    id: 'vol-003',
    name: 'Amit Kumar',
    phone: '+91-9222222223',
    skills: ['driving'],
    latitude: 22.568,
    longitude: 88.371,
    status: 'available',
  },
]

const agencies: Agency[] = [
  { id: 'ag-001', name: 'NDRF 8th Battalion', type: 'ndrf', contactPhone: '+91-9333333331', jurisdiction: 'Kolkata & North 24 Parganas' },
  { id: 'ag-002', name: 'Kolkata Fire Brigade', type: 'fire_department', contactPhone: '+91-9333333332', jurisdiction: 'Kolkata' },
  { id: 'ag-003', name: 'Bidhannagar Police', type: 'police', contactPhone: '+91-9333333333', jurisdiction: 'Bidhannagar' },
  { id: 'ag-004', name: 'RG Kar Medical Hospital', type: 'hospital', contactPhone: '+91-9333333334', jurisdiction: 'Kolkata North' },
  { id: 'ag-005', name: 'Red Cross Bengal', type: 'ngo', contactPhone: '+91-9333333335', jurisdiction: 'West Bengal' },
]

let alerts: Alert[] = [
  {
    id: 'alt-001',
    severity: 'critical',
    title: 'Cyclone Warning',
    message: 'Severe cyclone expected. Avoid low-lying areas and underpasses.',
    region: 'North 24 Parganas',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'alt-002',
    severity: 'warning',
    title: 'Road Closure',
    message: 'VIP Road underpass flooded, use alternate routes.',
    region: 'Salt Lake',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
]

let missingPersons: MissingPerson[] = [
  {
    id: 'mis-001',
    name: 'Harish Chandra',
    age: 68,
    gender: 'male',
    lastSeenAt: '2026-07-27T09:00:00Z',
    lastSeenLocation: 'Action Area 1',
    clothes: 'White kurta, black slippers',
    contactPhone: '+91-9444444441',
    status: 'matched',
  },
  {
    id: 'mis-002',
    name: 'Sunita Devi',
    age: 9,
    gender: 'female',
    lastSeenAt: '2026-07-27T10:30:00Z',
    lastSeenLocation: 'Salt Lake Sector V',
    clothes: 'Pink dress',
    contactPhone: '+91-9444444442',
    status: 'open',
  },
]

let auditLogs: AuditLog[] = [
  {
    id: 'aud-001',
    adminEmail: 'admin@aapdasetu.example',
    action: 'LOGIN',
    entityType: 'admin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'aud-002',
    adminEmail: 'admin@aapdasetu.example',
    action: 'ASSIGN_VOLUNTEER',
    entityType: 'report',
    entityId: 'rep-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
]

function buildReport(input: ReportInput): Report {
  const triage: TriageResult = computeTriage(input)
  const id = `rep-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    trackingId: generateTrackingId(),
    type: input.type,
    status: 'pending',
    priorityScore: triage.score,
    priorityLabel: triage.label,
    latitude: input.location?.lat,
    longitude: input.location?.lng,
    landmark: input.landmark,
    description: input.description,
    registerNumber: input.registerNumber,
    reporterName: input.reporterName,
    reporterPhone: input.reporterPhone,
    triageFactors: triage.factors,
    createdAt: new Date().toISOString(),
  }
}

export const mocks = {
  createReport(input: ReportInput): Report {
    const report = buildReport(input)
    reports = [report, ...reports]
    return report
  },

  listReports(params: { status?: string; priority?: string; q?: string } = {}): Report[] {
    let list = reports
    if (params.status) list = list.filter((r) => r.status === params.status)
    if (params.priority) list = list.filter((r) => r.priorityLabel === params.priority)
    if (params.q) {
      const q = params.q.toLowerCase()
      list = list.filter(
        (r) =>
          (r.description ?? '').toLowerCase().includes(q) ||
          (r.landmark ?? '').toLowerCase().includes(q) ||
          r.trackingId.toLowerCase().includes(q),
      )
    }
    return [...list]
  },

  getReport(id: string): Report | undefined {
    return reports.find((r) => r.id === id || r.trackingId === id)
  },

  updateReport(id: string, patch: Partial<Report>): Report | undefined {
    const idx = reports.findIndex((r) => r.id === id)
    if (idx === -1) return undefined
    reports[idx] = { ...reports[idx], ...patch, updatedAt: new Date().toISOString() }
    return reports[idx]
  },

  overviewKpis(): OverviewKPIs {
    const pending = reports.filter((r) => r.status === 'pending')
    return {
      totalReports: reports.length,
      activeRedAlerts: reports.filter((r) => r.priorityLabel === 'RED' && r.status !== 'resolved').length,
      openShelters: shelters.filter((s) => s.status === 'open').length,
      availableVolunteers: volunteers.filter((v) => v.status === 'available').length,
      avgResponseTimeMins: 18,
      crisisScore: Math.max(0, 100 - pending.length * 7),
      openCases: pending.length,
    }
  },

  listSafetyCheckins(): SafetyCheckin[] {
    return [...checkins]
  },

  createSafetyCheckin(input: Omit<SafetyCheckin, 'id' | 'createdAt'>): SafetyCheckin {
    const checkin: SafetyCheckin = {
      ...input,
      id: `chk-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    }
    checkins = [checkin, ...checkins]
    return checkin
  },

  listShelters(status?: string): Shelter[] {
    if (!status) return [...shelters]
    return shelters.filter((s) => s.status === status)
  },

  updateShelter(id: string, patch: Partial<Shelter>): Shelter | undefined {
    const idx = shelters.findIndex((s) => s.id === id)
    if (idx === -1) return undefined
    shelters[idx] = { ...shelters[idx], ...patch }
    return shelters[idx]
  },

  listAlerts(): Alert[] {
    return [...alerts]
  },

  createAlert(input: Omit<Alert, 'id' | 'createdAt'>): Alert {
    const alert: Alert = {
      ...input,
      id: `alt-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    }
    alerts = [alert, ...alerts]
    return alert
  },

  listVolunteers(status?: string): Volunteer[] {
    if (!status) return [...volunteers]
    return volunteers.filter((v) => v.status === status)
  },

  updateVolunteer(id: string, patch: Partial<Volunteer>): Volunteer | undefined {
    const idx = volunteers.findIndex((v) => v.id === id)
    if (idx === -1) return undefined
    volunteers[idx] = { ...volunteers[idx], ...patch }
    return volunteers[idx]
  },

  listAgencies(): Agency[] {
    return [...agencies]
  },

  listMissingPersons(): MissingPerson[] {
    return [...missingPersons]
  },

  createMissingPerson(input: Omit<MissingPerson, 'id' | 'status'>): MissingPerson {
    const person: MissingPerson = {
      ...input,
      id: `mis-${Math.random().toString(36).slice(2, 8)}`,
      status: 'open',
    }
    missingPersons = [person, ...missingPersons]
    return person
  },

  updateMissingPerson(id: string, patch: Partial<MissingPerson>): MissingPerson | undefined {
    const idx = missingPersons.findIndex((m) => m.id === id)
    if (idx === -1) return undefined
    missingPersons[idx] = { ...missingPersons[idx], ...patch }
    return missingPersons[idx]
  },

  listAuditLogs(): AuditLog[] {
    return [...auditLogs]
  },

  broadcast(input: BroadcastPayload): { delivered: number; channels: string[] } {
    const alert: Alert = {
      id: `alt-${Math.random().toString(36).slice(2, 8)}`,
      severity: input.severity,
      title: input.title,
      message: input.body,
      region: input.region,
      channel: input.channels.join(','),
      createdAt: new Date().toISOString(),
    }
    alerts = [alert, ...alerts]
    auditLogs = [
      {
        id: `aud-${Math.random().toString(36).slice(2, 8)}`,
        adminEmail: 'admin@aapdasetu.example',
        action: 'BROADCAST_ALERT',
        entityType: 'alert',
        entityId: alert.id,
        createdAt: new Date().toISOString(),
      },
      ...auditLogs,
    ]
    return { delivered: (input.recipientNumbers?.length ?? 1) * input.channels.length, channels: input.channels }
  },

  analytics(): AnalyticsData {
    const byType: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    reports.forEach((r) => {
      byType[r.type] = (byType[r.type] ?? 0) + 1
      byPriority[r.priorityLabel] = (byPriority[r.priorityLabel] ?? 0) + 1
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
    })
    return {
      byType,
      byPriority,
      byStatus,
      byTime: [
        { date: 'Day 1', count: 2 },
        { date: 'Day 2', count: 5 },
        { date: 'Day 3', count: 3 },
        { date: 'Today', count: reports.length },
      ],
    }
  },

  aiTriage(payload: ReportInput): TriageResult {
    return computeTriage(payload)
  },

  aiPfaChat(message: string, victimName = 'Friend') {
    const msg = message.toLowerCase()
    if (['panic', 'scared', 'fear', 'afraid'].some((w) => msg.includes(w))) {
      return {
        reply: `I hear you, ${victimName}. Please take a slow, deep breath in... hold for 4 seconds... and exhale slowly. You are not alone. Let's try a 5-4-3-2-1 grounding exercise: name 5 things you can see around you right now.`,
        exerciseType: 'BREATHING_AND_GROUNDING',
        safetyChecklist: ['Stay dry', 'Save battery', 'Keep whistle or flashlight ready'],
      }
    }
    if (['water', 'roof', 'flood'].some((w) => msg.includes(w))) {
      return {
        reply: `Stay on the roof or the highest sturdy point, ${victimName}. Do not touch electrical wires or submerged sockets. Keep your phone battery saved. Help is on the way.`,
        exerciseType: 'SURVIVAL_SAFETY_GUIDANCE',
        safetyChecklist: ['Stay on high ground', 'Avoid electric wires', 'Keep battery saved'],
      }
    }
    return {
      reply: `Hello ${victimName}, I am your AapdaSetu emergency companion. I am here with you while rescue is en route. How are you feeling right now? Is anyone injured?`,
      exerciseType: 'EMPATHETIC_LISTENING',
      safetyChecklist: ['Stay calm', 'Conserve battery', 'Signal with whistle/light'],
    }
  },

  aiDamageAssessment(photoDataUrl: string, reportedLat?: number, reportedLng?: number, description?: string) {
    const name = photoDataUrl.slice(0, 32)
    const collapsed = /destroyed|collapsed/i.test(name)
    const damageGrade = collapsed ? 'FULLY_DESTROYED' : 'MAJOR_STRUCTURAL_DAMAGE'
    const exifDeltaKm =
      reportedLat !== undefined && reportedLng !== undefined
        ? Math.round((Math.abs(reportedLat - 22.5726) + Math.abs(reportedLng - 88.3639)) * 1000) / 1000
        : 0
    const factors = ['EXIF geotag verified', 'pHash: no duplicate found', `AI grade: ${damageGrade}`]
    if (description?.trim()) {
      factors.push(`Narrative note: ${description.trim().slice(0, 120)}`)
    }
    return {
      claimedDamage: true,
      verified: true,
      duplicate: false,
      exifValid: true,
      exifDeltaKm,
      damageGrade,
      compensationInr: collapsed ? 400000 : 130000,
      factors,
    }
  },

  aiSatelliteFloodMap(): FloodGeoJson {
    return {
      type: 'FeatureCollection',
      district: 'North 24 Parganas',
      satellite_source: 'Sentinel-1 SAR (mock)',
      features: [
        {
          type: 'Feature',
          properties: {
            hazard_type: 'FLOODED_INUNDATION_ZONE',
            severity: 'EXTREME',
            water_depth_est_meters: 1.8,
            affected_villages: ['Salt Lake Sector V', 'New Town Action Area 1'],
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [88.36, 22.57],
                [88.37, 22.57],
                [88.37, 22.58],
                [88.36, 22.58],
                [88.36, 22.57],
              ],
            ],
          },
        },
      ],
    }
  },
}
