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
// In-memory + localStorage persistent mock store.
// Mirrors the Express + FastAPI backends so the UI works end-to-end in demo mode.
// -----------------------------------------------------------------------------

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

const STORAGE_KEY_REPORTS = 'aapdasetu_mock_reports'
const STORAGE_KEY_CHECKINS = 'aapdasetu_mock_checkins'
const STORAGE_KEY_MISSING = 'aapdasetu_mock_missing'

const initialReports: Report[] = [

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
    status: 'resolved',
    priorityScore: 91,
    priorityLabel: 'RED',
    latitude: 22.576,
    longitude: 88.361,
    landmark: 'Salt Lake Stadium Gate 3',
    description: 'Cardiac patient requiring oxygen and urgent transport',
    reporterName: 'Suresh Bose',
    reporterPhone: '+91-9000000003',
    assignedVolunteerName: 'Priya Singh',
    assignedAgencyName: 'RG Kar Medical Hospital',
    resolutionNotes: 'Patient evacuated to RG Kar ICU, vitals stabilized.',
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

let reports: Report[] = loadLocal<Report[]>(STORAGE_KEY_REPORTS, initialReports)



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

let missingPersons: MissingPerson[] = loadLocal<MissingPerson[]>(STORAGE_KEY_MISSING, [
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
])

let checkins: SafetyCheckin[] = loadLocal<SafetyCheckin[]>(STORAGE_KEY_CHECKINS, [
  {
    id: 'chk-001',
    fullName: 'Ramesh Sen',
    phone: '+91-9876543210',
    status: 'safe',
    locationName: 'Salt Lake Community Hall',
    notes: 'Family is safe and evacuated to relief shelter',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'chk-002',
    fullName: 'Kavita Roy',
    phone: '+91-9876543211',
    status: 'need_assistance',
    locationName: 'Block B, Sector 2',
    notes: 'Power outage, elderly grandmother needs wheelchair assistance',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
])

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
    saveLocal(STORAGE_KEY_REPORTS, reports)
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
    saveLocal(STORAGE_KEY_REPORTS, reports)
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
    saveLocal(STORAGE_KEY_CHECKINS, checkins)
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
    saveLocal(STORAGE_KEY_MISSING, missingPersons)
    return person
  },

  updateMissingPerson(id: string, patch: Partial<MissingPerson>): MissingPerson | undefined {
    const idx = missingPersons.findIndex((m) => m.id === id)
    if (idx === -1) return undefined
    missingPersons[idx] = { ...missingPersons[idx], ...patch }
    saveLocal(STORAGE_KEY_MISSING, missingPersons)
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

  aiPfaChat(message: string, victimName = 'Friend'): {
    reply: string
    exerciseType?: string
    safetyChecklist?: string[]
    isCritical?: boolean
    helpline?: string
  } {
    const msg = message.toLowerCase().trim()

    // 1. Critical Emergency: Drowning / Water Submergence
    if (['drown', 'drowning', 'sink', 'sinking', 'swept away', 'water rising', 'submerged', 'water in house', 'डूब', 'पानी'].some((w) => msg.includes(w))) {
      return {
        reply: `🚨 CRITICAL FLOOD & DROWNING SURVIVAL PROTOCOL:
1. Stay Calm & Float: Turn onto your back, arch your back slightly, and spread your arms and legs wide in a Starfish Pose. Keep your chin pointing up and breathe steadily.
2. Discard Heavy Items: Kick off heavy boots/shoes and discard heavy jackets that pull you down.
3. Grab Floating Objects: Look for plastic water cans, wooden planks, thermocol, or sealed bottles to hug against your chest.
4. Signal Rescuers: Wave brightly colored cloth or blow a whistle. Do NOT swim against high-velocity currents; swim diagonally across the current towards high ground.

📞 Emergency Medical & Disaster Rescue Helpline: 108 / 112`,
        exerciseType: 'DROWNING_SURVIVAL_FLOAT',
        isCritical: true,
        helpline: '108',
        safetyChecklist: ['Float on back', 'Do not fight current', 'Keep face out of water', 'Call 108 immediately'],
      }
    }

    // 2. Critical Emergency: Trapped in Rubble / Collapse
    if (['trap', 'trapped', 'rubble', 'debris', 'collapse', 'crushed', 'stuck under', 'मलबे', 'दब'].some((w) => msg.includes(w))) {
      return {
        reply: `🚨 CRITICAL COLLAPSE & RESCUE PROTOCOL:
1. Protect Your Airway: Cover your mouth and nose with a cloth or shirt to prevent dust inhalation.
2. Conserve Energy & Oxygen: Do NOT shout continuously. Instead, tap in a rhythm of 3 (TAP-TAP-TAP) on metal pipes, beams, or walls using a stone or hard object. Rescuers with acoustic sensors listen for this.
3. Do NOT light matches or lighters — flammable gas leaks can ignite.
4. Protect Vital Organs: Curl into a fetal position if spaces are shifting.

📞 Emergency Disaster Relief Helpline: 108 / 112`,
        exerciseType: 'TRAPPED_SURVIVAL_ACOUSTIC',
        isCritical: true,
        helpline: '108',
        safetyChecklist: ['Cover nose/mouth', 'Tap in 3s on pipes', 'Avoid spark/open flame', 'Conserve oxygen'],
      }
    }

    // 3. Critical Emergency: Severe Bleeding / Trauma
    if (['bleed', 'bleeding', 'blood', 'hemorrhage', 'deep cut', 'wound', 'artery', 'stab', 'खून', 'रक्त'].some((w) => msg.includes(w))) {
      return {
        reply: `🚨 URGENT FIRST AID — SEVERE BLEEDING:
1. Apply Direct Pressure: Press a clean cloth, towel, or sterile gauze firmly against the wound with both hands. Maintain continuous pressure for at least 15 minutes without lifting.
2. Elevate: If the wound is on an arm or leg, elevate it above the heart while keeping pressure on it.
3. Pressure Bandage: Wrap firmly with a bandage or cloth. If blood soaks through, add another cloth on top — do NOT remove the first layer.
4. Keep Patient Warm: Lie the victim flat and cover them with a blanket to prevent hypothermia and hemorrhagic shock.

📞 Emergency Ambulance Helpline: 108`,
        exerciseType: 'HEMORRHAGE_CONTROL',
        isCritical: true,
        helpline: '108',
        safetyChecklist: ['Direct continuous pressure', 'Elevate limb', 'Do not remove soaked cloth', 'Call 108'],
      }
    }

    // 4. Critical Emergency: Chest Pain / Cardiac / Severe Breathing Trouble
    if (['chest pain', 'heart attack', 'cardiac', 'cant breathe', "can't breathe", 'cannot breathe', 'suffocating', 'unconscious', 'सीने', 'हार्ट'].some((w) => msg.includes(w))) {
      return {
        reply: `🚨 URGENT MEDICAL EMERGENCY — CARDIAC / AIRWAY DISTRESS:
1. Comfortable Position: Sit upright in a supported 'W' position with knees bent and back supported against a wall. Loosen tight collar, belt, or clothing.
2. Emergency Medication: If the person is conscious and has prescribed Sorbitrate / Aspirin, assist them in taking it.
3. Hands-Only CPR: If the person becomes completely unresponsive and stops breathing, place the heel of your hands in the center of the chest and push hard & fast (100–120 compressions per minute, 2 inches deep).

📞 Emergency Ambulance & Life Support: 108`,
        exerciseType: 'CARDIAC_LIFE_SUPPORT',
        isCritical: true,
        helpline: '108',
        safetyChecklist: ['Sit in W position', 'Loosen clothing', 'Be ready for CPR', 'Immediate 108 dispatch'],
      }
    }

    // 5. Critical Emergency: Fire / Burns / Gas Leak
    if (['fire', 'burn', 'smoke', 'gas leak', 'explosion', 'cylinder', 'आग', 'जल'].some((w) => msg.includes(w))) {
      return {
        reply: `🚨 CRITICAL FIRE & BURN PROTOCOL:
1. Smoke Inhalation: Crawl low on your knees; breathable cool air is within 1 to 2 feet of the floor. Cover your nose with a damp cloth.
2. Clothes on Fire: STOP, DROP to the ground, and ROLL back and forth to smother flames.
3. Burn First Aid: Pour cool running water over the burn for 15–20 minutes. Do NOT apply ice, butter, oil, or toothpaste.
4. Gas Leak: Turn off cylinder regulator valve immediately, open all windows, and do NOT flip any electrical switches or create sparks.

📞 Fire Emergency & Rescue: 108 / 112`,
        exerciseType: 'FIRE_EVACUATION_SAFETY',
        isCritical: true,
        helpline: '108',
        safetyChecklist: ['Crawl low under smoke', 'Cool burns with water 15m', 'Do not use electricity near gas', 'Call 108'],
      }
    }

    // 6. Critical Emergency: Electric Shock / Power Lines
    if (['electric', 'shock', 'live wire', 'power line', 'electrocution', 'करंट', 'बिजली'].some((w) => msg.includes(w))) {
      return {
        reply: `🚨 CRITICAL ELECTRICAL SAFETY WARNING:
1. Do NOT Touch: Never touch the victim directly with bare hands while they are in contact with the live current.
2. Cut Power: Switch off the main circuit breaker or trip switch immediately.
3. Insulated Separation: If power cannot be turned off, use a DRY wooden pole, PVC pipe, or rubber broom to push the wire away from the victim.
4. Submerged Water Hazard: Stay at least 10 meters (33 feet) away from water puddles containing downed power lines.

📞 Medical Ambulance & Power Emergency: 108 / 112`,
        exerciseType: 'ELECTRICAL_HAZARD_PROTOCOL',
        isCritical: true,
        helpline: '108',
        safetyChecklist: ['Do not touch victim barehanded', 'Cut main power', 'Use dry wood/plastic', 'Call 108'],
      }
    }

    // 7. Critical Emergency: Snakebite / Envenomation
    if (['snake', 'bite', 'venom', 'poison', 'सांप', 'डस'].some((w) => msg.includes(w))) {
      return {
        reply: `🚨 URGENT SNAKEBITE PROTOCOL:
1. Immobilize Immediately: Keep the patient completely still and calm; movement increases venom circulation.
2. Position Limb: Keep the bitten limb below the level of the heart.
3. Remove Constrictors: Remove rings, tight watches, or tight clothing around the limb before swelling begins.
4. STRICT WARNINGS: Do NOT cut the wound, do NOT suck venom, do NOT apply ice, and do NOT tie a tight tourniquet (use a broad pressure bandage instead).
5. Transport to nearest District Hospital equipped with Anti-Snake Venom (ASV).

📞 Emergency Hospital Transport: 108`,
        exerciseType: 'SNAKEBITE_MANAGEMENT',
        isCritical: true,
        helpline: '108',
        safetyChecklist: ['Immobilize limb below heart', 'Remove tight rings', 'Do NOT cut/suck', 'Immediate 108 ASV transfer'],
      }
    }

    // 8. Psychological First Aid: Panic / Anxiety / Shaking
    if (['panic', 'scared', 'fear', 'afraid', 'shaking', 'crying', 'dizzy', 'anxious', 'terrified', 'डर', 'घबराहट'].some((w) => msg.includes(w))) {
      return {
        reply: `I am here beside you, ${victimName}. It is completely natural to feel overwhelmed during a disaster, but you are not alone. Let's do a gentle breathing exercise together:

🌬️ 4-4-4 Box Breathing Cycle:
1. Inhale slowly through your nose for 4 seconds...
2. Hold that breath gently for 4 seconds...
3. Exhale smoothly through your mouth for 4 seconds...
4. Rest for 4 seconds...

Look around right now and name:
• 5 things you can see
• 4 things you can touch
• 3 sounds you can hear

You are resilient, you are doing your best, and rescue teams are actively operating across your area.`,
        exerciseType: 'BOX_BREATHING_AND_GROUNDING',
        isCritical: false,
        safetyChecklist: ['4-second breathing', '5-4-3-2-1 sensory grounding', 'Keep battery conserved'],
      }
    }

    // 9. Disaster Knowledge: Clean Drinking Water & Food Safety
    if (['water', 'drink', 'food', 'ration', 'hunger', 'प्यास', 'खाना', 'पानी'].some((w) => msg.includes(w))) {
      return {
        reply: `💧 FLOOD WATER SANITATION & FOOD SAFETY GUIDELINES:
1. Do NOT Drink Untreated Flood Water: Flood water carries sewage, bacteria (Cholera/Leptospirosis), and chemical toxins.
2. Purification Methods:
   • Boiling: Boil water vigorously for at least 1 full minute.
   • Chlorine Tablets (Halazone/Chlor-floc): 1 tablet per 20 liters of clear water; wait 30 minutes before drinking.
3. Food Protection: Discard any food that has come into contact with flood water unless stored in hermetically sealed metal cans (disinfect outside of can before opening).
4. Relief Supplies: Nearest community relief camps distribute clean drinking water and dry ration packets. Visit the Shelter Finder tab to locate the nearest distribution point.`,
        exerciseType: 'WATER_AND_FOOD_SAFETY',
        isCritical: false,
        safetyChecklist: ['Boil water 1 min', 'Use chlorine tablets', 'Discard submerged food', 'Check shelter supplies'],
      }
    }

    // 10. Evacuation & Shelter Finder Guidance
    if (['shelter', 'camp', 'where to go', 'evacuation', 'safe place', 'राहत', 'आश्रय', 'कहाँ'].some((w) => msg.includes(w))) {
      return {
        reply: `🏛️ SHELTER & EVACUATION ASSISTANCE:
1. Open Relief Shelters: Municipal schools, community centers, and cyclone shelters are active with emergency power, dry rations, sanitation, and medical first-aid desks.
2. Use Shelter Finder: Open the "Shelter Finder" tab in AapdaSetu to view live occupancy, facilities, and one-tap GPS navigation directions.
3. Evacuation Rules: Carry an Emergency Go-Bag with essential medicine, ID cards in a plastic ziplock, phone chargers, and a battery flashlight. Avoid walking through water over 6 inches deep.`,
        exerciseType: 'EVACUATION_ROUTING',
        isCritical: false,
        safetyChecklist: ['Check Shelter Finder tab', 'Pack medicine in ziplock', 'Follow safe routes', 'Wear sturdy footwear'],
      }
    }

    // Default Empathetic & Knowledgeable Emergency Companion
    return {
      reply: `Hello ${victimName}, I am your AapdaSetu emergency companion. I am trained in disaster psychological first aid, trauma stabilization, medical triage, flood survival, and relief logistics.

How can I best support you right now?
• If you or someone near you is in immediate physical danger, tell me what happened so I can provide instant survival steps and dispatch alert.
• If you need calming breathing, type "help me breathe".
• For medical emergency or ambulance, emergency helpline is 108 / 112.`,
      exerciseType: 'EMPATHETIC_LISTENING',
      isCritical: false,
      safetyChecklist: ['Stay calm', 'Conserve battery', 'Signal with light/whistle', 'Helpline 108 available'],
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
