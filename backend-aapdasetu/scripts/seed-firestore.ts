/**
 * Seed & Migration script for Firebase Cloud Firestore — AapdaSetu
 * Migrates and seeds 1,000+ records across all collections matching PostgreSQL schema.
 *
 * Run: npx tsx scripts/seed-firestore.ts
 */
import { getFirestoreDb, COLLECTIONS } from '../src/lib/firestore.js';
import { hashPassword } from '../src/lib/crypto.js';

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

async function seedFirestore() {
  console.log('🚀 Connecting to Firebase Cloud Firestore...');
  const db = getFirestoreDb();

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@aapdasetu.org';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123';

  // 1. Admin Users Collection
  console.log('📦 Seeding admin_users...');
  const adminQuery = await db.collection(COLLECTIONS.ADMIN_USERS).where('email', '==', adminEmail).limit(1).get();
  if (adminQuery.empty) {
    const adminDoc = db.collection(COLLECTIONS.ADMIN_USERS).doc();
    await adminDoc.set({
      id: adminDoc.id,
      email: adminEmail,
      name: 'AapdaSetu Administrator',
      passwordHash: hashPassword(adminPassword),
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Admin user seeded: ${adminEmail}`);
  } else {
    console.log('ℹ️ Admin user already exists.');
  }

  // 2. Agencies Collection
  console.log('📦 Seeding agencies...');
  const agenciesSnap = await db.collection(COLLECTIONS.AGENCIES).limit(1).get();
  if (agenciesSnap.empty) {
    const agencies = [
      { name: 'NDRF 2nd Battalion Command', type: 'ndrf', contactPhone: '+91-33-23241100', jurisdiction: 'Eastern Sector' },
      { name: 'State Disaster Emergency Team (SDRF)', type: 'ndrf', contactPhone: '+91-674-2531000', jurisdiction: 'State Rapid Response' },
      { name: 'National Fire & Rescue Force', type: 'fire_department', contactPhone: '101', jurisdiction: 'Urban & Industrial Zones' },
      { name: 'Capital Medical Emergency Hospital', type: 'hospital', contactPhone: '108', jurisdiction: 'Advanced Life Support' },
      { name: 'Red Cross Disaster Relief Corps', type: 'ngo', contactPhone: '+91-11-23716441', jurisdiction: 'Shelter Aid' },
    ];
    const batch = db.batch();
    for (const a of agencies) {
      const docRef = db.collection(COLLECTIONS.AGENCIES).doc();
      batch.set(docRef, {
        id: docRef.id,
        ...a,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
    console.log(`✅ Seeded ${agencies.length} agencies.`);
  } else {
    console.log('ℹ️ Agencies already seeded.');
  }

  // 3. Shelters Collection
  console.log('📦 Seeding shelters...');
  const sheltersSnap = await db.collection(COLLECTIONS.SHELTERS).limit(1).get();
  if (sheltersSnap.empty) {
    const sheltersList = [
      {
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
      {
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
      {
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
      {
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
      {
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
    ];

    const batch = db.batch();
    for (const s of sheltersList) {
      const docRef = db.collection(COLLECTIONS.SHELTERS).doc();
      batch.set(docRef, {
        id: docRef.id,
        ...s,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
    console.log(`✅ Seeded ${sheltersList.length} shelters.`);
  } else {
    console.log('ℹ️ Shelters already seeded.');
  }

  // 4. Volunteers Collection
  console.log('📦 Seeding volunteers...');
  const volunteersSnap = await db.collection(COLLECTIONS.VOLUNTEERS).limit(1).get();
  if (volunteersSnap.empty) {
    const skillsList = [
      ['medical', 'search_rescue'],
      ['medical'],
      ['driving', 'logistics'],
      ['search_rescue', 'driving'],
      ['logistics', 'medical'],
    ];

    const batch = db.batch();
    for (let i = 0; i < 50; i++) {
      const f = FIRST_NAMES[i % FIRST_NAMES.length];
      const l = LAST_NAMES[i % LAST_NAMES.length];
      const sec = DISASTER_SECTORS[i % DISASTER_SECTORS.length];
      const docRef = db.collection(COLLECTIONS.VOLUNTEERS).doc();
      batch.set(docRef, {
        id: docRef.id,
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
      });
    }
    await batch.commit();
    console.log('✅ Seeded 50 volunteers.');
  } else {
    console.log('ℹ️ Volunteers already seeded.');
  }

  // 5. Reports Collection (1000+ incident records)
  console.log('📦 Seeding reports (1,000+ incident reports)...');
  const reportsSnap = await db.collection(COLLECTIONS.REPORTS).limit(1).get();
  if (reportsSnap.empty) {
    const types = ['flood', 'medical', 'fire', 'earthquake', 'accident', 'missing_person', 'other'];
    const totalReports = 1000;
    const batchSize = 400;

    for (let i = 1; i <= totalReports; i += batchSize) {
      const batch = db.batch();
      const limit = Math.min(i + batchSize - 1, totalReports);
      for (let j = i; j <= limit; j++) {
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

        const docRef = db.collection(COLLECTIONS.REPORTS).doc();
        batch.set(docRef, {
          id: docRef.id,
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
        });
      }
      await batch.commit();
      console.log(`✅ Seeded reports batch up to ${limit}...`);
    }
  } else {
    console.log('ℹ️ Reports already seeded.');
  }

  // 6. Alerts Collection
  console.log('📦 Seeding alerts...');
  const alertsSnap = await db.collection(COLLECTIONS.ALERTS).limit(1).get();
  if (alertsSnap.empty) {
    const alerts = [
      {
        title: 'Extreme Inundation Warning — High River Discharge',
        message: 'Continuous heavy rainfall has caused rapid river swelling. Low-lying sectors should immediately move to designated multi-story relief shelters.',
        severity: 'critical',
        channel: 'all',
        targetArea: 'Kolkata, North 24 Parganas, Howrah',
      },
      {
        title: 'Severe Weather Bulletin: Wind Gusts up to 85 km/h',
        message: 'Avoid standing near high-voltage electrical lines, old trees, or tin roofs. Stay indoors on high ground.',
        severity: 'warning',
        channel: 'all',
        targetArea: 'Coastal Districts & Delta Zone',
      },
    ];
    const batch = db.batch();
    for (const a of alerts) {
      const docRef = db.collection(COLLECTIONS.ALERTS).doc();
      batch.set(docRef, {
        id: docRef.id,
        ...a,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
    console.log(`✅ Seeded ${alerts.length} alerts.`);
  } else {
    console.log('ℹ️ Alerts already seeded.');
  }

  console.log('🎉 Firebase Cloud Firestore migration and seeding completed successfully!');
}

seedFirestore().catch((err) => {
  console.error('❌ Firestore seeding error:', err);
  process.exit(1);
});
