export type IncidentType =
  | 'fire'
  | 'flood'
  | 'medical'
  | 'missing_person'
  | 'earthquake'
  | 'accident'
  | 'other'

export type IncidentStatus = 'pending' | 'in_progress' | 'resolved'
export type PriorityLabel = 'RED' | 'YELLOW' | 'GREEN'
export type VolunteerStatus = 'available' | 'on_duty' | 'offline'
export type ShelterStatus = 'open' | 'full' | 'closed'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type CheckinStatus = 'safe' | 'need_assistance'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface TriageFactor {
  reason: string
  points: number
}

export interface TriageResult {
  score: number
  label: PriorityLabel
  factors: TriageFactor[]
}

export interface VictimInfo {
  age?: number
  groupSize?: number
  isPregnant?: boolean
  isCardiac?: boolean
  isBleeding?: boolean
}

export interface MissingInfo {
  name?: string
  age?: number
  desc?: string
}

export interface MediaPayload {
  kind: 'video' | 'audio' | 'image'
  name: string
  mime: string
  dataUrl: string
}

export interface ReportInput {
  type: IncidentType
  description: string
  landmark?: string
  location?: GeoPoint
  registerNumber?: string
  reporterName?: string
  reporterPhone?: string
  victim?: VictimInfo
  missing?: MissingInfo
  media?: MediaPayload[]
  isOneTapSos?: boolean
}

export interface Report {
  id: string
  trackingId: string
  type: IncidentType
  status: IncidentStatus
  priorityScore: number
  priorityLabel: PriorityLabel
  latitude?: number
  longitude?: number
  landmark?: string
  description?: string
  registerNumber?: string
  reporterName?: string
  reporterPhone?: string
  triageFactors?: TriageFactor[]
  assignedVolunteerId?: string
  assignedVolunteerName?: string
  assignedAgencyId?: string
  assignedAgencyName?: string
  resolutionNotes?: string
  source?: 'sos' | 'form' | 'sms' | 'call' | string
  createdAt: string
  updatedAt?: string
}

export interface Volunteer {
  id: string
  name: string
  phone?: string
  skills: string[]
  latitude?: number
  longitude?: number
  status: VolunteerStatus
  assignedReportId?: string
}

export interface Shelter {
  id: string
  name: string
  address?: string
  latitude: number
  longitude: number
  capacity: number
  occupancy: number
  facilities: string[]
  contactPhone?: string
  status: ShelterStatus
}

export interface Agency {
  id: string
  name: string
  type: string
  contactPhone?: string
  contactEmail?: string
  jurisdiction?: string
  latitude?: number
  longitude?: number
}

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  channel?: string
  region?: string
  createdAt: string
}

export interface SafetyCheckin {
  id: string
  fullName?: string
  phone?: string
  status: CheckinStatus
  locationName?: string
  latitude?: number
  longitude?: number
  notes?: string
  createdAt: string
}

export interface MissingPerson {
  id: string
  name: string
  age?: number
  gender?: string
  lastSeenAt?: string
  lastSeenLocation?: string
  clothes?: string
  contactPhone?: string
  photoUrl?: string
  status: 'open' | 'matched' | 'resolved'
}

export interface AuditLog {
  id: string
  adminEmail: string
  action: string
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
  createdAt: string
}

export interface OverviewKPIs {
  totalReports: number
  activeRedAlerts: number
  openShelters: number
  availableVolunteers: number
  avgResponseTimeMins: number
  crisisScore: number
  openCases: number
}

export interface AnalyticsData {
  byType: Record<string, number>
  byPriority: Record<string, number>
  byStatus: Record<string, number>
  byTime: { date: string; count: number }[]
}

export interface BroadcastPayload {
  severity: AlertSeverity
  title: string
  body: string
  region?: string
  channels: string[]
  recipientNumbers?: string[]
}

export interface AdminUser {
  token: string
  email: string
  name: string
}

export interface VolunteerUser {
  token: string
  id: string
  email: string
  name: string
  phone?: string
  skills?: string[]
}

export interface PfaChatMessage {
  id?: string
  role: 'user' | 'bot'
  content: string
  exerciseType?: string
  isCritical?: boolean
  dangerLevel?: 'CRITICAL' | 'MODERATE' | 'LOW'
  helpline?: string
  trackingId?: string
  showCallbackInput?: boolean
  callbackSubmitted?: boolean
  submittedPhone?: string
}

export interface PfaChatResponse {
  reply: string
  exerciseType?: string
  safetyChecklist?: string[]
  isCritical?: boolean
  dangerLevel?: 'CRITICAL' | 'MODERATE' | 'LOW'
  helpline?: string
}


export interface FloodMapRequest {
  district?: string
  center?: GeoPoint
  radiusKm?: number
}

export interface FloodFeature {
  type: 'Feature'
  properties: {
    hazard_type: string
    severity: string
    water_depth_est_meters?: number
    affected_villages?: string[]
  }
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
}

export interface FloodGeoJson {
  type: 'FeatureCollection'
  district?: string
  satellite_source?: string
  features: FloodFeature[]
}

export type DamageInfrastructureType =
  | 'broken_home'
  | 'gov_pipeline'
  | 'road_bridge'
  | 'electrical_power'
  | 'commercial_public'
  | 'agricultural'
  | 'other'

export type DamageGrade = 'DESTROYED' | 'MAJOR' | 'MINOR'

export interface DamageAssessmentReport {
  id: string
  claimId: string
  claimantName?: string
  claimantPhone: string
  infrastructureType: DamageInfrastructureType
  propertyAddress: string
  district: string
  latitude: number
  longitude: number
  photoUrl?: string
  damageGrade: DamageGrade
  damageScore: number // 0-100 points
  confidence: number // percentage e.g. 98.4
  compensationInr: number
  verified: boolean
  status: 'approved' | 'pending_review' | 'flagged_fraud'
  factors: string[]
  huggingFaceModel?: string
  createdAt: string
}

