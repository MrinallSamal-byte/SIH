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
  ShelterStatus,
  TriageResult,
  Volunteer,
  VolunteerStatus,
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

const STORAGE_VERSION = 'v6'
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
// 1000s OF REALISTIC MULTI-SECTOR DATA GENERATORS
// -----------------------------------------------------------------------------

const DISASTER_SECTORS = [
  { city: 'Kolkata - Salt Lake Sector V', district: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { city: 'Kolkata - New Town Action Area 1', district: 'Kolkata', state: 'West Bengal', lat: 22.579, lng: 88.378 },
  { city: 'Kolkata - Bidhannagar Stadium', district: 'Kolkata', state: 'West Bengal', lat: 22.567, lng: 88.401 },
  { city: 'Kolkata - Howrah Station & Shibpur', district: 'Howrah', state: 'West Bengal', lat: 22.5958, lng: 88.2636 },
  { city: 'Kolkata - Dum Dum Cantonment', district: 'North 24 Parganas', state: 'West Bengal', lat: 22.642, lng: 88.396 },
  { city: 'Kolkata - Alipore & Kalighat', district: 'Kolkata', state: 'West Bengal', lat: 22.528, lng: 88.334 },
  { city: 'Kolkata - Behala & Taratala', district: 'Kolkata', state: 'West Bengal', lat: 22.498, lng: 88.315 },
  { city: 'Kolkata - Jadavpur & Garia', district: 'Kolkata', state: 'West Bengal', lat: 22.492, lng: 88.371 },
  { city: 'North 24 Parganas - Barasat High Road', district: 'North 24 Parganas', state: 'West Bengal', lat: 22.723, lng: 88.481 },
  { city: 'North 24 Parganas - Basirhat Border', district: 'North 24 Parganas', state: 'West Bengal', lat: 22.658, lng: 88.892 },
  { city: 'South 24 Parganas - Canning Sub-Division', district: 'South 24 Parganas', state: 'West Bengal', lat: 22.312, lng: 88.658 },
  { city: 'South 24 Parganas - Diamond Harbour', district: 'South 24 Parganas', state: 'West Bengal', lat: 22.198, lng: 88.201 },
  { city: 'Sundarbans - Gosaba Delta Coastal', district: 'Sundarbans Coastal', state: 'West Bengal', lat: 22.185, lng: 88.752 },
  { city: 'Sundarbans - Sagar Island & Bakkhali', district: 'Sundarbans Coastal', state: 'West Bengal', lat: 21.642, lng: 88.082 },
  { city: 'Hooghly - Chinsurah Riverfront', district: 'Hooghly', state: 'West Bengal', lat: 22.902, lng: 88.396 },
  { city: 'Hooghly - Serampore Industrial', district: 'Hooghly', state: 'West Bengal', lat: 22.751, lng: 88.342 },
  { city: 'Paschim Medinipur - Kharagpur Hub', district: 'Paschim Medinipur', state: 'West Bengal', lat: 22.341, lng: 87.321 },
  { city: 'Purba Medinipur - Digha Cyclone Coast', district: 'Purba Medinipur', state: 'West Bengal', lat: 21.626, lng: 87.507 },
  { city: 'Burdwan - Asansol Mining Belt', district: 'Paschim Bardhaman', state: 'West Bengal', lat: 23.688, lng: 86.966 },
  { city: 'Burdwan - Durgapur Barrage Zone', district: 'Paschim Bardhaman', state: 'West Bengal', lat: 23.520, lng: 87.311 },
  { city: 'Bhubaneswar - Central Secretariate', district: 'Khordha', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
  { city: 'Bhubaneswar - Kalinga Nagar Sector 4', district: 'Khordha', state: 'Odisha', lat: 20.2934, lng: 85.817 },
  { city: 'Bhubaneswar - Patia Infocity', district: 'Khordha', state: 'Odisha', lat: 20.355, lng: 85.818 },
  { city: 'Bhubaneswar - Rasulgarh Highway', district: 'Khordha', state: 'Odisha', lat: 20.301, lng: 85.865 },
  { city: 'Bhubaneswar - Sundarpada Housing Board', district: 'Khordha', state: 'Odisha', lat: 20.2371, lng: 85.8114 },
  { city: 'Bhubaneswar - Old Town Lingaraj', district: 'Khordha', state: 'Odisha', lat: 20.2365, lng: 85.8336 },
  { city: 'Bhubaneswar - KIIT Patia Campus', district: 'Khordha', state: 'Odisha', lat: 20.3534, lng: 85.8225 },
  { city: 'Bhubaneswar - Nayapalli Jaydev Vihar', district: 'Khordha', state: 'Odisha', lat: 20.2969, lng: 85.8123 },
  { city: 'Bhubaneswar - Chandrasekharpur', district: 'Khordha', state: 'Odisha', lat: 20.3165, lng: 85.8182 },
  { city: 'Bhubaneswar - Saheed Nagar', district: 'Khordha', state: 'Odisha', lat: 20.2706, lng: 85.8334 },
  { city: 'Bhubaneswar - Khandagiri Udayagiri', district: 'Khordha', state: 'Odisha', lat: 20.261, lng: 85.78 },
  { city: 'Bhubaneswar - Mancheswar Industrial', district: 'Khordha', state: 'Odisha', lat: 20.325, lng: 85.845 },
  { city: 'Cuttack - Badambadi & Mahanadi', district: 'Cuttack', state: 'Odisha', lat: 20.4625, lng: 85.883 },
  { city: 'Cuttack - CDA Sector 6', district: 'Cuttack', state: 'Odisha', lat: 20.485, lng: 85.845 },
  { city: 'Puri - Coastal Relief & Grand Road', district: 'Puri', state: 'Odisha', lat: 19.8135, lng: 85.8312 },
  { city: 'Balasore - Coastal Cyclone Belt', district: 'Balasore', state: 'Odisha', lat: 21.493, lng: 86.932 },
  { city: 'Patna - Ganga River Belt', district: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { city: 'Guwahati - Brahmaputra Inundation', district: 'Kamrup Metropolitan', state: 'Assam', lat: 26.1445, lng: 91.7362 },
  { city: 'Siliguri - Mahananda River Basin', district: 'Darjeeling', state: 'West Bengal', lat: 26.727, lng: 88.395 },
]

const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rahul', 'Sneha', 'Ramesh', 'Sunita', 'Amit', 'Ananya', 'Mohammed', 'Fatima',
  'Bikram', 'Rojalin', 'Subhash', 'Deepa', 'Manoj', 'Kavita', 'Sanjay', 'Pooja', 'Tanmay', 'Meenakshi',
  'Arjun', 'Ipsita', 'Debabrata', 'Padmini', 'Alok', 'Rinki', 'Siddharth', 'Shreya', 'Vikram', 'Rupa',
  'Kunal', 'Swati', 'Rajesh', 'Neelam', 'Sourav', 'Aparna', 'Manas', 'Suchitra', 'Tushar', 'Geeta',
  'Devendra', 'Nandini', 'Prabhat', 'Kalyani', 'Naveen', 'Sharmila', 'Ashok', 'Kusum', 'Hemant', 'Radha'
]

const LAST_NAMES = [
  'Das', 'Mohanty', 'Sharma', 'Patel', 'Sen', 'Banerjee', 'Ghosh', 'Chatterjee', 'Sahoo', 'Behera',
  'Patnaik', 'Nayak', 'Mishra', 'Rout', 'Bose', 'Gupta', 'Singh', 'Ali', 'Khan', 'Roy',
  'Dutta', 'Panda', 'Swain', 'Jena', 'Mukherjee', 'Chakraborty', 'Samal', 'Majumdar', 'Barman', 'Kundu',
  'Bhowmik', 'Ganguly', 'Choudhury', 'Pradhan', 'Tripathy', 'Bastia', 'Padhi', 'Bhattacharya', 'Sarkar', 'Hossain'
]

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
      'River overflowed banks, 12 families taking shelter on school terrace.',
      'Rapid tidal surge inundated 30 huts, livestock stranded in deep mud.',
      'Culvert collapsed under flood pressure, entire village cut off from main road.',
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
      'Severe hypothermia and fracture after being swept by water current.',
      'Burn injuries from exploded cooking gas burner during storm evacuation.',
      'Infant suffering from severe dehydration and high fever in waterlogged sector.',
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
      'Fire broke out in warehouse containing emergency food supplies.',
      'Commercial building top floor caught fire due to lightning strike.',
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
      'Old heritage building facade collapsed onto market lane, structural debris blocking street.',
      'Cracks wider than 4 inches opened in multi-story residential apartment.',
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
      'Teenager separated from rescue boat convoy during heavy rain.',
      'Fisherman boat did not return to jetty after cyclone warning siren.',
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
      'Ambulance wheel stuck in collapsed asphalt hole on highway.',
      'Two relief supply vans collided near bypass intersection due to zero visibility.',
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
      'Large banyan tree uprooted blocking school evacuation route.',
      'Mobile communication tower battery exhausted, entire ward without cell signal.',
      'Stagnant flood water causing foul odor and mosquito breeding near camp.',
    ],
  },
]

// 1. GENERATE 1,500+ REPORTS
function generate1500Reports(): Report[] {
  const list: Report[] = []

  // Seed primary demo reports
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
      assignedVolunteerId: 'vol-001',
      assignedVolunteerName: 'Rahul Sharma',
      assignedAgencyId: 'agency-001',
      assignedAgencyName: 'NDRF 2nd Battalion Command',
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
      assignedVolunteerId: 'vol-002',
      assignedVolunteerName: 'Priya Singh',
      assignedAgencyId: 'agency-002',
      assignedAgencyName: 'State Disaster Response Force (SDRF)',
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
      assignedVolunteerId: 'vol-001',
      assignedVolunteerName: 'Rahul Sharma',
      assignedAgencyId: 'agency-005',
      assignedAgencyName: 'Red Cross Disaster Relief Mission',
      resolutionNotes: 'Citizen located and safely escorted back to family.',
      source: 'form',
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    }
  )

  // Generate 1,520 realistic randomized reports across disaster zones
  for (let i = 1; i <= 1520; i++) {
    const tmpl = EMERGENCY_TEMPLATES[i % EMERGENCY_TEMPLATES.length]
    const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length]
    const fName = FIRST_NAMES[i % FIRST_NAMES.length]
    const lName = LAST_NAMES[(i * 3) % LAST_NAMES.length]
    const desc = tmpl.descriptions[i % tmpl.descriptions.length]

    const lat = sector.lat + Math.sin(i * 12.34) * 0.035
    const lng = sector.lng + Math.cos(i * 56.78) * 0.035

    const score = Math.floor(tmpl.scoreMin + ((i * 7) % (tmpl.scoreMax - tmpl.scoreMin + 1)))
    const status: Report['status'] = i % 7 === 0 ? 'resolved' : i % 3 === 0 ? 'in_progress' : 'pending'

    const timeAgoMs = 1000 * 60 * (i * 9 + (i % 45))
    const createdAt = new Date(Date.now() - timeAgoMs).toISOString()
    const trackingHex = ((i * 16807 + 12345) % 0xffffff).toString(16).toUpperCase().padStart(6, '0')

    const assignedVolId = `vol-${(((i * 7) % 500) + 1).toString().padStart(3, '0')}`
    const assignedVolName = `${FIRST_NAMES[(i + 3) % FIRST_NAMES.length]} ${LAST_NAMES[(i + 5) % LAST_NAMES.length]}`
    const agencyNum = (i % 25) + 1
    const assignedAgencyId = `agency-${agencyNum.toString().padStart(3, '0')}`
    const assignedAgencyName = agencyNum <= 16 ? `NDRF ${agencyNum}th Battalion` : `State SDRF Quick Response Unit #${agencyNum - 16}`

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
      assignedVolunteerId: status !== 'pending' ? assignedVolId : undefined,
      assignedVolunteerName: status !== 'pending' ? assignedVolName : undefined,
      assignedAgencyId: status !== 'pending' ? assignedAgencyId : undefined,
      assignedAgencyName: status !== 'pending' ? assignedAgencyName : undefined,
      resolutionNotes: status === 'resolved' ? 'Evacuation completed successfully. Citizen safe in relief camp.' : undefined,
      source: i % 2 === 0 ? 'sos' : 'form',
      createdAt,
    })
  }

  return list
}

// 2. GENERATE 250+ SHELTERS
function generate250Shelters(): Shelter[] {
  const list: Shelter[] = []
  const SHELTER_TYPES = [
    'Community Relief Center',
    'Higher Secondary Model School',
    'Indoor Sports Stadium Camp',
    'Multi-Purpose Cyclone Shelter',
    'College Campus Evacuation Wing',
    'Sub-Divisional Hospital Relief Ward',
    'Municipal Town Hall Disaster Hub',
    'Youth Hostel & Sports Complex',
  ]

  for (let i = 0; i < 260; i++) {
    const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length]
    const sType = SHELTER_TYPES[i % SHELTER_TYPES.length]
    const id = `shel-${(i + 1).toString().padStart(3, '0')}`

    const latJitter = Math.sin(i * 9.17) * 0.025
    const lngJitter = Math.cos(i * 8.33) * 0.025

    const cap = Math.floor(150 + ((i * 73) % 2850))
    const occPercent = (i * 19) % 100
    const occ = Math.floor((cap * occPercent) / 100)

    const status: ShelterStatus = occ >= cap * 0.95 ? 'full' : i % 18 === 0 ? 'closed' : 'open'

    const facSet: string[] = ['food', 'water']
    if (i % 2 === 0) facSet.push('medical_station')
    if (i % 3 === 0 || cap > 600) facSet.push('power_generator')

    list.push({
      id,
      name: `${sector.city} — ${sType} #${(i % 20) + 1}`,
      address: `Sector ${(i % 15) + 1}, ${sector.city}, ${sector.district}, ${sector.state}`,
      latitude: Number((sector.lat + latJitter).toFixed(4)),
      longitude: Number((sector.lng + lngJitter).toFixed(4)),
      capacity: cap,
      occupancy: occ,
      facilities: facSet,
      contactPhone: `+91-${sector.lat > 22 ? '33' : '674'}-${(23570000 + (i % 9999)).toString()}`,
      status,
    })
  }
  const bhubaneswarSafes: Array<{ name: string; address: string; lat: number; lng: number; capacity: number; occupancy: number; facilities: string[]; phone: string }> = [
    { name: 'Bhubaneswar - Sundarpada Safe Shelter — Community Relief Center', address: 'Housing Board Colony, Sundarpada, Bhubaneswar, Khordha, Odisha - 751002', lat: 20.2371, lng: 85.8114, capacity: 800, occupancy: 210, facilities: ['food', 'water', 'medical_station', 'power_generator'], phone: '+91-674-23570101' },
    { name: 'Bhubaneswar - Patia KIIT Safe Shelter — College Campus Evacuation Wing', address: 'KIIT Campus, Patia, Bhubaneswar - 751024', lat: 20.3534, lng: 85.8225, capacity: 1200, occupancy: 340, facilities: ['food', 'water', 'medical_station', 'power_generator'], phone: '+91-674-23570102' },
    { name: 'Bhubaneswar - Nayapalli Safe Shelter — Municipal Town Hall Disaster Hub', address: 'Jaydev Vihar, Nayapalli, Bhubaneswar - 751015', lat: 20.2969, lng: 85.8123, capacity: 650, occupancy: 180, facilities: ['food', 'water', 'medical_station'], phone: '+91-674-23570103' },
    { name: 'Bhubaneswar - Old Town Lingaraj Safe Shelter — Multi-Purpose Cyclone Shelter', address: 'Lingaraj Temple Area, Old Town, Bhubaneswar - 751002', lat: 20.2365, lng: 85.8336, capacity: 500, occupancy: 95, facilities: ['food', 'water', 'medical_station'], phone: '+91-674-23570104' },
    { name: 'Bhubaneswar - Chandrasekharpur Safe Shelter — Higher Secondary Model School', address: 'Chandrasekharpur, Near Infocity, Bhubaneswar - 751016', lat: 20.3165, lng: 85.8182, capacity: 900, occupancy: 260, facilities: ['food', 'water', 'power_generator'], phone: '+91-674-23570105' },
    { name: 'Bhubaneswar - Saheed Nagar Safe Shelter — Indoor Sports Stadium Camp', address: 'Saheed Nagar, Bhubaneswar - 751007', lat: 20.2706, lng: 85.8334, capacity: 700, occupancy: 150, facilities: ['food', 'water', 'medical_station', 'power_generator'], phone: '+91-674-23570106' },
    { name: 'Bhubaneswar - Khandagiri Safe Shelter — Youth Hostel & Sports Complex', address: 'Khandagiri Hill Road, Bhubaneswar - 751030', lat: 20.261, lng: 85.78, capacity: 550, occupancy: 120, facilities: ['food', 'water', 'medical_station'], phone: '+91-674-23570107' },
    { name: 'Bhubaneswar - Mancheswar Safe Shelter — Sub-Divisional Hospital Relief Ward', address: 'Mancheswar Industrial Estate, Bhubaneswar - 751017', lat: 20.325, lng: 85.845, capacity: 600, occupancy: 200, facilities: ['food', 'water', 'medical_station', 'power_generator'], phone: '+91-674-23570108' },
    { name: 'Bhubaneswar - Rasulgarh Safe Shelter — Community Relief Center', address: 'Rasulgarh Highway, Bhubaneswar - 751010', lat: 20.301, lng: 85.865, capacity: 750, occupancy: 310, facilities: ['food', 'water', 'medical_station'], phone: '+91-674-23570109' },
    { name: 'Bhubaneswar - Kalinga Nagar Safe Shelter — Municipal Town Hall Disaster Hub', address: 'Kalinga Nagar, Sector 4, Bhubaneswar - 751003', lat: 20.2934, lng: 85.817, capacity: 850, occupancy: 275, facilities: ['food', 'water', 'medical_station', 'power_generator'], phone: '+91-674-23570110' },
  ]
  bhubaneswarSafes.forEach((s, idx) => {
    list.push({
      id: `shel-bbsr-${(idx + 1).toString().padStart(2, '0')}`,
      name: s.name,
      address: s.address,
      latitude: s.lat,
      longitude: s.lng,
      capacity: s.capacity,
      occupancy: s.occupancy,
      facilities: s.facilities,
      contactPhone: s.phone,
      status: 'open',
    })
  })
  return list
}

// 3. GENERATE 500+ VOLUNTEERS
function generate500Volunteers(): Volunteer[] {
  const list: Volunteer[] = []
  const SKILL_POOLS = [
    ['medical', 'search_rescue'],
    ['medical', 'logistics'],
    ['driving', 'search_rescue'],
    ['driving', 'logistics'],
    ['search_rescue'],
    ['medical'],
    ['logistics', 'shelter_management'],
    ['heavy_machinery', 'search_rescue'],
  ]

  for (let i = 0; i < 520; i++) {
    const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length]
    const fName = FIRST_NAMES[i % FIRST_NAMES.length]
    const lName = LAST_NAMES[(i * 4) % LAST_NAMES.length]
    const id = `vol-${(i + 1).toString().padStart(3, '0')}`

    const latJitter = Math.sin(i * 11.23) * 0.03
    const lngJitter = Math.cos(i * 13.45) * 0.03

    const status: VolunteerStatus = i % 4 === 0 ? 'on_duty' : i % 7 === 0 ? 'offline' : 'available'
    const skills = SKILL_POOLS[i % SKILL_POOLS.length]

    list.push({
      id,
      name: `${fName} ${lName}`,
      phone: `+91-9${(800000000 + ((i * 654321) % 199999999)).toString()}`,
      skills,
      latitude: Number((sector.lat + latJitter).toFixed(4)),
      longitude: Number((sector.lng + lngJitter).toFixed(4)),
      status,
    })
  }
  return list
}

// 4. GENERATE 100+ AGENCIES
function generate100Agencies(): Agency[] {
  const list: Agency[] = []

  for (let i = 1; i <= 110; i++) {
    const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length]
    const id = `agency-${i.toString().padStart(3, '0')}`

    let name = ''
    let type = 'ndrf'
    let jurisdiction = `${sector.district} Sector & Surroundings`

    if (i <= 16) {
      name = `NDRF ${i}th Battalion National Command`
      type = 'ndrf'
      jurisdiction = 'National Rapid Response & Flood Special Forces'
    } else if (i <= 40) {
      name = `State Disaster Response Force (SDRF) Unit #${i - 16}`
      type = 'ndrf'
      jurisdiction = `${sector.state} State Rapid Action Team`
    } else if (i <= 65) {
      name = `${sector.city} Emergency Fire & Rescue Division`
      type = 'fire_department'
      jurisdiction = 'Urban, Industrial & Flood Extraction'
    } else if (i <= 90) {
      name = `${sector.district} Mobile ICU Ambulance ALS Fleet #${i - 65}`
      type = 'hospital'
      jurisdiction = 'Emergency Trauma & Critical Medical Transit'
    } else {
      name = `Red Cross & Civil Defence Mission #${i - 90}`
      type = 'ngo'
      jurisdiction = 'Humanitarian Aid, Nutrition & Family Reunification'
    }

    list.push({
      id,
      name,
      type,
      contactPhone: i % 2 === 0 ? `+91-33-2324${(1000 + i).toString()}` : `108`,
      contactEmail: `command.${id}@aapdasetu.gov.in`,
      jurisdiction,
      latitude: sector.lat,
      longitude: sector.lng,
    })
  }
  return list
}

// 5. GENERATE 800+ SAFETY CHECK-INS
function generate800Checkins(): SafetyCheckin[] {
  const list: SafetyCheckin[] = []

  for (let i = 1; i <= 820; i++) {
    const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length]
    const fName = FIRST_NAMES[i % FIRST_NAMES.length]
    const lName = LAST_NAMES[(i * 5) % LAST_NAMES.length]
    const id = `chk-${i.toString().padStart(4, '0')}`

    const isSafe = i % 12 !== 0
    const familyCount = (i % 5) + 1
    const timeAgoMs = 1000 * 60 * (i * 8 + (i % 30))

    const note = isSafe
      ? `Safe with ${familyCount} family members at Sector ${(i % 12) + 1} camp. Food and clean water provided.`
      : `Evacuated to upper roof floor, need drinking water packets for ${familyCount} persons.`

    list.push({
      id,
      fullName: `${fName} ${lName}`,
      phone: `+91-9${(700000000 + ((i * 456789) % 299999999)).toString()}`,
      status: isSafe ? 'safe' : 'need_assistance',
      locationName: `${sector.city} Emergency Shelter #${(i % 15) + 1}`,
      latitude: sector.lat,
      longitude: sector.lng,
      notes: note,
      createdAt: new Date(Date.now() - timeAgoMs).toISOString(),
    })
  }
  return list
}

// 6. GENERATE 300+ MISSING PERSONS
function generate300MissingPersons(): MissingPerson[] {
  const list: MissingPerson[] = []
  const CLOTHES_LIST = [
    'Yellow T-shirt, blue jeans, black sports shoes',
    'White cotton kurta-pyjama, wooden cane, reading glasses',
    'School uniform (Navy blue sweater, white shirt, black shoes)',
    'Red printed saree, silver bangles, black umbrella',
    'Green rain jacket, grey track pants, brown sandals',
    'Checked cotton shirt, khaki trousers, wristwatch',
    'Floral dress, pink school backpack, red hair ribbon',
  ]

  for (let i = 1; i <= 320; i++) {
    const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length]
    const fName = FIRST_NAMES[i % FIRST_NAMES.length]
    const lName = LAST_NAMES[(i * 3) % LAST_NAMES.length]
    const id = `mp-${i.toString().padStart(4, '0')}`

    const age = Math.floor(4 + ((i * 17) % 76))
    const gender = i % 2 === 0 ? 'male' : 'female'
    const clothes = CLOTHES_LIST[i % CLOTHES_LIST.length]
    const status: MissingPerson['status'] = i % 5 === 0 ? 'resolved' : i % 7 === 0 ? 'matched' : 'open'
    const timeAgoMs = 1000 * 60 * (i * 15 + (i % 60))

    list.push({
      id,
      name: `${fName} ${lName}`,
      age,
      gender,
      clothes,
      lastSeenLocation: `${sector.city}, Near Landmark Gate ${(i % 9) + 1}`,
      lastSeenAt: new Date(Date.now() - timeAgoMs).toISOString(),
      contactPhone: `+91-9${(850000000 + ((i * 321654) % 149999999)).toString()}`,
      status,
    })
  }
  return list
}

// 7. GENERATE 600+ AI DAMAGE ASSESSMENTS
function generate600DamageAssessments(): DamageAssessmentReport[] {
  const list: DamageAssessmentReport[] = []
  const INFRA_TYPES: DamageInfrastructureType[] = [
    'broken_home',
    'gov_pipeline',
    'road_bridge',
    'electrical_power',
    'commercial_public',
    'agricultural',
  ]

  for (let i = 1; i <= 620; i++) {
    const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length]
    const fName = FIRST_NAMES[i % FIRST_NAMES.length]
    const lName = LAST_NAMES[(i * 2) % LAST_NAMES.length]
    const id = `dmg-${i.toString().padStart(4, '0')}`
    const infra = INFRA_TYPES[i % INFRA_TYPES.length]

    const distCode = sector.district.substring(0, 4).toUpperCase().replace(/\s+/g, '')
    const claimId = `SDRF-2026-${distCode}-${(1000 + i).toString()}`

    const grade: DamageGrade = i % 3 === 0 ? 'DESTROYED' : i % 2 === 0 ? 'MAJOR' : 'MINOR'
    const score = grade === 'DESTROYED' ? 92 + (i % 7) : grade === 'MAJOR' ? 70 + (i % 16) : 25 + (i % 18)
    const comp = grade === 'DESTROYED' ? 95100 : grade === 'MAJOR' ? 47550 : 9800
    const status: DamageAssessmentReport['status'] = i % 10 === 0 ? 'flagged_fraud' : i % 3 === 0 ? 'pending_review' : 'approved'

    const lat = sector.lat + Math.sin(i * 14.5) * 0.03
    const lng = sector.lng + Math.cos(i * 16.7) * 0.03
    const timeAgoMs = 1000 * 60 * (i * 12 + (i % 40))

    const factors =
      grade === 'DESTROYED'
        ? ['Structural load-bearing wall shattered > 45mm', 'Roof truss collapsed under inundation load', 'Foundation scour > 2.2m']
        : grade === 'MAJOR'
        ? ['Main distribution line ruptured', 'Severe plaster & masonry delamination', 'Hazard perimeter required']
        : ['Minor exterior brickwork hairline fissure', 'Surface water staining', 'Structural integrity intact']

    list.push({
      id,
      claimId,
      claimantName: `${fName} ${lName}`,
      claimantPhone: `+91-9${(900000000 + ((i * 789123) % 99999999)).toString()}`,
      infrastructureType: infra,
      propertyAddress: `Plot ${(i % 100) + 1}, Main Road, ${sector.city}`,
      district: sector.district,
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      damageGrade: grade,
      damageScore: score,
      confidence: Number((97.5 + ((i % 24) / 10)).toFixed(1)),
      compensationInr: comp,
      verified: status === 'approved',
      status,
      factors,
      huggingFaceModel: 'Divyanshu-Kumar19/aapdasetu-damage-assessment',
      createdAt: new Date(Date.now() - timeAgoMs).toISOString(),
    })
  }
  return list
}

// 8. GENERATE 150+ EMERGENCY ALERTS
function generate150Alerts(): Alert[] {
  const list: Alert[] = []
  const ALERT_TYPES = [
    { title: 'Critical Flash Flood & Inundation Siren', severity: 'critical' as const, template: 'River water level breached danger mark by 1.8m. Immediate multi-story evacuation active.' },
    { title: 'Severe Cyclonic Storm Bulletin & Wind Hazard', severity: 'warning' as const, template: 'Wind gusts exceeding 90 km/h predicted. Stay away from loose structures, tin sheds, and power lines.' },
    { title: 'Dam Spillway Discharge & Sluice Gate Alert', severity: 'warning' as const, template: 'Water discharge increased to 85,000 cusecs. Downstream riverbank settlements must move to high ground.' },
    { title: 'Emergency Relief Camps Operational with Free Medical Care', severity: 'info' as const, template: 'Designated shelters equipped with 24/7 doctors, diesel generators, hot meals, and purified drinking water.' },
    { title: 'Clean Water Tanker & Food Distribution Schedule', severity: 'info' as const, template: 'Municipal emergency water tankers arriving at designated sector relief hubs between 8 AM and 6 PM.' },
  ]

  for (let i = 1; i <= 160; i++) {
    const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length]
    const tmpl = ALERT_TYPES[i % ALERT_TYPES.length]
    const id = `alert-${i.toString().padStart(4, '0')}`
    const timeAgoMs = 1000 * 60 * (i * 20 + (i % 50))

    list.push({
      id,
      title: `${tmpl.title} — ${sector.district}`,
      message: `${tmpl.template} Affected sectors: ${sector.city} and surrounding wards. Emergency Helpline: 1070 / 112.`,
      severity: tmpl.severity,
      channel: i % 3 === 0 ? 'all' : 'public',
      region: `${sector.district}, ${sector.state}`,
      createdAt: new Date(Date.now() - timeAgoMs).toISOString(),
    })
  }
  return list
}

// 9. GENERATE 1,000+ AUDIT LOGS
function generate1000AuditLogs(): AuditLog[] {
  const list: AuditLog[] = []
  const ADMIN_EMAILS = [
    'admin@aapdasetu.org',
    'commander.ndrf@aapdasetu.gov.in',
    'duty.officer@sdrf.gov.in',
    'triage.lead@aapdasetu.org',
    'district.collector@disaster.gov.in',
  ]

  const ACTIONS = [
    { action: 'INCIDENT_TRIAGE_OVERRIDE', entityType: 'REPORT' },
    { action: 'VOLUNTEER_DISPATCH_AUTHORIZED', entityType: 'VOLUNTEER' },
    { action: 'SHELTER_CAPACITY_OVERRIDE', entityType: 'SHELTER' },
    { action: 'AI_DAMAGE_CLAIM_APPROVED', entityType: 'DAMAGE_CLAIM' },
    { action: 'EMERGENCY_BROADCAST_TRIGGERED', entityType: 'BROADCAST' },
    { action: 'INCIDENT_RESOLVED_IN_FIELD', entityType: 'REPORT' },
    { action: 'GEOSPATIAL_SURVEILLANCE_UPDATE', entityType: 'SYSTEM' },
    { action: 'AGENCY_RESCUE_CONVOY_DEPLOYED', entityType: 'AGENCY' },
  ]

  for (let i = 1; i <= 1050; i++) {
    const act = ACTIONS[i % ACTIONS.length]
    const email = ADMIN_EMAILS[i % ADMIN_EMAILS.length]
    const id = `aud-${(1000 + i).toString()}`
    const timeAgoMs = 1000 * 60 * (i * 6 + (i % 25))

    list.push({
      id,
      adminEmail: email,
      action: act.action,
      entityType: act.entityType,
      entityId: `ent-${((i * 13) % 1500 + 1).toString()}`,
      details: {
        sector: DISASTER_SECTORS[i % DISASTER_SECTORS.length].city,
        statusCode: 200,
        latencyMs: 14 + (i % 80),
      },
      createdAt: new Date(Date.now() - timeAgoMs).toISOString(),
    })
  }
  return list
}

// -----------------------------------------------------------------------------
// PERSISTENT DATA CONTAINERS (1000s OF RECORDS ACROSS CITIZEN, ADMIN & VOLUNTEER)
// -----------------------------------------------------------------------------

let reportsStore: Report[] = loadLocal<Report[]>(STORAGE_KEY_REPORTS, generate1500Reports)
let sheltersStore: Shelter[] = loadLocal<Shelter[]>(STORAGE_KEY_SHELTERS, generate250Shelters)
let volunteersStore: Volunteer[] = loadLocal<Volunteer[]>(STORAGE_KEY_VOLUNTEERS, generate500Volunteers)
let agenciesStore: Agency[] = loadLocal<Agency[]>(STORAGE_KEY_AGENCIES, generate100Agencies)
let alertsStore: Alert[] = loadLocal<Alert[]>(STORAGE_KEY_ALERTS, generate150Alerts)
let checkinsStore: SafetyCheckin[] = loadLocal<SafetyCheckin[]>(STORAGE_KEY_CHECKINS, generate800Checkins)
let missingStore: MissingPerson[] = loadLocal<MissingPerson[]>(STORAGE_KEY_MISSING, generate300MissingPersons)
let damageStore: DamageAssessmentReport[] = loadLocal<DamageAssessmentReport[]>(STORAGE_KEY_DAMAGE, generate600DamageAssessments)
let auditStore: AuditLog[] = loadLocal<AuditLog[]>(STORAGE_KEY_AUDIT, generate1000AuditLogs)

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
    if (!trackingId || typeof trackingId !== 'string') return undefined
    const raw = trackingId.trim()
    if (!raw) return undefined
    const upper = raw.toUpperCase()
    const lower = raw.toLowerCase()

    // 1. Direct match in reportsStore (trackingId, id, case-insensitive)
    const rep = reportsStore.find(
      (r) =>
        r.trackingId?.toUpperCase() === upper ||
        r.id?.toLowerCase() === lower ||
        r.id?.toUpperCase() === upper ||
        r.trackingId?.toLowerCase() === lower
    )
    if (rep) return rep

    // 2. Lookup in damage assessment store (if user enters an SDRF claim ID or dmg- ID)
    const dmg = damageStore.find(
      (d) =>
        d.claimId?.toUpperCase() === upper ||
        d.id?.toLowerCase() === lower ||
        d.id?.toUpperCase() === upper ||
        d.claimId?.toLowerCase() === lower
    )
    if (dmg) {
      return {
        id: dmg.id,
        trackingId: dmg.claimId,
        type: 'other',
        status: dmg.status === 'approved' ? 'resolved' : 'in_progress',
        priorityScore: Math.round(dmg.damageScore || 75),
        priorityLabel: dmg.damageGrade === 'DESTROYED' ? 'RED' : dmg.damageGrade === 'MAJOR' ? 'YELLOW' : 'GREEN',
        latitude: dmg.latitude,
        longitude: dmg.longitude,
        landmark: dmg.propertyAddress || `${dmg.district} District`,
        description: `SDRF Relief Claim for ${dmg.infrastructureType?.replace('_', ' ').toUpperCase() || 'Property'} — Estimated Relief: ₹${(dmg.compensationInr || 0).toLocaleString('en-IN')}`,
        reporterName: dmg.claimantName,
        reporterPhone: dmg.claimantPhone,
        assignedAgencyName: 'State Disaster Response Force (SDRF)',
        assignedVolunteerName: 'Damage Verification Officer',
        resolutionNotes: `Claim Status: ${dmg.status?.toUpperCase() || 'UNDER REVIEW'}. Verified AI Grade: ${dmg.damageGrade} (${dmg.damageScore}/100).`,
        createdAt: dmg.createdAt,
      }
    }

    // 3. Fallback sanitized alphanumeric match (e.g. spaces/dashes variations)
    const alphanumeric = upper.replace(/[^A-Z0-9]/g, '')
    if (alphanumeric.length >= 4) {
      const looseMatch = reportsStore.find((r) => {
        const rClean = r.trackingId?.replace(/[^A-Z0-9]/g, '') || ''
        const rIdClean = r.id?.replace(/[^A-Z0-9]/g, '') || ''
        return rClean.includes(alphanumeric) || alphanumeric.includes(rClean) || rIdClean.includes(alphanumeric)
      })
      if (looseMatch) return looseMatch
    }

    return undefined
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
    const isAssignment = patch.assignedVolunteerId !== undefined || patch.assignedAgencyId !== undefined
    Object.assign(rep, patch)
    if (isAssignment) {
      // Mirror assignVolunteer semantics: resolve names and move pending → in_progress
      const vol = patch.assignedVolunteerId ? volunteersStore.find((v) => v.id === patch.assignedVolunteerId) : undefined
      if (vol) rep.assignedVolunteerName = vol.name
      const agency = patch.assignedAgencyId ? agenciesStore.find((a) => a.id === patch.assignedAgencyId) : undefined
      if (agency) rep.assignedAgencyName = agency.name
      if (patch.status === undefined && rep.status === 'pending') rep.status = 'in_progress'
    }
    rep.updatedAt = new Date().toISOString()
    saveLocal(STORAGE_KEY_REPORTS, reportsStore)
    emitRealtimeUpdate(isAssignment ? 'report_assigned' : 'report_updated', rep.id, rep)
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
    const raw = message.trim()
    let lower = raw.toLowerCase()

    // Collapse repeating letters (e.g. cuuuted -> cuted, helppp -> help, drownnn -> drown)
    const collapsed = lower.replace(/([a-z])\1{2,}/g, '$1$1')

    // Normalize common Indian and global disaster/medical slang and typos
    const normalized = collapsed
      .replace(/\b(cuuted|cuted|cutted|cuting|cutt|kati|kat|kaat|kat gaya|ungli kat|haath kat)\b/g, 'cut')
      .replace(/\b(drowing|drownig|drownd|drown|drowning|doob|dub|paani me doob)\b/g, 'drowning')
      .replace(/\b(bliding|blead|bleding|blod|blodd|bloody|bleeding|khoon)\b/g, 'bleeding')
      .replace(/\b(hart|hartatak|attak|heartattack|heartatak|chestpain|chaati me dard)\b/g, 'cardiac')
      .replace(/\b(snak|snakbite|snk|saap|saanp|dasa)\b/g, 'snake')
      .replace(/\b(burnn|burnt|burned|jal gaya|jala|jal)\b/g, 'burn')
      .replace(/\b(fractur|toota|tuta|tut gaya|haddi)\b/g, 'fracture')
      .replace(/\b(chok|chokin|choking|gala ghut|saans band)\b/g, 'choking')
      .replace(/\b(shalter|sheltar|sheltr|camp|ashray|shibir)\b/g, 'shelter')
      .replace(/\b(traack|trak|trac|traaking)\b/g, 'track')

    // Include both original lower and normalized in matching
    lower = `${lower} ${normalized}`

    // Detect language preference
    const isHindi = /[\u0900-\u097F]/u.test(raw) || /\b(namaste|kya|hai|madad|bachao|kaise|salam|dard|chot|pani|khana|aag|paani|chhat|sanp|saap|bijli|ghayal|kat|doob|haath|pair|ungli)\b/i.test(lower)
    const isBengali = /[\u0980-\u09FF]/u.test(raw) || /\b(nomoshkar|kemon|acho|sahajjo|bachao|ki|hoyeche|rokto|agoon|jol|bhasha|ashroy|ghot|hath|pa|ungul)\b/i.test(lower)
    const isOdia = /[\u0B00-\u0B7F]/u.test(raw) || /\b(namaskar|sahajya|pana|kia|asustha|niyan|banya|khyata|hatha|goda)\b/i.test(lower)

    let reply = ''
    let isCritical = false
    let dangerLevel: 'CRITICAL' | 'MODERATE' | 'LOW' = 'LOW'
    let exerciseType: string | undefined = undefined

    const scopePattern = /\b(flood|bleed|cut|drown|sinking|cardiac|heart|snake|burn|fracture|chok|help|rescue|shelter|track|sos|report|aapdasetu|emergency|danger|pain|hurt|wound|panic|water|food|medicine|hospital|ambulance|fire|earthquake|collapse|trapped|missing|damage|helpline|112|108)\b/i
    const unrelatedPattern = /\b(reverse|py\s*code|python|java\s*code|javascript|programming|algorithm|leetcode|homework|essay|poem|joke|song|movie|game|translate|write\s*code|give\s*code|code\s*snippet|reverse\s*string)\b/i
    if (unrelatedPattern.test(lower) && !scopePattern.test(lower)) {
      if (isHindi) reply = 'मैं केवल आपदा, आपातकाल और AapdaSetu वेबसाइट से संबंधित सहायता दे सकता हूँ। कृपया बाढ़, चोट, आश्रय या ट्रैकिंग के बारे में पूछें।'
      else if (isBengali) reply = 'আমি কেবল দুর্যোগ, জরুরি এবং AapdaSetu সম্পর্কিত সহায়তা দিতে পারি। বন্যা, আহত, আশ্রয় বা ট্র্যাকিং সম্পর্কে জিজ্ঞাসা করুন।'
      else if (isOdia) reply = 'ମୁଁ କେବଳ ବିପର୍ଯ୍ୟୟ ଏବଂ AapdaSetu ସମ୍ବନ୍ଧୀୟ ସହାୟତା ଦେଇପାରେ। ବନ୍ୟା, ଆହତ, ଆଶ୍ରୟ ବିଷୟରେ ପଚାରନ୍ତୁ।'
      else reply = 'I can only help with disaster, emergency, and AapdaSetu website topics (SOS, Report, Shelter, Track, Medical guidance). Please ask about flood, injury, shelter, or tracking. Example: "water entering house" or "severe bleeding".'
      return { reply, exerciseType, isCritical: false, dangerLevel: 'LOW', helpline: undefined, safetyChecklist: ['National Emergency: 112 | Ambulance: 108'] }
    }

    // 1. Drowning / Water Rescue / Sinking / Swallowed Water
    if (/\b(drowning|drown|sinking|swimming|swept away|deep water|current pulling|water in lungs|पानी में डूब|ডুব|ବୁଡ଼ିବା)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = '1. तुरंत पीठ के बल लेटकर तैरें (Float करें - सिर पीछे झुकाएं, नाक-मुंह पानी से ऊपर रखें)। 2. किसी भी तैरने वाली वस्तु (प्लास्टिक बोतल, केन, लकड़ी, टायर) को पकड़ें। 3. बहाव के खिलाफ न लड़ें, ऊर्जा बचाएं और मदद के लिए आवाज दें। तुरंत 112 पर कॉल करें।'
      } else if (isBengali) {
        reply = '১. চিৎ হয়ে ভেসে থাকুন (মাথা পিছনে রাখুন, নাক ও মুখ জলের উপরে রাখুন)। ২. ভাসমান কোনো বস্তু (বোতল, কাঠ, ক্যান) শক্ত করে ধরুন। ৩. স্রোতের বিরুদ্ধে সাঁতার কাটবেন না, সাহায্য না আসা পর্যন্ত ভেসে থাকুন। অবিলম্বে ১১২ নম্বরে কল করুন।'
      } else if (isOdia) {
        reply = '୧. ପିଠି ଆଡ଼କୁ ଭାସି ରୁହନ୍ତୁ (ମୁଣ୍ଡ ପଛକୁ ରଖନ୍ତୁ, ନାକ-ମୁହଁ ପାଣି ଉପରେ ରଖନ୍ତୁ)। ୨. ଯେକୌଣସି ଭାସୁଥିବା ବସ୍ତୁକୁ ଧରି ରଖନ୍ତୁ। ୩. ପାଣି ସୁଅ ବିରୁଦ୍ଧରେ ନ ଲଢ଼ି ତୁରନ୍ତ ୧୧୨ କୁ କଲ୍ କରନ୍ତୁ।'
      } else {
        reply = '1. Roll onto your back and FLOAT immediately (tilt your head back, keep chin up and mouth/nose above water, breathe slowly). 2. Grab onto any floating item (jerrycan, thermocol, tree branch, tyre). 3. Do not fight current; conserve energy and shout for rescue. Emergency teams are alerted (Call 112).'
      }
    }
    // 2. Severe Bleeding / Cut / Hand Cut / Hemorrhage / Wound / Laceration
    else if (/\b(cut|cuuted|cutted|bleed|bleeding|blood|hemorrhage|wound|lacerat|sever|amputat|chot|khoon|घाव|खून|चोट|রক্ত|ক্ষত|କ୍ଷତ)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = '1. साफ कपड़े या पट्टी से घाव/कटे हुए हिस्से पर 5 से 10 मिनट तक लगातार तेज दबाव बनाए रखें। 2. घायल हाथ या पैर को दिल के स्तर से ऊपर उठाएं। 3. कपड़ा भीगने पर हटाएं नहीं, उसके ऊपर और कपड़ा लगाकर कसें। तुरंत 108 पर संपर्क करें।'
      } else if (isBengali) {
        reply = '১. পরিষ্কার কাপড় বা গজ দিয়ে কাটা ক্ষতস্থানে ৫-১০ মিনিট সরাসরি শক্ত চাপ দিয়ে রাখুন। ২. কাটা অংশটি হৃদপিণ্ডের উপরে তুলে রাখুন। ৩. রক্তপাত দ্রুত বন্ধ না হলে অবিলম্বে ১০৮ নম্বরে অ্যাম্বুলেন্স ডাকুন।'
      } else if (isOdia) {
        reply = '୧. ସଫା କପଡ଼ା ବା ପଟିରେ କ୍ଷତ ସ୍ଥାନକୁ ୫-୧୦ ମିନିଟ୍ ଟାଣ କରି ଚାପି ଧରନ୍ତୁ। ୨. ଆହତ ଅଙ୍ଗକୁ ଛାତି ଉଚ୍ଚତାଠାରୁ ଉପରକୁ ଟେକି ରଖନ୍ତୁ। ୩. ରକ୍ତସ୍ରାବ ବନ୍ଦ ନ ହେଲେ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ।'
      } else {
        reply = '1. Apply firm, direct pressure on the cut using a clean cloth or sterile gauze for 5–10 minutes continuously without lifting. 2. Elevate the injured hand or limb above heart level. 3. If bleeding does not stop or is pulsing, maintain tight pressure and call 108 / 112 immediately.'
      }
    }
    // 3. CPR / Cardiac / Unconscious / Heart Attack / Pulse
    else if (/\b(cpr|cardiac|heart attack|unconscious|fainted|pulse|chest pain|behos|बेहोश|हार्ट अटैक|অজ্ঞান|ଚେତାଶୂନ୍ୟ)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = '1. तुरंत 108 / 112 पर कॉल करें। 2. मरीज को सपाट जमीन पर पीठ के बल लिटाएं। 3. छाती के केंद्र पर दोनों हाथ रखकर 2 इंच गहरा और तेज दबाव दें (100-120 प्रति मिनट)। सांस न चलने तक लगातार सीपीआर जारी रखें।'
      } else if (isBengali) {
        reply = '১. অবিলম্বে ১০৮ বা ১১২ এ কল করুন। ২. রোগীকে সমান শক্ত মেঝেতে শোয়ান। ৩. বুকের মাঝখানে হাত রেখে জোরে ও দ্রুত চাপ দিন (মিনিটে ১০০-১২০ বার)। জরুরি সাহায্য না পৌঁছানো পর্যন্ত সিপিআর চালিয়ে যান।'
      } else if (isOdia) {
        reply = '୧. ତୁରନ୍ତ ୧୦୮ କିମ୍ବା ୧୧୨ କୁ କଲ୍ କରନ୍ତୁ। ୨. ରୋଗୀଙ୍କୁ ସମତଳ ଚଟାଣରେ ଶୁଆନ୍ତୁ। ୩. ଛାତି ମଝିରେ ଦୁଇ ହାତ ରଖି ଜୋରରେ ଓ ଶୀଘ୍ର ଚାପ ଦିଅନ୍ତୁ (ମିନିଟରେ ୧୦୦-୧୨୦ ଥର)।'
      } else {
        reply = '1. Call 108 / 112 immediately. 2. Lay patient on their back on a firm surface. 3. Place both hands in the center of the chest and push hard & fast (100–120 compressions/min, 2 inches deep). Continue Hands-Only CPR until paramedics arrive.'
      }
    }
    // 4. Snakebite / Poisonous bite
    else if (/\b(snake|snakebite|cobra|viper|venom|poison|सांप|साँप|সাপ|ସାପ)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = '1. मरीज को पूरी तरह शांत और स्थिर रखें। 2. काटे गए अंग को दिल के स्तर से नीचे रखें। 3. घाव पर चीरा न लगाएं, मुंह से जहर न चूसें और न ही बर्फ लगाएं। तुरंत नजदीकी अस्पताल में एंटी-वेनम के लिए जाएं (कॉल 108)।'
      } else {
        reply = '1. Keep victim completely still and calm; immobilize the bitten limb below heart level. 2. Do NOT cut, burn, tourniquet, or suck the venom. 3. Rush to the nearest hospital for anti-venom immediately (Call 108).'
      }
    }
    // 5. Burns / Scalds / Chemical Burn
    else if (/\b(burn|burns|burnt|scalding|blister|जलना|जला|আগুনে পোড়া|ପୋଡ଼ିଯିବା)\b/i.test(lower)) {
      dangerLevel = 'MODERATE'
      if (isHindi) {
        reply = '1. जले हुए स्थान पर 10-20 मिनट तक सामान्य ठंडा नल का पानी डालें। 2. बर्फ, टूथपेस्ट, तेल या हल्दी बिल्कुल न लगाएं। 3. फफोले न फोड़ें और साफ सूती कपड़े से ढंककर रखें। गंभीर जलने पर 108 पर कॉल करें।'
      } else {
        reply = '1. Immediately cool the burn under gentle, running cool tap water for 10–20 minutes. 2. Do NOT apply ice, toothpaste, butter, or oil. 3. Cover loosely with a clean, dry cloth or cling wrap. Call 108 if blisters form.'
      }
    }
    // 6. Fracture / Broken Bone / Sprain / Dislocation
    else if (/\b(fracture|broken bone|sprain|dislocat|हड्डी टूटना|हड्डी|হাড় ভাঙা|ହାଡ଼ ଭାଙ୍ଗିବା)\b/i.test(lower)) {
      dangerLevel = 'MODERATE'
      if (isHindi) {
        reply = '1. टूटी हुई हड्डी को सीधा करने की कोशिश न करें। 2. लकड़ी के तख्ते या मुड़ी हुई मैगजीन और कपड़े से अंग को स्थिर (Splint) करें। 3. सूजन कम करने के लिए कपड़े में लपेटकर बर्फ लगाएं। तुरंत अस्पताल ले जाएं।'
      } else {
        reply = '1. Do not try to realign or push bones back. 2. Immobilize the limb using a rigid splint (wood, rolled newspaper) tied above and below the injury with cloth strips. 3. Apply ice wrapped in cloth to reduce swelling. Call 108.'
      }
    }
    // 7. Choking / Airway Obstruction / Cannot breathe
    else if (/\b(chok|choking|airway|gagging|asphyxiat|गला घुट|दम बंद|ଗଳା ଲାଗିବା)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = '1. व्यक्ति की पीठ पर दोनों कंधों के बीच 5 बार जोर से हथेली से मारें (Back blows)। 2. राहत न मिलने पर नाभि के ठीक ऊपर दोनों हाथ रखकर 5 बार अंदर और ऊपर की ओर तेज झटका दें (Heimlich maneuver)।'
      } else {
        reply = '1. Deliver 5 firm back blows between shoulder blades with heel of hand. 2. If object is not cleared, perform 5 quick abdominal thrusts (Heimlich Maneuver) inwards and upwards above navel. Alternate 5 back blows + 5 thrusts until airway clears.'
      }
    }
    // 8. TRAPPED UNDER DEBRIS / COLLAPSED WALL — PRIORITY BEFORE GENERIC HELP
    else if (/\b(trapped|collapse|collapsed|debris|buried|stuck.*wall|wall.*collapse|under.*wall|under.*debris|concrete.*trapped|trapped.*wall|फंसा|मलबा|धंसना|আটকে|ধ্বংসস্তূপ|ଫସି|ଭୁଶୁଡ଼ି)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = '1. बिल्कुल न हिलें — धूल से बचने के लिए नाक-मुंह को कपड़े से ढकें। 2. जोर से चिल्लाने के बजाय पास की पाइप/दीवार को थपथपाएं या टॉर्च/फोन की लाइट से सिग्नल दें। 3. धीरे-धीरे सांस लें, ऊर्जा बचाएं, पानी न हो तो मुंह नम रखें। तुरंत 112 पर कॉल करें या SOS भेजें।'
      } else if (isBengali) {
        reply = '১. নড়াচড়া করবেন না — ধুলো এড়াতে নাক-মুখ কাপড়ে ঢাকুন। ২. চিৎকার না করে পাইপ/দেয়ালে টোকা দিন, টর্চ/ফোনের আলো দিয়ে সংকেত দিন। ৩. ধীরে শ্বাস নিন, শক্তি বাঁচান। অবিলম্বে ১১২-এ কল করুন।'
      } else if (isOdia) {
        reply = '୧. ହଲଚଲ କରନ୍ତୁ ନାହିଁ — ଧୂଳିରୁ ନାକ-ମୁହଁ ଘୋଡାନ୍ତୁ। ୨. ଚିତ୍କାର ବଦଳରେ ପାଇପ୍/କାନ୍ଥରେ ବାଡ଼େଇ ଶବ୍ଦ କରନ୍ତୁ। ୩. ଧୀରେ ନିଶ୍ୱାସ ନିଅନ୍ତୁ। ତୁରନ୍ତ ୧୧୨ କୁ କଲ୍ କରନ୍ତୁ।'
      } else {
        reply = '1. DO NOT MOVE — cover nose/mouth with cloth to avoid dust. 2. Do NOT shout loudly (save energy); TAP on nearby pipe/wall, use flashlight/phone light to signal rescuers. 3. Breathe slowly, stay still, conserve energy. Call 112 or trigger 1-Tap SOS with GPS immediately.'
      }
    }
    // 9. Flood / Rising Water / Roof Trapped / Submerged
    else if (/\b(flood|water level|submerged|sinking|roof|inundat|water inside|बाढ़|पानी भर|ডুব|বন্যা|ବନ୍ୟା)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = '1. तत्काल छत या ऊंचे सुरक्षित स्थान पर जाएं। 2. घर की मुख्य बिजली स्विच और गैस सिलेंडर बंद कर दें। 3. बहते पानी में न चलें और न गाड़ी चलाएं। तुरंत 112 डायल करें या 1-Tap SOS दबाएं।'
      } else {
        reply = '1. Move immediately to highest available floor or reinforced rooftop. 2. Disconnect main electrical breaker and LPG cylinder valves. 3. Do NOT walk or drive into moving floodwaters. Dial 112 or trigger 1-Tap SOS for NDRF boat rescue.'
      }
    }
    // 10. Earthquake / Tremors / Building Shaking
    else if (/\b(earthquake|tremor|quake|aftershock|भूकंप|ভূমিকম্প|ଭୂମିକମ୍ପ)\b/i.test(lower)) {
      dangerLevel = 'MODERATE'
      if (isHindi) {
        reply = '1. DROP (झुकें), COVER (मजबूत मेज के नीचे सिर ढंकें), HOLD ON (मेज को मजबूती से पकड़े रहें)। 2. खिड़कियों, कांच और भारी अलमारियों से दूर रहें। 3. झटके रुकने के बाद सीढ़ियों से खुले मैदान में जाएं (लिफ्ट का उपयोग न करें)।'
      } else {
        reply = '1. DROP to hands and knees. 2. Take COVER under a sturdy table/desk and protect your head/neck. 3. HOLD ON until shaking stops. Stay away from glass windows and exterior walls. Use stairs, never elevators.'
      }
    }
    // 10. Fire / Smoke / Gas Leak
    else if (/\b(fire|smoke|flame|gas leak|cylinder|आग|धुआं|আগুন|ଧୂଆଁ|ନିଆଁ)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = '1. धुएं से बचने के लिए फर्श पर झुककर रेंगें (Crawl low)। 2. नाक-मुंह पर गीला कपड़ा रखें। 3. कपड़ों में आग लगने पर रुकें, जमीन पर गिरें और लुढ़कें (Stop, Drop & Roll)। तुरंत 101 या 112 पर कॉल करें।'
      } else {
        reply = '1. Stay low and crawl beneath smoke; cover nose and mouth with a damp cloth. 2. Touch doors with the back of your hand before opening—if hot, do not open. 3. If clothes catch fire: STOP, DROP, and ROLL. Call Fire Service (101 / 112).'
      }
    }
    // 11. Electrocution / Live Wire
    else if (/\b(electroc|electric|shock|live wire|बिजली का झटका|বিদ্যুৎ স্পৃষ্ট|କରେଣ୍ଟ)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = '1. पीड़ित को सीधे हाथों से न छुएं। 2. तुरंत मुख्य बिजली स्विच बंद करें या सूखी लकड़ी/प्लास्टिक से तार हटाएं। 3. सांस की जांच करें और तुरंत 108 पर कॉल करें।'
      } else {
        reply = '1. Do NOT touch the victim with bare hands. 2. Turn off the main electrical breaker immediately or use a dry wooden stick to separate the wire. 3. Check responsiveness and call 108 for ambulance.'
      }
    }
    // 12. Heatstroke / Dehydration / Sunstroke
    else if (/\b(heatstroke|heat stroke|sunstroke|dehydrat|loo|लू|গরম লাগা)\b/i.test(lower)) {
      dangerLevel = 'MODERATE'
      if (isHindi) {
        reply = '1. व्यक्ति को तुरंत छायादार और ठंडे स्थान पर ले जाएं। 2. कपड़े ढीले करें और माथे, गर्दन तथा बगलों में गीला कपड़ा लगाएं। 3. यदि होश में हो, तो ओआरएस (ORS) या ठंडा पानी पिलाएं। 108 पर कॉल करें।'
      } else {
        reply = '1. Move person to a cool, shaded area immediately. 2. Loosen tight clothing and apply cool, wet cloths to neck, armpits, and groin. 3. Provide sips of cool water or ORS solution if conscious. Call 108.'
      }
    }
    // 13. Water Purification / Safe Drinking Water
    else if (/\b(purif|drinking water|clean water|boil|water safe|chlorine|पीने का पानी|पानी साफ|জল ফিল্টার)\b/i.test(lower)) {
      if (isHindi) {
        reply = '1. पानी को कम से कम 1 मिनट तक पूरी तरह उबालें। 2. यदि उबालना संभव न हो, तो प्रति लीटर पानी में 3-4 बूंद क्लोरीन लिक्विड या 1 क्लोरीन टैबलेट डालकर 30 मिनट तक रखें। बाढ़ का गंदा पानी सीधे न पिएं।'
      } else {
        reply = '1. Boil water vigorously for at least 1 full minute before drinking. 2. If boiling is not possible, add 3-4 drops of unscented household chlorine bleach or 1 purification tablet per litre and wait 30 minutes before consuming.'
      }
    }
    // 14. Find Shelters / Relief Camps / Food Rations / Water / Medicine
    else if (/\b(shelter|relief camp|food|ration|stay|bed|hungry|water|drinking water|clean water|medicine|medical|hospital|doctor|खाना|पानी|दवाई|राशन|राहत शिविर|জল|খাবার|ପାଣି|ଖାଦ୍ୟ)\b/i.test(lower)) {
      if (isHindi) {
        reply = '1. निकटतम सरकारी राहत शिविर, भोजन, पानी और दवा की लाइव क्षमता देखने के लिए "Find Shelters" टैब पर जाएं। 2. वहां आपको जीपीएस नेविगेशन और राहत केंद्र के फोन नंबर मिल जाएंगे। साफ पानी के लिए उबालें या क्लोरीन डालें।'
      } else {
        reply = '1. Open the "Find Shelters" tab to view live capacity, food/water/medicine status, and GPS directions to the nearest verified relief camp. 2. For safe drinking water: boil 1 minute or add chlorine (3–4 drops/litre, wait 30 min).'
      }
    }
    // 15. Damage Claim / Compensation / SDRF
    else if (/\b(damage|claim|compensation|sdrf|relief fund|मुआवजा|नुकसान|क्षतिपूर्ती|ক্ষতিপূরণ)\b/i.test(lower)) {
      if (isHindi) {
        reply = '1. संपत्ति के नुकसान की भरपाई और SDRF क्लेम के लिए "Damage Assessment" टैब पर जाएं। 2. प्रभावित घर, खेत या दुकान की फोटो अपलोड करें; AI तुरंत नुकसान का स्कोर और अनुमानित राहत राशि तय करेगा।'
      } else {
        reply = '1. Visit the "Damage Assessment" tab to upload geotagged photos of damaged infrastructure. 2. Our AI ResNet-50 model computes the damage score and SDRF compensation entitlement automatically.'
      }
    }
    // 16. Missing Person Lookup / Report
    else if (/\b(missing|lost person|lost|find family|find person|लापता|गुमशुदा|নিখোঁজ|ନିଖୋଜ)\b/i.test(lower)) {
      if (isHindi) {
        reply = '1. लापता व्यक्ति की रिपोर्ट दर्ज करने या खोजने के लिए "Missing Persons" टैब पर जाएं। 2. नाम, फोटो और अंतिम स्थान दर्ज करें, हमारा सिस्टम राहत शिविरों में चेहरे की पहचान (AI matching) से खोजेगा।'
      } else {
        reply = '1. Go to the "Missing Persons" registry tab to report or search for family members. 2. Upload photos and details to enable cross-camp facial matching across emergency shelters.'
      }
    }
    // 17. Track Incident / Tracking ID
    else if (/\b(track|tracking id|status of report|where is help|स्थिति|ट्रैक)\b/i.test(lower)) {
      if (isHindi) {
        reply = '1. अपने रिपोर्ट या SOS की लाइव स्थिति जानने के लिए "Track Report" टैब में अपनी ट्रैकिंग आईडी (जैसे SOS-XXXX) दर्ज करें। वहां आपको तैनात स्वयंसेवक और दूरी का मैप दिखेगा।'
      } else {
        reply = '1. Enter your Tracking ID (e.g. SOS-...) in the "Track Report" page to view real-time response telemetry, assigned NDRF units, and arrival estimates on the live map.'
      }
    }
    // 18. Help / Save Me / Emergency Distress Call
    else if (/\b(help|helpp|save me|bachao|madad|danger|emergency|khatra|sahajjo|sahajya)\b/i.test(lower)) {
      isCritical = true
      dangerLevel = 'CRITICAL'
      if (isHindi) {
        reply = 'मैं आपकी सहायता के लिए तैयार हूँ। 1. सीधे खतरे में तुरंत 112 या 108 पर कॉल करें। 2. बताएं कि आप कहां हैं और क्या सहायता चाहिए (चोट, बाढ़, आग, या भोजन)। 3. आप ऊपर 1-Tap SOS बटन दबाकर भी तुरंत रेस्क्यू बुला सकते हैं।'
      } else {
        reply = 'I am here with you. 1. If you are in immediate life-threatening danger, call 112 or 108 right now. 2. Tell me your situation: are you injured, drowning/trapped in flood, facing fire, or needing shelter? 3. You can also trigger the 1-Tap SOS button to transmit GPS telemetry to NDRF.'
      }
    }
    // 19. Emergency Phone Numbers / Helpline
    else if (/\b(number|helpline|phone|contact|कॉल|नंबर|হেল্পলাইন|ହେଲ୍ପଲାଇନ)\b/i.test(lower)) {
      reply = 'Emergency Hotlines: 112 (National Emergency), 108 (Ambulance), 101 (Fire), 1070 (State Disaster Management Authority), 1078 (NDMA Emergency Helpline).'
    }
    // 20. Panic / Anxiety / Scared / Shivering / Mental Stress
    else if (/\b(panic|scared|afraid|fear|anxious|anxiety|breathe|shivering|nervous|डर|घबराहट|चिंता|ভয়|ଡର)\b/i.test(lower)) {
      dangerLevel = 'MODERATE'
      exerciseType = '4-4-4_BOX_BREATHING'
      if (isHindi) {
        reply = 'शांत रहें। स्क्रीन पर दिखाए जा रहे 4-4-4 ब्रीदिंग चक्र का पालन करें: 4 सेकंड गहरी सांस अंदर लें, 4 सेकंड रोकें, 4 सेकंड में धीरे-धीरे बाहर छोड़ें। बचाव दल सक्रिय हैं, आप सुरक्षित रहेंगे।'
      } else {
        reply = 'Take a slow, deep breath with me. Follow the 4-4-4 breathing cycle on screen: Inhale for 4s, hold for 4s, exhale slowly for 4s. Emergency response teams and relief resources are actively deployed in your area.'
      }
    }
    // 21. Greetings / Initial Inquiries
    else if (/^(hi|hello|hey|namaste|hello bhaiya|bhaiya|namaskar|helo|hlo|pranam|hola|kya hal|good morning|good evening)[\s!.]*$/i.test(raw)) {
      if (isHindi) {
        reply = 'नमस्ते! मैं आपदामित्र AI हूँ। बताएं कि आपको क्या आपातकालीन चिकित्सा, आपदा सुरक्षा, भोजन/आश्रय या राहत सहायता चाहिए?'
      } else if (isBengali) {
        reply = 'নমস্কার! আমি আপদামিত্র AI। জরুরি চিকিৎসা, আশ্রয়, বা দুর্যোগ সুরক্ষার জন্য কীভাবে সাহায্য করতে পারি জানান।'
      } else if (isOdia) {
        reply = 'ନମସ୍କାର! ମୁଁ ଆପଦାମିତ୍ର AI। ଜରୁରୀକାଳୀନ ଚିକିତ୍ସା, ଆଶ୍ରୟ ବା ବିପର୍ଯ୍ୟୟ ସହାୟତା ପାଇଁ ପଚାରନ୍ତୁ।'
      } else {
        reply = 'Namaste! I am AapdaMitra AI, your 24/7 disaster survival, triage, and crisis companion. Tell me what emergency, first-aid, or relief assistance you need right now.'
      }
    }
    // 22. Specific Injury Parts or Dynamic Context
    else if (/\b(hand|finger|leg|arm|foot|head|eye|stomach|back|shoulder|chest|neck|haath|pair|ungli|sar|aankh)\b/i.test(lower)) {
      dangerLevel = 'MODERATE'
      if (isHindi) {
        reply = '1. घायल हिस्से को स्थिर रखें और अधिक न हिलाएं। 2. यदि खून बह रहा है तो साफ कपड़े से तेज दबाव दें। 3. सूजन या दर्द में कपड़े में बर्फ लपेटकर लगाएं। सहायता के लिए 108 या 112 पर कॉल करें।'
      } else {
        reply = '1. Keep the injured area supported and immobilized. 2. If bleeding, apply firm pressure with a clean cloth. 3. If bruised or painful, apply cold compress wrapped in cloth. In severe pain or deformity, call 108.'
      }
    }
    // 23. Dynamic Fallback - Helpful menu instead of vague prompt
    else {
      const nameSuffix = victimName && victimName !== 'Friend' ? ` ${victimName}` : ''
      if (isHindi) {
        reply = `मैं आपकी सहायता के लिए तैयार हूँ${nameSuffix}। आप इनमें से किसी बारे में पूछ सकते हैं:\n1. बाढ़/आग/भूकंप से बचाव\n2. खून, जलना, हड्डी टूटना, सांप काटना\n3. आश्रय, खाना-पानी, दवा\n4. घबराहट के लिए 4-4-4 साँस\nकृपया अपना सवाल स्पष्ट लिखें। आपातकाल में 112 / 108 पर कॉल करें।`
      } else if (isBengali) {
        reply = `আমি আপনার পাশে আছি${nameSuffix}। আপনি জিজ্ঞাসা করতে পারেন:\n1. বন্যা/আগুন/ভূমিকম্প থেকে বাঁচার উপায়\n2. রক্তপাত, পোড়া, হাড় ভাঙা, সাপে কাটা\n3. আশ্রয়, খাবার-জল, ওষুধ\n4. আতঙ্কের জন্য 4-4-4 শ্বাস\nপ্রশ্নটি স্পষ্ট লিখুন। জরুরিতে 112 / 108 কল করুন।`
      } else if (isOdia) {
        reply = `ମୁଁ ଆପଣଙ୍କ ସହାୟତା ପାଇଁ ପ୍ରସ୍ତୁତ${nameSuffix}। ଆପଣ ପଚାରିପାରନ୍ତି:\n1. ବନ୍ୟା/ନିଆଁ/ଭୂମିକମ୍ପରୁ ରକ୍ଷା\n2. ରକ୍ତସ୍ରାବ, ପୋଡ଼ା, ହାଡ଼ ଭଙ୍ଗା, ସାପ କାମୁଡ଼ା\n3. ଆଶ୍ରୟ, ଖାଦ୍ୟ-ପାଣି, ଔଷଧ\n4. ଭୟ ପାଇଁ 4-4-4 ଶ୍ୱାସ\nଜରୁରୀରେ 112 / 108 କୁ କଲ୍ କରନ୍ତୁ।`
      } else {
        reply = `I am here with you${nameSuffix}. Ask me about:\n1. Flood / Fire / Earthquake survival\n2. Bleeding, Burns, Fracture, Snakebite, Choking\n3. Shelters, Food/Water, Medicine\n4. Panic relief: 4-4-4 breathing\nTry: "water entering house", "severe bleeding", or "need shelter". In danger call 112 / 108.`
      }
    }

    return {
      reply,
      exerciseType,
      isCritical,
      dangerLevel,
      helpline: isCritical ? '112' : dangerLevel === 'MODERATE' ? '108' : undefined,
      safetyChecklist: [
        'Stay in a safe location on the highest accessible floor',
        'Conserve mobile phone battery for emergency coordination',
        'National Emergency Hotline: 112 | Ambulance: 108',
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

  // ---- Reset Mock Data to Fresh 1000s of Records ----
  resetData(): void {
    reportsStore = generate1500Reports()
    sheltersStore = generate250Shelters()
    volunteersStore = generate500Volunteers()
    agenciesStore = generate100Agencies()
    alertsStore = generate150Alerts()
    checkinsStore = generate800Checkins()
    missingStore = generate300MissingPersons()
    damageStore = generate600DamageAssessments()
    auditStore = generate1000AuditLogs()

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
