/**
 * Seeder script for Firebase Realtime Database (RTDB) — AapdaSetu
 * Target: https://sihapdasetu-default-rtdb.firebaseio.com/
 *
 * Can use either REST API directly (if rules allow or secret provided) or Firebase Admin SDK.
 * Run: npx tsx scripts/seed-firebase-rtdb.ts
 */
import { hashPassword } from '../src/lib/crypto.js';

const RTDB_URL = process.env.FIREBASE_DATABASE_URL || 'https://sihapdasetu-default-rtdb.firebaseio.com';

const DISASTER_SECTORS = [
  { city: 'Kolkata - Salt Lake', lat: 22.5726, lng: 88.3639 },
  { city: 'Kolkata - New Town', lat: 22.579, lng: 88.378 },
  { city: 'Kolkata - Bidhannagar', lat: 22.567, lng: 88.401 },
  { city: 'Kolkata - Howrah', lat: 22.5958, lng: 88.2636 },
  { city: 'Kolkata - Dum Dum', lat: 22.642, lng: 88.396 },
  { city: 'Bhubaneswar - Central', lat: 20.2961, lng: 85.8245 },
  { city: 'Bhubaneswar - Kalinga Nagar', lat: 20.2934, lng: 85.817 },
  { city: 'Bhubaneswar - Patia', lat: 20.355, lng: 85.818 },
  { city: 'Cuttack - Badambadi', lat: 20.4625, lng: 85.883 },
  { city: 'Puri - Coastal Sector', lat: 19.8135, lng: 85.8312 },
];

const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rahul', 'Sneha', 'Ramesh', 'Sunita', 'Amit', 'Ananya',
  'Mohammed', 'Fatima', 'Bikram', 'Rojalin', 'Subhash', 'Deepa', 'Manoj',
  'Kavita', 'Sanjay', 'Pooja', 'Tanmay', 'Meenakshi', 'Arjun', 'Ipsita'
];

const LAST_NAMES = [
  'Das', 'Mohanty', 'Sharma', 'Patel', 'Sen', 'Banerjee', 'Ghosh',
  'Chatterjee', 'Sahoo', 'Behera', 'Patnaik', 'Nayak', 'Mishra', 'Rout',
  'Bose', 'Gupta', 'Singh', 'Ali', 'Khan', 'Roy'
];

export function buildDatabasePayload() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@aapdasetu.org';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123';

  // 1. Admin user
  const admin_users: Record<string, any> = {
    admin_01: {
      id: 'admin_01',
      email: adminEmail,
      name: 'AapdaSetu Administrator',
      passwordHash: hashPassword(adminPassword),
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  // 2. Agencies
  const agencies: Record<string, any> = {
    agency_01: { id: 'agency_01', name: 'NDRF 2nd Battalion Command', type: 'ndrf', contactPhone: '+91-33-23241100', jurisdiction: 'Eastern Sector' },
    agency_02: { id: 'agency_02', name: 'State Disaster Emergency Team (SDRF)', type: 'ndrf', contactPhone: '+91-674-2531000', jurisdiction: 'State Rapid Response' },
    agency_03: { id: 'agency_03', name: 'National Fire & Rescue Force', type: 'fire_department', contactPhone: '101', jurisdiction: 'Urban & Industrial Zones' },
    agency_04: { id: 'agency_04', name: 'Capital Medical Emergency Hospital', type: 'hospital', contactPhone: '108', jurisdiction: 'Advanced Life Support' },
    agency_05: { id: 'agency_05', name: 'Red Cross Disaster Relief Corps', type: 'ngo', contactPhone: '+91-11-23716441', jurisdiction: 'Shelter Aid' },
  };

  // 3. Shelters
  const shelters: Record<string, any> = {
    shelter_01: {
      id: 'shelter_01',
      name: 'Sector V Community Relief Center',
      address: 'Block EP & GP, Sector V, Salt Lake, Kolkata',
      latitude: 22.574,
      longitude: 88.365,
      capacity: 500,
      occupancy: 210,
      facilities: ['food', 'water', 'medical_station', 'power_generator'],
      contactPhone: '+91-33-23570001',
      status: 'open',
      checkinCode: 'DEMO01',
    },
    shelter_02: {
      id: 'shelter_02',
      name: 'New Town Higher Secondary Shelter',
      address: 'Action Area 1, New Town, Kolkata',
      latitude: 22.579,
      longitude: 88.378,
      capacity: 350,
      occupancy: 340,
      facilities: ['food', 'water', 'power_generator'],
      contactPhone: '+91-33-23570002',
      status: 'full',
      checkinCode: 'DEMO02',
    },
    shelter_03: {
      id: 'shelter_03',
      name: 'Bidhannagar Central Stadium Relief Camp',
      address: 'Salt Lake Stadium Complex, Bidhannagar',
      latitude: 22.567,
      longitude: 88.401,
      capacity: 1200,
      occupancy: 450,
      facilities: ['food', 'water', 'medical_station', 'power_generator'],
      contactPhone: '+91-33-23570003',
      status: 'open',
      checkinCode: 'DEMO03',
    },
    shelter_04: {
      id: 'shelter_04',
      name: 'Janata Maidan Disaster Emergency Camp',
      address: 'Janata Maidan, Jayadev Vihar, Bhubaneswar',
      latitude: 20.2961,
      longitude: 85.8245,
      capacity: 800,
      occupancy: 310,
      facilities: ['food', 'water', 'medical_station', 'power_generator'],
      contactPhone: '+91-674-2531101',
      status: 'open',
      checkinCode: 'DEMO04',
    },
    shelter_05: {
      id: 'shelter_05',
      name: 'Kalinga Stadium Evacuation Center',
      address: 'Kalinga Stadium, Bhubaneswar',
      latitude: 20.2934,
      longitude: 85.817,
      capacity: 1000,
      occupancy: 150,
      facilities: ['food', 'water', 'medical_station', 'power_generator'],
      contactPhone: '+91-674-2531102',
      status: 'open',
      checkinCode: 'DEMO05',
    },
  };

  // 4. Volunteers
  const volunteers: Record<string, any> = {};
  const skillsList = [
    ['medical', 'search_rescue'],
    ['medical'],
    ['driving', 'logistics'],
    ['search_rescue', 'driving'],
    ['logistics', 'medical'],
  ];

  for (let i = 0; i < 50; i++) {
    const f = FIRST_NAMES[i % FIRST_NAMES.length];
    const l = LAST_NAMES[i % LAST_NAMES.length];
    const sec = DISASTER_SECTORS[i % DISASTER_SECTORS.length];
    const id = `vol_${(i + 1).toString().padStart(3, '0')}`;
    volunteers[id] = {
      id,
      name: `${f} ${l}`,
      phone: `98765${(10000 + i).toString()}`,
      skills: skillsList[i % skillsList.length],
      latitude: sec.lat + Math.sin(i) * 0.02,
      longitude: sec.lng + Math.cos(i) * 0.02,
      status: i % 3 === 0 ? 'available' : i % 3 === 1 ? 'on_duty' : 'offline',
      verificationStatus: 'verified',
      trainingCompleted: i % 2 === 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 5. Reports (100 reports for quick RTDB sync)
  const reports: Record<string, any> = {};
  const types = ['flood', 'medical', 'fire', 'earthquake', 'accident', 'missing_person', 'other'];
  for (let j = 1; j <= 100; j++) {
    const type = types[j % types.length];
    const sector = DISASTER_SECTORS[j % DISASTER_SECTORS.length];
    const fName = FIRST_NAMES[j % FIRST_NAMES.length];
    const lName = LAST_NAMES[(j * 3) % LAST_NAMES.length];
    const priority =
      type === 'flood' || type === 'medical' || type === 'fire' || type === 'earthquake'
        ? j % 4 === 0 ? 'YELLOW' : 'RED'
        : j % 3 === 0 ? 'GREEN' : 'YELLOW';
    const score = priority === 'RED' ? Math.floor(80 + (j % 19)) : priority === 'YELLOW' ? Math.floor(50 + (j % 29)) : Math.floor(30 + (j % 20));
    const status = j % 7 === 0 ? 'resolved' : j % 3 === 0 ? 'in_progress' : 'pending';
    const trackingHex = ((j * 16807 + 12345) % 0xffffff).toString(16).toUpperCase().padStart(6, '0');
    const id = `report_${j.toString().padStart(4, '0')}`;

    reports[id] = {
      id,
      trackingId: `SOS-${trackingHex}`,
      type,
      status,
      priorityScore: score,
      priorityLabel: priority,
      latitude: sector.lat + Math.sin(j * 12.34) * 0.04,
      longitude: sector.lng + Math.cos(j * 56.78) * 0.04,
      landmark: `${sector.city}, Sector ${(j % 12) + 1}`,
      description: `Disaster emergency reported in ${sector.city}. Immediate relief coordination required.`,
      reporterName: `${fName} ${lName}`,
      reporterPhone: `+91-9${(100000000 + ((j * 987654) % 899999999)).toString()}`,
      source: j % 2 === 0 ? 'sos' : 'form',
      createdAt: new Date(Date.now() - 1000 * 60 * (j * 15)).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 6. Alerts
  const alerts: Record<string, any> = {
    alert_01: {
      id: 'alert_01',
      title: 'Extreme Inundation Warning — High River Discharge',
      message: 'Continuous heavy rainfall has caused rapid river swelling. Low-lying sectors should immediately move to designated multi-story relief shelters.',
      severity: 'critical',
      channel: 'all',
      targetArea: 'Kolkata, North 24 Parganas, Howrah',
      createdAt: new Date().toISOString(),
    },
    alert_02: {
      id: 'alert_02',
      title: 'Severe Weather Bulletin: Wind Gusts up to 85 km/h',
      message: 'Avoid standing near high-voltage electrical lines, old trees, or tin roofs. Stay indoors on high ground.',
      severity: 'warning',
      channel: 'all',
      targetArea: 'Coastal Districts & Delta Zone',
      createdAt: new Date().toISOString(),
    },
  };

  return {
    admin_users,
    agencies,
    shelters,
    volunteers,
    reports,
    alerts,
  };
}

async function main() {
  console.log(`📡 Targeting Firebase Realtime Database at: ${RTDB_URL}`);
  const data = buildDatabasePayload();

  // Try pushing via REST API
  const authQuery = process.env.FIREBASE_AUTH_SECRET ? `?auth=${process.env.FIREBASE_AUTH_SECRET}` : '';
  const endpoint = `${RTDB_URL}/.json${authQuery}`;

  console.log(`📤 Sending PUT request to ${endpoint}...`);
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌ HTTP ${response.status}: ${text}`);
    if (text.includes('Permission denied')) {
      console.log('\n🔒 Realtime Database is locked. To allow direct upload:');
      console.log('1. In Firebase Console -> Realtime Database -> Rules tab:');
      console.log('2. Set rules to:');
      console.log('   {\n     "rules": {\n       ".read": true,\n       ".write": true\n     }\n   }');
      console.log('3. Click "Publish", then re-run this command:');
      console.log('   npm run db:seed:rtdb --prefix backend-aapdasetu');
    }
    process.exit(1);
  }

  console.log('🎉 Successfully populated Firebase Realtime Database with all tables and records!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
