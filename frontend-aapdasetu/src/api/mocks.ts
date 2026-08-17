import type {
  Agency,
  Alert,
  AnalyticsData,
  AuditLog,
  BroadcastPayload,
  DamageAssessmentReport,
  DamageInfrastructureType,
  DamageGrade,
  FloodGeoJson,
  MissingPerson,
  OverviewKPIs,
  PfaChatResponse,
  Report,
  ReportInput,
  SafetyCheckin,
  Shelter,
  TriageResult,
  Volunteer,
} from '../types'
import { computeTriage } from '../lib/triage'
import { generateTrackingId } from '../lib/helpers'
import { emitRealtimeUpdate } from '../lib/realtimeEventBus'

// -----------------------------------------------------------------------------
// Persistent mock store with 1000+ realistic records & realtime event emissions.
// -----------------------------------------------------------------------------

function loadLocal<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      const initial = fallback()
      saveLocal(key, initial)
      return initial
    }
    return JSON.parse(raw) as T
  } catch {
    return fallback()
  }
}

function saveLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch (err) {
    // Ignore localStorage quota errors in private browsing
    void err
  }
}

const STORAGE_VERSION = 'v4'
const STORAGE_KEY_VERSION = 'aapdasetu_data_version'
const STORAGE_KEY_REPORTS = `aapdasetu_mock_reports_${STORAGE_VERSION}`
const STORAGE_KEY_SHELTERS = `aapdasetu_mock_shelters_${STORAGE_VERSION}`
const STORAGE_KEY_VOLUNTEERS = `aapdasetu_mock_volunteers_${STORAGE_VERSION}`
const STORAGE_KEY_CHECKINS = `aapdasetu_mock_checkins_${STORAGE_VERSION}`
const STORAGE_KEY_MISSING = `aapdasetu_mock_missing_${STORAGE_VERSION}`
const STORAGE_KEY_ALERTS = `aapdasetu_mock_alerts_${STORAGE_VERSION}`
const STORAGE_KEY_AGENCIES = `aapdasetu_mock_agencies_${STORAGE_VERSION}`
const STORAGE_KEY_AUDIT = `aapdasetu_mock_audit_${STORAGE_VERSION}`
const STORAGE_KEY_DAMAGE = `aapdasetu_mock_damage_${STORAGE_VERSION}`

if (typeof window !== 'undefined') {
  const currentVer = localStorage.getItem(STORAGE_KEY_VERSION)
  if (currentVer !== STORAGE_VERSION) {
    localStorage.setItem(STORAGE_KEY_VERSION, STORAGE_VERSION)
  }
}

// -----------------------------------------------------------------------------
// 1000+ REALISTIC SECTOR RECORDS GENERATOR
// -----------------------------------------------------------------------------

const DISASTER_SECTORS = [
  { city: 'Kolkata - Salt Lake', lat: 22.5726, lng: 88.3639 },
  { city: 'Kolkata - New Town', lat: 22.579, lng: 88.378 },
  { city: 'Kolkata - Bidhannagar', lat: 22.567, lng: 88.401 },
  { city: 'Kolkata - Howrah', lat: 22.5958, lng: 88.2636 },
  { city: 'Kolkata - Dum Dum', lat: 22.642, lng: 88.396 },
  { city: 'North 24 Parganas - Barasat', lat: 22.723, lng: 88.481 },
  { city: 'Sundarbans Coastal', lat: 22.185, lng: 88.752 },
  { city: 'Bhubaneswar - Central', lat: 20.2961, lng: 85.8245 },
  { city: 'Bhubaneswar - Kalinga Nagar', lat: 20.2934, lng: 85.817 },
  { city: 'Bhubaneswar - Patia', lat: 20.355, lng: 85.818 },
  { city: 'Bhubaneswar - Rasulgarh', lat: 20.301, lng: 85.865 },
  { city: 'Cuttack - Badambadi', lat: 20.4625, lng: 85.883 },
  { city: 'Puri - Coastal Relief', lat: 19.8135, lng: 85.8312 },
  { city: 'Patna - Ganga Belt', lat: 25.5941, lng: 85.1376 },
  { city: 'Guwahati - Brahmaputra', lat: 26.1445, lng: 91.7362 },
]

const FIRST_NAMES = ['Aarav', 'Priya', 'Rahul', 'Sneha', 'Ramesh', 'Sunita', 'Amit', 'Ananya', 'Mohammed', 'Fatima', 'Bikram', 'Rojalin', 'Subhash', 'Deepa', 'Manoj', 'Kavita', 'Sanjay', 'Pooja', 'Tanmay', 'Meenakshi', 'Arjun', 'Ipsita', 'Debabrata', 'Padmini', 'Alok', 'Rinki']
const LAST_NAMES = ['Das', 'Mohanty', 'Sharma', 'Patel', 'Sen', 'Banerjee', 'Ghosh', 'Chatterjee', 'Sahoo', 'Behera', 'Patnaik', 'Nayak', 'Mishra', 'Rout', 'Bose', 'Gupta', 'Singh', 'Ali', 'Khan', 'Roy', 'Dutta', 'Panda', 'Swain', 'Jena']

const EMERGENCY_TEMPLATES: Array<{
  type: Report['type']
  priority: Report['priorityLabel']
  scoreMin: number
  scoreMax: number
  descriptions: string[]
}> = [
  {
    type: 'flood',
    priority: 'RED',
    scoreMin: 80,
    scoreMax: 98,
    descriptions: [
      'Flood water entered 1st floor, 4 family members trapped on roof including infant.',
      'Flash flood current washed away access road, 6 elderly villagers stranded.',
      'Water level rising 1 foot every 30 mins, need immediate evacuation boat.',
      'Submerged ground floor apartment, elderly heart patient without electricity or food.',
      'Embankment breach near canal, water gushing into low-lying residential sector.',
    ],
  },
  {
    type: 'medical',
    priority: 'RED',
    scoreMin: 85,
    scoreMax: 99,
    descriptions: [
      'Pregnant woman in active labor, all surrounding roads waterlogged, need urgent ambulance.',
      'Severe head injury from falling roof beam, unconscious and bleeding.',
      'Elderly patient with acute respiratory distress, oxygen cylinder exhausted.',
      'Snakebite in flood water, patient losing consciousness, anti-venom required urgently.',
      'Diabetic coma victim, emergency insulin and IV fluids needed.',
    ],
  },
  {
    type: 'fire',
    priority: 'RED',
    scoreMin: 85,
    scoreMax: 96,
    descriptions: [
      'LPG cylinder blast in flooded residential complex, smoke spreading to upper floors.',
      'Electrical short circuit ignited roof thatch, 3 people trapped in back room.',
      'Transformer explosion near relief shelter, active flames blocking exit gate.',
    ],
  },
  {
    type: 'earthquake',
    priority: 'RED',
    scoreMin: 88,
    scoreMax: 99,
    descriptions: [
      '2-story building partially collapsed, acoustic tapping heard from beneath concrete slab.',
      'Stairwell caved in, 8 occupants trapped on 3rd floor balcony.',
      'Boundary wall collapse crushed parked vehicles and trapped pedestrian.',
    ],
  },
  {
    type: 'missing_person',
    priority: 'YELLOW',
    scoreMin: 55,
    scoreMax: 78,
    descriptions: [
      '8-year-old child got separated during mass evacuation near bus stand.',
      'Elderly man with dementia went missing after leaving relief camp at 4 PM.',
      'Family member was walking through flood water and has not returned for 3 hours.',
    ],
  },
  {
    type: 'accident',
    priority: 'YELLOW',
    scoreMin: 60,
    scoreMax: 82,
    descriptions: [
      'Rescue tractor overturned in waterlogged ditch, driver has leg fracture.',
      'Relief supply truck collided with fallen banyan tree, driver trapped inside cabin.',
      'Civilian evacuation boat engine failed in strong river current.',
    ],
  },
  {
    type: 'other',
    priority: 'GREEN',
    scoreMin: 30,
    scoreMax: 55,
    descriptions: [
      'Fallen power lines hanging in knee-deep water across main road.',
      'Community clean water pipeline broken, 40 families need drinking water packets.',
      'Relief camp requesting baby milk formula and sanitary supplies.',
    ],
  },
]

function generate1000Reports(): Report[] {
  const list: Report[] = []

  // 1. Seed live demo reports first
  list.push(
    {
      id: 'rep-live-001',
      trackingId: 'SOS-9910',
      type: 'flood',
      status: 'pending',
      priorityScore: 95,
      priorityLabel: 'RED',
      latitude: 22.5726,
      longitude: 88.3639,
      landmark: 'Salt Lake Sector V, Block EP',
      description: 'Water rising rapidly, 5 family members including 80yo grandmother trapped on roof.',
      reporterName: 'Sunita Mohanty',
      reporterPhone: '+91-9876543210',
      source: 'sos',
      createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    },
    {
      id: 'rep-live-002',
      trackingId: 'SOS-8821',
      type: 'medical',
      status: 'in_progress',
      priorityScore: 92,
      priorityLabel: 'RED',
      latitude: 22.579,
      longitude: 88.378,
      landmark: 'New Town Action Area 1, Near Axis Mall',
      description: 'Pregnant woman in labor, surrounded by 4ft water. Rapid boat ambulance required.',
      reporterName: 'Mohammed Ali',
      reporterPhone: '+91-9123456780',
      assignedVolunteerName: 'Rahul Sharma',
      assignedAgencyName: 'NDRF 2nd Battalion',
      source: 'sos',
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: 'rep-live-003',
      trackingId: 'SOS-7734',
      type: 'earthquake',
      status: 'in_progress',
      priorityScore: 89,
      priorityLabel: 'RED',
      latitude: 20.2961,
      longitude: 85.8245,
      landmark: 'Janata Maidan Sector 3, Bhubaneswar',
      description: 'Building wall collapsed on ground floor, 2 persons trapped under debris.',
      reporterName: 'Bikram Das',
      reporterPhone: '+91-9437123456',
      assignedVolunteerName: 'Priya Singh',
      assignedAgencyName: 'Odisha Fire & Disaster Response',
      source: 'sos',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'rep-live-004',
      trackingId: 'SOS-6645',
      type: 'missing_person',
      status: 'resolved',
      priorityScore: 55,
      priorityLabel: 'YELLOW',
      latitude: 22.567,
      longitude: 88.401,
      landmark: 'Bidhannagar Stadium Gate 2',
      description: 'Elderly man separated during cyclone evacuation. Reunited at Shelter #02.',
      reporterName: 'Suresh Bose',
      reporterPhone: '+91-9988776655',
      assignedVolunteerName: 'Rahul Sharma',
      assignedAgencyName: 'Red Cross India',
      resolutionNotes: 'Citizen located and safely escorted back to family.',
      source: 'form',
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    }
  )

  // 2. Generate 1,020 realistic randomized reports across disaster zones
  for (let i = 1; i <= 1020; i++) {
    const tmpl = EMERGENCY_TEMPLATES[i % EMERGENCY_TEMPLATES.length]
    const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length]
    const fName = FIRST_NAMES[i % FIRST_NAMES.length]
    const lName = LAST_NAMES[(i * 3) % LAST_NAMES.length]
    const desc = tmpl.descriptions[i % tmpl.descriptions.length]

    const lat = sector.lat + Math.sin(i * 12.34) * 0.04
    const lng = sector.lng + Math.cos(i * 56.78) * 0.04

    const score = Math.floor(tmpl.scoreMin + ((i * 7) % (tmpl.scoreMax - tmpl.scoreMin + 1)))
    const status: Report['status'] = i % 7 === 0 ? 'resolved' : i % 3 === 0 ? 'in_progress' : 'pending'

    const timeAgoMs = 1000 * 60 * (i * 14 + (i % 60))
    const createdAt = new Date(Date.now() - timeAgoMs).toISOString()
    const trackingHex = ((i * 16807 + 12345) % 0xffffff).toString(16).toUpperCase().padStart(6, '0')

    list.push({
      id: `rep-gen-${i.toString().padStart(4, '0')}`,
      trackingId: `SOS-${trackingHex}`,
      type: tmpl.type,
      status,
      priorityScore: score,
      priorityLabel: tmpl.priority,
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      landmark: `${sector.city}, Sector ${(i % 12) + 1}`,
      description: `${desc} [Triage Urgency: ${score}/100]`,
      reporterName: `${fName} ${lName}`,
      reporterPhone: `+91-9${(100000000 + ((i * 987654) % 899999999)).toString()}`,
      assignedVolunteerName: status !== 'pending' ? FIRST_NAMES[(i + 2) % FIRST_NAMES.length] + ' ' + LAST_NAMES[(i + 2) % LAST_NAMES.length] : undefined,
      assignedAgencyName: status !== 'pending' ? (i % 2 === 0 ? 'NDRF Response Force' : 'State Disaster Emergency Team') : undefined,
      resolutionNotes: status === 'resolved' ? 'Evacuation completed successfully. Safe in relief camp.' : undefined,
      source: i % 2 === 0 ? 'sos' : 'form',
      createdAt,
    })
  }

  return list
}

const initialShelters: Shelter[] = [
  {
    id: 'shel-001',
    name: 'Sector V Community Relief Center',
    address: 'Block EP & GP, Sector V, Salt Lake, Kolkata',
    latitude: 22.574,
    longitude: 88.365,
    capacity: 500,
    occupancy: 210,
    facilities: ['food', 'water', 'medical_station', 'power_generator'],
    contactPhone: '+91-33-23570001',
    status: 'open',
  },
  {
    id: 'shel-002',
    name: 'New Town Higher Secondary Shelter',
    address: 'Action Area 1, New Town, Kolkata',
    latitude: 22.579,
    longitude: 88.378,
    capacity: 350,
    occupancy: 340,
    facilities: ['food', 'water', 'power_generator'],
    contactPhone: '+91-33-23570002',
    status: 'full',
  },
  {
    id: 'shel-003',
    name: 'Bidhannagar Central Stadium Relief Camp',
    address: 'Salt Lake Stadium Complex, Bidhannagar',
    latitude: 22.567,
    longitude: 88.401,
    capacity: 1200,
    occupancy: 450,
    facilities: ['food', 'water', 'medical_station', 'power_generator'],
    contactPhone: '+91-33-23570003',
    status: 'open',
  },
  {
    id: 'shel-004',
    name: 'Janata Maidan Disaster Emergency Camp',
    address: 'Janata Maidan, Jayadev Vihar, Bhubaneswar',
    latitude: 20.2961,
    longitude: 85.8245,
    capacity: 800,
    occupancy: 310,
    facilities: ['food', 'water', 'medical_station', 'power_generator'],
    contactPhone: '+91-674-2531101',
    status: 'open',
  },
  {
    id: 'shel-005',
    name: 'Kalinga Stadium Evacuation Center',
    address: 'Kalinga Stadium, Bhubaneswar',
    latitude: 20.2934,
    longitude: 85.817,
    capacity: 1000,
    occupancy: 150,
    facilities: ['food', 'water', 'medical_station', 'power_generator'],
    contactPhone: '+91-674-2531102',
    status: 'open',
  },
  {
    id: 'shel-006',
    name: 'Howrah District Indoor Stadium Shelter',
    address: 'Howrah Station Road, Howrah',
    latitude: 22.5958,
    longitude: 88.2636,
    capacity: 600,
    occupancy: 420,
    facilities: ['food', 'water', 'medical_station'],
    contactPhone: '+91-33-26601004',
    status: 'open',
  },
  {
    id: 'shel-007',
    name: 'Barasat Sub-Divisional Hospital Relief Wing',
    address: 'Barasat High Road, North 24 Parganas',
    latitude: 22.723,
    longitude: 88.481,
    capacity: 400,
    occupancy: 395,
    facilities: ['medical_station', 'water', 'power_generator'],
    contactPhone: '+91-33-25841005',
    status: 'full',
  },
  {
    id: 'shel-008',
    name: 'Sundarbans Coastal Cyclone Shelter #04',
    address: 'Gosaba Ferry Ghat, Sundarbans',
    latitude: 22.185,
    longitude: 88.752,
    capacity: 450,
    occupancy: 120,
    facilities: ['food', 'water', 'medical_station', 'power_generator'],
    contactPhone: '+91-3218-230008',
    status: 'open',
  },
]

const initialVolunteers: Volunteer[] = [
  { id: 'vol-001', name: 'Rahul Sharma', phone: '+91-9876500001', skills: ['medical', 'search_rescue'], latitude: 22.573, longitude: 88.364, status: 'on_duty' },
  { id: 'vol-002', name: 'Priya Singh', phone: '+91-9876500002', skills: ['medical', 'logistics'], latitude: 22.578, longitude: 88.375, status: 'available' },
  { id: 'vol-003', name: 'Bikram Nayak', phone: '+91-9876500003', skills: ['driving', 'search_rescue'], latitude: 20.296, longitude: 85.824, status: 'available' },
  { id: 'vol-004', name: 'Sunita Behera', phone: '+91-9876500004', skills: ['medical'], latitude: 20.291, longitude: 85.815, status: 'on_duty' },
  { id: 'vol-005', name: 'Debabrata Ghosh', phone: '+91-9876500005', skills: ['driving', 'logistics'], latitude: 22.595, longitude: 88.263, status: 'available' },
  { id: 'vol-006', name: 'Arjun Patnaik', phone: '+91-9876500006', skills: ['search_rescue'], latitude: 20.355, longitude: 85.818, status: 'offline' },
]

const initialAgencies: Agency[] = [
  { id: 'agency-001', name: 'NDRF 2nd Battalion Command', type: 'ndrf', contactPhone: '+91-33-23241100', jurisdiction: 'Eastern Sector & Gangetic Coast' },
  { id: 'agency-002', name: 'State Disaster Response Force (SDRF)', type: 'ndrf', contactPhone: '+91-674-2531000', jurisdiction: 'State Rapid Response' },
  { id: 'agency-003', name: 'National Fire & Rescue Services', type: 'fire_department', contactPhone: '101', jurisdiction: 'Urban & Industrial Zones' },
  { id: 'agency-004', name: 'Emergency Medical Ambulance Network', type: 'hospital', contactPhone: '108', jurisdiction: 'Advanced Life Support' },
  { id: 'agency-005', name: 'Red Cross Disaster Relief Mission', type: 'ngo', contactPhone: '+91-11-23716441', jurisdiction: 'Humanitarian Shelter Aid' },
]

const initialAlerts: Alert[] = [
  {
    id: 'alert-001',
    title: 'Extreme Inundation Warning — High River Discharge',
    message: 'Continuous heavy rainfall has caused rapid river swelling. Low-lying sectors should immediately move to designated multi-story relief shelters.',
    severity: 'critical',
    channel: 'all',
    region: 'Kolkata, North 24 Parganas, Howrah',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'alert-002',
    title: 'Severe Weather Bulletin: Wind Gusts up to 85 km/h',
    message: 'Avoid standing near high-voltage electrical lines, old trees, or tin roofs. Stay indoors on high ground.',
    severity: 'warning',
    channel: 'all',
    region: 'Coastal Districts & Delta Zone',
    createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
  },
  {
    id: 'alert-003',
    title: 'Relief Shelters Operational with Free Food & Medical Aid',
    message: 'All 8 primary relief camps in Bidhannagar, New Town, and Bhubaneswar are equipped with power generators, clean water, and 24/7 doctors.',
    severity: 'info',
    channel: 'public',
    region: 'All Municipal Sectors',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
]

const initialCheckins: SafetyCheckin[] = [
  { id: 'chk-001', fullName: 'Anita Banerjee', phone: '+91-9876543211', locationName: 'Sector V Community Hall', notes: 'Safe with 3 kids and parents. Camp has food and medical aid.', status: 'safe', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 'chk-002', fullName: 'Manoj Kumar Sahoo', phone: '+91-9437100022', locationName: 'Janata Maidan Camp', notes: 'Evacuated from low area. Power on.', status: 'safe', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: 'chk-003', fullName: 'Sanjay Gupta', phone: '+91-9123400033', locationName: 'At Home 2nd Floor', notes: 'Water in ground floor, but we have supplies for 3 days.', status: 'safe', createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
]

const initialMissing: MissingPerson[] = [
  { id: 'mp-001', name: 'Rohan Sen', age: 11, gender: 'male', lastSeenLocation: 'Near New Town Axis Mall', clothes: 'Yellow T-shirt, black shorts', contactPhone: '+91-9876543210', status: 'open' },
  { id: 'mp-002', name: 'Gopal Chandra Das', age: 74, gender: 'male', lastSeenLocation: 'Bidhannagar Bus Terminus', clothes: 'White dhoti-kurta, wooden cane', contactPhone: '+91-9988776655', status: 'open' },
]

const initialDamageReports: DamageAssessmentReport[] = [
  {
    id: 'dmg-001',
    claimId: 'SDRF-2026-N24P-8921',
    claimantName: 'Sourav Ganguly',
    claimantPhone: '+91-9830012345',
    infrastructureType: 'broken_home',
    propertyAddress: 'Holding 42/B, Barasat Main Road, Ward 7',
    district: 'North 24 Parganas',
    latitude: 22.723,
    longitude: 88.481,
    damageGrade: 'DESTROYED',
    damageScore: 96.5,
    confidence: 98.4,
    compensationInr: 95100,
    verified: true,
    status: 'approved',
    factors: ['Load-bearing brick pillar fracture > 40mm', 'Complete roof truss collapse', 'Severe foundation washout'],
    huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'dmg-002',
    claimId: 'SDRF-2026-HOW-4112',
    claimantName: 'Debabrata Mukherjee',
    claimantPhone: '+91-9831122334',
    infrastructureType: 'gov_pipeline',
    propertyAddress: 'Near Public Health Engineering Water Pump Station, Shibpur',
    district: 'Howrah',
    latitude: 22.583,
    longitude: 88.305,
    damageGrade: 'MAJOR',
    damageScore: 78.0,
    confidence: 97.8,
    compensationInr: 47550,
    verified: true,
    status: 'approved',
    factors: ['Main drinking water distribution pipe ruptured (600mm dia)', 'Water contamination risk in 4 blocks', 'High pressure leakage'],
    huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'dmg-003',
    claimId: 'SDRF-2026-SUN-1092',
    claimantName: 'Manmatha Mondal',
    claimantPhone: '+91-9733001122',
    infrastructureType: 'broken_home',
    propertyAddress: 'Village Gosaba, Near River Embankment',
    district: 'Sundarbans Coastal',
    latitude: 22.165,
    longitude: 88.805,
    damageGrade: 'DESTROYED',
    damageScore: 98.2,
    confidence: 99.1,
    compensationInr: 95100,
    verified: true,
    status: 'approved',
    factors: ['Tidal surge washed away ground floor structures', 'Complete wall collapse', 'Mudbrick foundation disintegration'],
    huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
    createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
  },
  {
    id: 'dmg-004',
    claimId: 'SDRF-2026-KOL-7781',
    claimantName: 'Aparna Sen',
    claimantPhone: '+91-9830554433',
    infrastructureType: 'road_bridge',
    propertyAddress: 'Eastern Metropolitan Bypass Culvert Connector',
    district: 'Kolkata',
    latitude: 22.535,
    longitude: 88.398,
    damageGrade: 'MAJOR',
    damageScore: 82.5,
    confidence: 98.2,
    compensationInr: 47550,
    verified: true,
    status: 'pending_review',
    factors: ['Culvert approach road washed away', 'Sub-base soil erosion > 2.5m', 'Vehicular movement halted'],
    huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'dmg-005',
    claimId: 'SDRF-2026-S24P-3319',
    claimantName: 'Subhas Chandra Bera',
    claimantPhone: '+91-9434112200',
    infrastructureType: 'electrical_power',
    propertyAddress: 'Canning 33kV Sub-Station Feeder Grid',
    district: 'South 24 Parganas',
    latitude: 22.312,
    longitude: 88.658,
    damageGrade: 'DESTROYED',
    damageScore: 94.0,
    confidence: 98.9,
    compensationInr: 95100,
    verified: true,
    status: 'approved',
    factors: ['3 High-tension transmission towers snapped', 'Transformer oil tank submerged and exploded'],
    huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
    createdAt: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
  },
  {
    id: 'dmg-006',
    claimId: 'SDRF-2026-N24P-9903',
    claimantName: 'Kabir Hossain',
    claimantPhone: '+91-9836110022',
    infrastructureType: 'broken_home',
    propertyAddress: 'Basirhat Ward 3, Near Taki Ghat Road',
    district: 'North 24 Parganas',
    latitude: 22.658,
    longitude: 88.892,
    damageGrade: 'DESTROYED',
    damageScore: 95.0,
    confidence: 98.5,
    compensationInr: 95100,
    verified: true,
    status: 'approved',
    factors: ['Boundary wall collapsed on residential room', 'Roof slab cracked through center'],
    huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
  {
    id: 'dmg-007',
    claimId: 'SDRF-2026-HGL-2201',
    claimantName: 'Prabhat Roy',
    claimantPhone: '+91-9832445566',
    infrastructureType: 'gov_pipeline',
    propertyAddress: 'Chinsurah Municipal Water Line Grid 4',
    district: 'Hooghly',
    latitude: 22.902,
    longitude: 88.396,
    damageGrade: 'MAJOR',
    damageScore: 74.0,
    confidence: 97.5,
    compensationInr: 47550,
    verified: true,
    status: 'pending_review',
    factors: ['Underground drainage pipeline cracked from soil subsidence', 'Street flooding with sludge'],
    huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'dmg-008',
    claimId: 'SDRF-2026-KOL-5541',
    claimantName: 'Rameshwar Lal',
    claimantPhone: '+91-9830887766',
    infrastructureType: 'commercial_public',
    propertyAddress: 'Sector V RDB Boulevard Market Ground Floor',
    district: 'Kolkata',
    latitude: 22.581,
    longitude: 88.428,
    damageGrade: 'MINOR',
    damageScore: 32.0,
    confidence: 98.1,
    compensationInr: 9800,
    verified: true,
    status: 'approved',
    factors: ['Ground floor water ingress 0.4m', 'Shutter distortion', 'Minor interior wall moisture degradation'],
    huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
    createdAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
  },
]

// -----------------------------------------------------------------------------
// PERSISTENT DATA CONTAINERS
// -----------------------------------------------------------------------------

let reportsStore: Report[] = loadLocal<Report[]>(STORAGE_KEY_REPORTS, generate1000Reports)
let sheltersStore: Shelter[] = loadLocal<Shelter[]>(STORAGE_KEY_SHELTERS, () => initialShelters)
let volunteersStore: Volunteer[] = loadLocal<Volunteer[]>(STORAGE_KEY_VOLUNTEERS, () => initialVolunteers)
let agenciesStore: Agency[] = loadLocal<Agency[]>(STORAGE_KEY_AGENCIES, () => initialAgencies)
let alertsStore: Alert[] = loadLocal<Alert[]>(STORAGE_KEY_ALERTS, () => initialAlerts)
let checkinsStore: SafetyCheckin[] = loadLocal<SafetyCheckin[]>(STORAGE_KEY_CHECKINS, () => initialCheckins)
let missingStore: MissingPerson[] = loadLocal<MissingPerson[]>(STORAGE_KEY_MISSING, () => initialMissing)
let damageStore: DamageAssessmentReport[] = loadLocal<DamageAssessmentReport[]>(STORAGE_KEY_DAMAGE, () => initialDamageReports)
let auditStore: AuditLog[] = loadLocal<AuditLog[]>(STORAGE_KEY_AUDIT, () => [
  { id: 'aud-001', adminEmail: 'admin@aapdasetu.org', action: 'SYSTEM_BOOTSTRAP', entityType: 'SYSTEM', details: { msg: 'Incident command network initialized' }, createdAt: new Date().toISOString() },
])

// -----------------------------------------------------------------------------
// PUBLIC MOCKS INTERFACE
// -----------------------------------------------------------------------------

export const mocks = {
  // ---- Reports ----
  listReports(filters?: { type?: string; priority?: string; status?: string; q?: string }): Report[] {
    let res = [...reportsStore]
    if (filters?.type) res = res.filter((r) => r.type === filters.type)
    if (filters?.priority) res = res.filter((r) => r.priorityLabel === filters.priority)
    if (filters?.status) res = res.filter((r) => r.status === filters.status)
    if (filters?.q) {
      const query = filters.q.toLowerCase()
      res = res.filter(
        (r) =>
          r.trackingId.toLowerCase().includes(query) ||
          (r.landmark && r.landmark.toLowerCase().includes(query)) ||
          (r.description && r.description.toLowerCase().includes(query)) ||
          (r.reporterName && r.reporterName.toLowerCase().includes(query))
      )
    }
    return res
  },

  getReport(trackingId: string): Report | undefined {
    const clean = trackingId.toUpperCase().trim()
    return reportsStore.find((r) => r.trackingId.toUpperCase() === clean || r.id === clean)
  },

  createReport(input: ReportInput): Report {
    const triage = computeTriage({
      type: input.type,
      description: input.description,
      isOneTapSos: input.isOneTapSos,
    })

    const lat = input.location?.lat ?? 22.5726
    const lng = input.location?.lng ?? 88.3639

    const newRep: Report = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      trackingId: generateTrackingId(),
      type: input.type,
      status: 'pending',
      priorityScore: triage.score,
      priorityLabel: triage.label,
      latitude: lat,
      longitude: lng,
      landmark: input.landmark,
      description: input.description,
      reporterName: input.reporterName,
      reporterPhone: input.reporterPhone,
      source: input.isOneTapSos ? 'sos' : 'form',
      createdAt: new Date().toISOString(),
    }

    reportsStore = [newRep, ...reportsStore]
    saveLocal(STORAGE_KEY_REPORTS, reportsStore)
    emitRealtimeUpdate('report_created', newRep.id, newRep)
    return newRep
  },

  updateReport(id: string, patch: Partial<Report>): Report | undefined {
    const rep = reportsStore.find((r) => r.id === id || r.trackingId === id)
    if (!rep) return undefined
    Object.assign(rep, patch)
    rep.updatedAt = new Date().toISOString()
    saveLocal(STORAGE_KEY_REPORTS, reportsStore)
    emitRealtimeUpdate('report_updated', rep.id, rep)
    return rep
  },

  updateReportStatus(id: string, status: Report['status'], notes?: string): Report | undefined {
    const rep = reportsStore.find((r) => r.id === id || r.trackingId === id)
    if (!rep) return undefined
    rep.status = status
    if (notes) rep.resolutionNotes = notes
    rep.updatedAt = new Date().toISOString()
    saveLocal(STORAGE_KEY_REPORTS, reportsStore)
    emitRealtimeUpdate('report_updated', rep.id, rep)
    return rep
  },

  assignVolunteer(reportId: string, volunteerId: string, agencyId?: string): Report | undefined {
    const rep = reportsStore.find((r) => r.id === reportId || r.trackingId === reportId)
    if (!rep) return undefined
    const vol = volunteersStore.find((v) => v.id === volunteerId)
    const agency = agencyId ? agenciesStore.find((a) => a.id === agencyId) : undefined

    rep.assignedVolunteerId = volunteerId
    rep.assignedVolunteerName = vol?.name
    if (agency) {
      rep.assignedAgencyId = agency.id
      rep.assignedAgencyName = agency.name
    }
    rep.status = 'in_progress'
    rep.updatedAt = new Date().toISOString()
    saveLocal(STORAGE_KEY_REPORTS, reportsStore)
    emitRealtimeUpdate('report_assigned', rep.id, rep)
    return rep
  },

  // ---- Shelters (Admin Full Control) ----
  listShelters(status?: string, includeHidden = false): Shelter[] {
    let res = [...sheltersStore]
    if (!includeHidden) {
      if (status) {
        res = res.filter((s) => s.status === status)
      } else {
        res = res.filter((s) => s.status !== 'closed')
      }
    } else if (status) {
      res = res.filter((s) => s.status === status)
    }
    return res
  },

  getShelter(id: string): Shelter | undefined {
    return sheltersStore.find((s) => s.id === id)
  },

  createShelter(input: Omit<Shelter, 'id'>): Shelter {
    const newShelter: Shelter = {
      ...input,
      id: `shel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: input.status || (input.occupancy >= input.capacity ? 'full' : 'open'),
    }
    sheltersStore = [newShelter, ...sheltersStore]
    saveLocal(STORAGE_KEY_SHELTERS, sheltersStore)
    emitRealtimeUpdate('shelter_created', newShelter.id, newShelter)
    return newShelter
  },

  updateShelter(id: string, patch: Partial<Shelter>): Shelter | undefined {
    const s = sheltersStore.find((item) => item.id === id)
    if (!s) return undefined
    Object.assign(s, patch)
    if (patch.occupancy !== undefined && patch.status === undefined) {
      s.status = s.occupancy >= s.capacity ? 'full' : 'open'
    }
    saveLocal(STORAGE_KEY_SHELTERS, sheltersStore)
    emitRealtimeUpdate('shelter_updated', s.id, s)
    return s
  },

  deleteShelter(id: string): boolean {
    const initialLen = sheltersStore.length
    sheltersStore = sheltersStore.filter((s) => s.id !== id)
    saveLocal(STORAGE_KEY_SHELTERS, sheltersStore)
    emitRealtimeUpdate('shelter_deleted', id)
    return sheltersStore.length < initialLen
  },

  // ---- Volunteers ----
  listVolunteers(status?: string): Volunteer[] {
    if (status) return volunteersStore.filter((v) => v.status === status)
    return volunteersStore
  },

  updateVolunteer(id: string, patch: Partial<Volunteer>): Volunteer | undefined {
    const v = volunteersStore.find((item) => item.id === id)
    if (!v) return undefined
    Object.assign(v, patch)
    saveLocal(STORAGE_KEY_VOLUNTEERS, volunteersStore)
    emitRealtimeUpdate('volunteer_updated', v.id, v)
    return v
  },

  updateVolunteerStatus(id: string, status: Volunteer['status']): Volunteer | undefined {
    return this.updateVolunteer(id, { status })
  },

  // ---- Agencies ----
  listAgencies(): Agency[] {
    return agenciesStore
  },

  // ---- Alerts ----
  listAlerts(): Alert[] {
    return alertsStore
  },

  createAlert(alert: Omit<Alert, 'id' | 'createdAt'>): Alert {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    alertsStore = [newAlert, ...alertsStore]
    saveLocal(STORAGE_KEY_ALERTS, alertsStore)
    emitRealtimeUpdate('alert_created', newAlert.id, newAlert)
    return newAlert
  },

  broadcast(payload: BroadcastPayload): { delivered: number; channels: string[] } {
    const newAlert: Alert = {
      id: `alert-${Date.now()}`,
      title: payload.title,
      message: payload.body,
      severity: payload.severity,
      channel: payload.channels[0] ?? 'all',
      region: payload.region,
      createdAt: new Date().toISOString(),
    }
    alertsStore = [newAlert, ...alertsStore]
    saveLocal(STORAGE_KEY_ALERTS, alertsStore)
    emitRealtimeUpdate('alert_created', newAlert.id, newAlert)
    return { delivered: 1, channels: payload.channels }
  },

  // ---- Safety Checkins ----
  listSafetyCheckins(): SafetyCheckin[] {
    return checkinsStore
  },

  createSafetyCheckin(input: Omit<SafetyCheckin, 'id' | 'createdAt'>): SafetyCheckin {
    const newCheckin: SafetyCheckin = {
      ...input,
      id: `chk-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    checkinsStore = [newCheckin, ...checkinsStore]
    saveLocal(STORAGE_KEY_CHECKINS, checkinsStore)
    emitRealtimeUpdate('checkin_created', newCheckin.id, newCheckin)
    return newCheckin
  },

  // ---- Missing Persons ----
  listMissingPersons(): MissingPerson[] {
    return missingStore
  },

  createMissingPerson(input: Omit<MissingPerson, 'id' | 'status'>): MissingPerson {
    const newMissing: MissingPerson = {
      ...input,
      id: `mp-${Date.now()}`,
      status: 'open',
    }
    missingStore = [newMissing, ...missingStore]
    saveLocal(STORAGE_KEY_MISSING, missingStore)
    emitRealtimeUpdate('missing_created', newMissing.id, newMissing)
    return newMissing
  },

  updateMissingPerson(id: string, patch: Partial<MissingPerson>): MissingPerson | undefined {
    const item = missingStore.find((m) => m.id === id)
    if (!item) return undefined
    Object.assign(item, patch)
    saveLocal(STORAGE_KEY_MISSING, missingStore)
    emitRealtimeUpdate('missing_updated', item.id, item)
    return item
  },

  updateMissingPersonStatus(id: string, status: 'open' | 'matched' | 'resolved'): MissingPerson | undefined {
    return this.updateMissingPerson(id, { status })
  },

  // ---- Overview KPIs ----
  overviewKpis(): OverviewKPIs {
    const pending = reportsStore.filter((r) => r.status === 'pending').length
    const inProg = reportsStore.filter((r) => r.status === 'in_progress').length
    const redAlerts = reportsStore.filter((r) => r.priorityLabel === 'RED' && r.status !== 'resolved').length
    const openShelters = sheltersStore.filter((s) => s.status === 'open').length
    const availVolunteers = volunteersStore.filter((v) => v.status === 'available').length

    return {
      totalReports: reportsStore.length,
      activeRedAlerts: redAlerts,
      openShelters,
      availableVolunteers: availVolunteers,
      avgResponseTimeMins: 7.5,
      crisisScore: Math.min(100, Math.round(redAlerts * 4 + pending * 0.8)),
      openCases: pending + inProg,
    }
  },

  // ---- Analytics ----
  analytics(): AnalyticsData {
    const typeCounts: Record<string, number> = {}
    const priCounts: Record<string, number> = {}
    const statCounts: Record<string, number> = {}

    for (const r of reportsStore) {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1
      priCounts[r.priorityLabel] = (priCounts[r.priorityLabel] || 0) + 1
      statCounts[r.status] = (statCounts[r.status] || 0) + 1
    }

    return {
      byType: typeCounts,
      byPriority: priCounts,
      byStatus: statCounts,
      byTime: [
        { date: 'Day -6', count: Math.round(reportsStore.length * 0.1) },
        { date: 'Day -5', count: Math.round(reportsStore.length * 0.15) },
        { date: 'Day -4', count: Math.round(reportsStore.length * 0.22) },
        { date: 'Day -3', count: Math.round(reportsStore.length * 0.35) },
        { date: 'Day -2', count: Math.round(reportsStore.length * 0.55) },
        { date: 'Yesterday', count: Math.round(reportsStore.length * 0.8) },
        { date: 'Today', count: reportsStore.length },
      ],
    }
  },

  // ---- Audit Logs ----
  listAuditLogs(): AuditLog[] {
    return auditStore
  },

  // ---- AI Fallbacks ----
  aiTriage(input: ReportInput): TriageResult {
    return computeTriage({
      type: input.type,
      description: input.description,
      isOneTapSos: input.isOneTapSos,
      victim: input.victim,
      missing: input.missing,
    })
  },

  aiPfaChat(message: string, victimName?: string): PfaChatResponse {
    const isEmergency = /trapped|water|bleeding|fire|collapse|help|dying|roof|chest|फंसा|डूब|खून|रक्त|আটকে|ଡୁବି|ଫସି/i.test(message)
    const lower = message.toLowerCase().trim()
    const isHindi = /नमस्ते|हेलो|भाई|bhaiya|bhai|kya|hai|madad|bachao|kaise|salam/i.test(lower)
    const isBengali = /নমস্কার|হ্যালো|দাদা|bhai|kemon|acho|sahajjo|bachao|ki|hoyeche/i.test(lower)
    const isOdia = /ନମସ୍କାର|ଭାଇ|ସାହାଯ୍ୟ|କଣ/i.test(lower)
    const isGreeting = /^(hi|hello|hey|namaste|hello bhaiya|bhaiya|namaskar|helo|hlo|pranam)[\s!.]*$/i.test(lower) || lower.length < 15

    let reply = ''
    if (isEmergency) {
      if (isHindi) {
        reply = 'शांत रहें। तुरंत सुरक्षित और ऊंचे स्थान पर जाएं। 112 या 108 पर संपर्क करें, हमारी आपदा राहत टीम को सतर्क कर दिया गया है।'
      } else if (isBengali) {
        reply = 'শান্ত থাকুন। অবিলম্বে উঁচু স্থানে আশ্রয় নিন। ১১২ বা ১০৮ নম্বরে যোগাযোগ করুন, উদ্ধারকারী দলকে বার্তা পাঠানো হয়েছে।'
      } else if (isOdia) {
        reply = 'ଧୈର୍ଯ୍ୟ ରଖନ୍ତୁ। ତୁରନ୍ତ ନିରାପଦ ସ୍ଥାନକୁ ଯାଆନ୍ତୁ। ୧୧୨ ରେ ଯୋଗାଯୋଗ କରନ୍ତୁ, ଉଦ୍ଧାରକାରୀ ଦଳ ନିକଟରେ ଅଛନ୍ତି।'
      } else {
        reply = 'Stay calm. Move to high ground immediately, conserve your battery, and call 112 or 108. Disaster rescue units have been alerted.'
      }
    } else if (isGreeting) {
      if (isHindi) {
        reply = 'नमस्ते! मैं आपदामित्र AI हूँ। बताएं कि आपको क्या आपातकालीन सहायता या सुरक्षा मार्गदर्शन चाहिए?'
      } else if (isBengali) {
        reply = 'নমস্কার! আমি আপদামিত্র AI। জরুরি নির্দেশিকা বা দুর্যোগ সহায়তার জন্য জানান কিভাবে সাহায্য করতে পারি?'
      } else if (isOdia) {
        reply = 'ନମସ୍କାର! ମୁଁ ଆପଦାମିତ୍ର AI। ଜରୁରୀକାଳୀନ ସୂଚନା ବା ବିପର୍ଯ୍ୟୟ ସହାୟତା ପାଇଁ ପଚାରନ୍ତୁ।'
      } else {
        reply = 'Namaste! I am AapdaMitra AI. Tell me what emergency guidance or disaster assistance you need.'
      }
    } else {
      reply = `I am with you ${victimName && victimName !== 'Friend' ? victimName : ''}. Take a slow deep breath (4 seconds in, 4 seconds out). Relief teams and shelter networks are active in your sector.`
    }

    return {
      reply,
      isCritical: isEmergency,
      safetyChecklist: [
        'Stay on highest accessible level (do not enter closed attics)',
        'Turn off main electricity switch if water enters building',
        'National Emergency Helpline: 112 | Ambulance: 108',
      ],
    }
  },

  // ---- Damage Assessment & HuggingFace Model ----
  listDamageAssessments(filters?: { infrastructureType?: string; damageGrade?: string; district?: string; q?: string }): DamageAssessmentReport[] {
    let res = [...damageStore]
    if (filters?.infrastructureType && filters.infrastructureType !== 'all') {
      res = res.filter((d) => d.infrastructureType === filters.infrastructureType)
    }
    if (filters?.damageGrade && filters.damageGrade !== 'all') {
      res = res.filter((d) => d.damageGrade === filters.damageGrade)
    }
    if (filters?.district && filters.district !== 'all') {
      res = res.filter((d) => d.district === filters.district)
    }
    if (filters?.q) {
      const q = filters.q.toLowerCase().trim()
      res = res.filter(
        (d) =>
          d.claimId.toLowerCase().includes(q) ||
          (d.claimantName && d.claimantName.toLowerCase().includes(q)) ||
          d.propertyAddress.toLowerCase().includes(q) ||
          d.district.toLowerCase().includes(q)
      )
    }
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  createDamageAssessment(input: Partial<DamageAssessmentReport>): DamageAssessmentReport {
    const newReport: DamageAssessmentReport = {
      id: `dmg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      claimId: input.claimId || `SDRF-${Date.now().toString(36).toUpperCase()}`,
      claimantName: input.claimantName,
      claimantPhone: input.claimantPhone || '+91-9876543210',
      infrastructureType: input.infrastructureType || 'broken_home',
      propertyAddress: input.propertyAddress || 'Address on file',
      district: input.district || 'North 24 Parganas',
      latitude: input.latitude || 22.5726,
      longitude: input.longitude || 88.3639,
      photoUrl: input.photoUrl,
      damageGrade: input.damageGrade || 'MAJOR',
      damageScore: input.damageScore || 75.0,
      confidence: input.confidence || 98.4,
      compensationInr: input.compensationInr || 47550,
      verified: true,
      status: 'approved',
      factors: input.factors || ['Damage verified by AI ResNet-50 Classifier'],
      huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
      createdAt: new Date().toISOString(),
    }

    damageStore = [newReport, ...damageStore]
    saveLocal(STORAGE_KEY_DAMAGE, damageStore)
    emitRealtimeUpdate('damage_assessed', newReport.id, newReport)
    return newReport
  },

  updateDamageAssessmentStatus(id: string, status: DamageAssessmentReport['status']): DamageAssessmentReport | undefined {
    const item = damageStore.find((d) => d.id === id || d.claimId === id)
    if (!item) return undefined
    item.status = status
    saveLocal(STORAGE_KEY_DAMAGE, damageStore)
    emitRealtimeUpdate('damage_updated', item.id, item)
    return item
  },

  aiDamageAssessment(
    photoDataUrl: string,
    reportedLat?: number,
    reportedLng?: number,
    description?: string,
    infrastructureType?: DamageInfrastructureType,
  ): {
    claimedDamage: boolean
    verified: boolean
    duplicate: boolean
    exifValid: boolean
    exifDeltaKm?: number
    damageGrade: DamageGrade
    damageScore: number
    confidence: number
    compensationInr: number
    factors: string[]
    huggingFaceModel: string
    infrastructureType: DamageInfrastructureType
  } {
    const isDestroyed = /destroy|total|collapse|washed away|flattened|crushed/i.test(description || '')
    const isMajor = isDestroyed || /major|heavy|rupture|pipe burst|flood level|wall crack|breach/i.test(description || '')
    const grade: DamageGrade = isDestroyed ? 'DESTROYED' : isMajor ? 'MAJOR' : 'MINOR'

    // Compute realistic score within class bounds
    const baseScore = grade === 'DESTROYED' ? 94.5 : grade === 'MAJOR' ? 76.0 : 32.5
    const jitter = (photoDataUrl.length % 50) / 10
    const damageScore = Math.min(100, Math.max(15, Math.round((baseScore + jitter) * 10) / 10))

    const compensationInr =
      grade === 'DESTROYED' ? 95100 : grade === 'MAJOR' ? 47550 : 9800

    const factors =
      grade === 'DESTROYED'
        ? [
            'Severe load-bearing structural collapse > 85%',
            'Foundation slab displacement & ground fissure',
            'SDRF Category A: Fully Destroyed Structure (98.36% AI Confidence)',
          ]
        : grade === 'MAJOR'
        ? [
            'Structural wall / pipeline breach with high hazard risk',
            'Roof displacement and water ingress watermark > 1.2m',
            'SDRF Category B: Severe Major Damage (98.1% AI Confidence)',
          ]
        : [
            'Cosmetic brickwork cracking and minor plaster loss',
            'SDRF Category C: Partial Minor Damage (97.7% AI Confidence)',
          ]

    return {
      claimedDamage: true,
      verified: true,
      duplicate: false,
      exifValid: Boolean(reportedLat && reportedLng),
      exifDeltaKm: 0.08,
      damageGrade: grade,
      damageScore,
      confidence: 98.36,
      compensationInr,
      factors,
      huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
      infrastructureType: infrastructureType || 'broken_home',
    }
  },

  aiSatelliteFloodMap(): FloodGeoJson {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { hazard_type: 'flood', severity: 'critical', water_depth_est_meters: 1.8 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [88.35, 22.56],
                [88.38, 22.56],
                [88.39, 22.59],
                [88.36, 22.59],
                [88.35, 22.56],
              ],
            ],
          },
        },
      ],
    }
  },

  // ---- Reset Mock Data to Fresh 1000+ Records ----
  resetData(): void {
    reportsStore = generate1000Reports()
    sheltersStore = [...initialShelters]
    volunteersStore = [...initialVolunteers]
    agenciesStore = [...initialAgencies]
    alertsStore = [...initialAlerts]
    checkinsStore = [...initialCheckins]
    missingStore = [...initialMissing]
    damageStore = [...initialDamageReports]
    auditStore = [
      { id: `aud-${Date.now()}`, adminEmail: 'admin@aapdasetu.org', action: 'DATABASE_RESET', entityType: 'SYSTEM', details: { count: reportsStore.length }, createdAt: new Date().toISOString() },
    ]

    saveLocal(STORAGE_KEY_REPORTS, reportsStore)
    saveLocal(STORAGE_KEY_SHELTERS, sheltersStore)
    saveLocal(STORAGE_KEY_VOLUNTEERS, volunteersStore)
    saveLocal(STORAGE_KEY_AGENCIES, agenciesStore)
    saveLocal(STORAGE_KEY_ALERTS, alertsStore)
    saveLocal(STORAGE_KEY_CHECKINS, checkinsStore)
    saveLocal(STORAGE_KEY_MISSING, missingStore)
    saveLocal(STORAGE_KEY_DAMAGE, damageStore)
    saveLocal(STORAGE_KEY_AUDIT, auditStore)

    emitRealtimeUpdate('data_reset')
  },
}
