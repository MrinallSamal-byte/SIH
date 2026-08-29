/**
 * Seed script — idempotent demo data for the AapdaSetu backend with 1000+ records.
 * Run: npm run db:seed
 */
import { PrismaClient, IncidentType, PriorityLabel, IncidentStatus, ShelterStatus, FacilityType, VolunteerSkill, VolunteerStatus } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto.js';

const prisma = new PrismaClient();

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

const FIRST_NAMES = ['Aarav', 'Priya', 'Rahul', 'Sneha', 'Ramesh', 'Sunita', 'Amit', 'Ananya', 'Mohammed', 'Fatima', 'Bikram', 'Rojalin', 'Subhash', 'Deepa', 'Manoj', 'Kavita', 'Sanjay', 'Pooja', 'Tanmay', 'Meenakshi', 'Arjun', 'Ipsita'];
const LAST_NAMES = ['Das', 'Mohanty', 'Sharma', 'Patel', 'Sen', 'Banerjee', 'Ghosh', 'Chatterjee', 'Sahoo', 'Behera', 'Patnaik', 'Nayak', 'Mishra', 'Rout', 'Bose', 'Gupta', 'Singh', 'Ali', 'Khan', 'Roy'];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@aapdasetu.org';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123';

  // Refuse to install the publicly-known default password into any
  // production-looking database — it would be a full admin compromise.
  if (adminPassword === 'Admin@123' && process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed the default ADMIN_PASSWORD in production — set ADMIN_EMAIL/ADMIN_PASSWORD.');
  }

  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        name: 'AapdaSetu Administrator',
        passwordHash: hashPassword(adminPassword),
        role: 'admin',
      },
    });
    console.log('Seeded admin user:', adminEmail);
  }

  if ((await prisma.volunteer.count()) === 0) {
    const volData = [];
    const skillsList: VolunteerSkill[][] = [
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
      volData.push({
        name: `${f} ${l}`,
        // Digits-only last-10 form — the same normalization the volunteer
        // login applies, otherwise seeded volunteers could never sign in.
        phone: `98765${(10000 + i).toString()}`,
        skills: skillsList[i % skillsList.length],
        latitude: sec.lat + (Math.sin(i) * 0.02),
        longitude: sec.lng + (Math.cos(i) * 0.02),
        status: (i % 3 === 0 ? 'available' : i % 3 === 1 ? 'on_duty' : 'offline') as VolunteerStatus,
      });
    }

    await prisma.volunteer.createMany({ data: volData });
    console.log('Seeded 50 volunteers');
  }

  if ((await prisma.agency.count()) === 0) {
    await prisma.agency.createMany({
      data: [
        { name: 'NDRF 2nd Battalion Command', type: 'ndrf', contactPhone: '+91-33-23241100', jurisdiction: 'Eastern Sector' },
        { name: 'State Disaster Emergency Team (SDRF)', type: 'ndrf', contactPhone: '+91-674-2531000', jurisdiction: 'State Rapid Response' },
        { name: 'National Fire & Rescue Force', type: 'fire_department', contactPhone: '101', jurisdiction: 'Urban & Industrial Zones' },
        { name: 'Capital Medical Emergency Hospital', type: 'hospital', contactPhone: '108', jurisdiction: 'Advanced Life Support' },
        { name: 'Red Cross Disaster Relief Corps', type: 'ngo', contactPhone: '+91-11-23716441', jurisdiction: 'Shelter Aid' },
      ],
    });
    console.log('Seeded 5 agencies');
  }

  if ((await prisma.shelter.count()) === 0) {
    const sheltersList = [
      {
        name: 'Sector V Community Relief Center',
        address: 'Block EP & GP, Sector V, Salt Lake, Kolkata',
        latitude: 22.574,
        longitude: 88.365,
        capacity: 500,
        occupancy: 210,
        facilities: ['food', 'water', 'medical_station', 'power_generator'] as FacilityType[],
        contactPhone: '+91-33-23570001',
        status: 'open' as ShelterStatus,
      },
      {
        name: 'New Town Higher Secondary Shelter',
        address: 'Action Area 1, New Town, Kolkata',
        latitude: 22.579,
        longitude: 88.378,
        capacity: 350,
        occupancy: 340,
        facilities: ['food', 'water', 'power_generator'] as FacilityType[],
        contactPhone: '+91-33-23570002',
        status: 'full' as ShelterStatus,
      },
      {
        name: 'Bidhannagar Central Stadium Relief Camp',
        address: 'Salt Lake Stadium Complex, Bidhannagar',
        latitude: 22.567,
        longitude: 88.401,
        capacity: 1200,
        occupancy: 450,
        facilities: ['food', 'water', 'medical_station', 'power_generator'] as FacilityType[],
        contactPhone: '+91-33-23570003',
        status: 'open' as ShelterStatus,
      },
      {
        name: 'Janata Maidan Disaster Emergency Camp',
        address: 'Janata Maidan, Jayadev Vihar, Bhubaneswar',
        latitude: 20.2961,
        longitude: 85.8245,
        capacity: 800,
        occupancy: 310,
        facilities: ['food', 'water', 'medical_station', 'power_generator'] as FacilityType[],
        contactPhone: '+91-674-2531101',
        status: 'open' as ShelterStatus,
      },
      {
        name: 'Kalinga Stadium Evacuation Center',
        address: 'Kalinga Stadium, Bhubaneswar',
        latitude: 20.2934,
        longitude: 85.817,
        capacity: 1000,
        occupancy: 150,
        facilities: ['food', 'water', 'medical_station', 'power_generator'] as FacilityType[],
        contactPhone: '+91-674-2531102',
        status: 'open' as ShelterStatus,
      },
    ];

    for (const s of sheltersList) {
      await prisma.shelter.create({ data: s });
    }
    console.log('Seeded shelters');
  }

  if ((await prisma.report.count()) === 0) {
    const types: IncidentType[] = ['flood', 'medical', 'fire', 'earthquake', 'accident', 'missing_person', 'other'];
    const reportsBatch = [];

    for (let i = 1; i <= 1020; i++) {
      const type = types[i % types.length];
      const sector = DISASTER_SECTORS[i % DISASTER_SECTORS.length];
      const fName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lName = LAST_NAMES[(i * 3) % LAST_NAMES.length];

      const priority: PriorityLabel = type === 'flood' || type === 'medical' || type === 'fire' || type === 'earthquake'
        ? (i % 4 === 0 ? 'YELLOW' : 'RED')
        : (i % 3 === 0 ? 'GREEN' : 'YELLOW');

      const score = priority === 'RED' ? Math.floor(80 + (i % 19)) : priority === 'YELLOW' ? Math.floor(50 + (i % 29)) : Math.floor(30 + (i % 20));
      const status: IncidentStatus = i % 7 === 0 ? 'resolved' : i % 3 === 0 ? 'in_progress' : 'pending';

      const trackingHex = ((i * 16807 + 12345) % 0xffffff).toString(16).toUpperCase().padStart(6, '0');

      reportsBatch.push({
        trackingId: `SOS-${trackingHex}`,
        type,
        status,
        priorityScore: score,
        priorityLabel: priority,
        latitude: sector.lat + (Math.sin(i * 12.34) * 0.04),
        longitude: sector.lng + (Math.cos(i * 56.78) * 0.04),
        landmark: `${sector.city}, Sector ${(i % 12) + 1}`,
        description: `Disaster emergency reported in ${sector.city}. Immediate relief coordination required.`,
        reporterName: `${fName} ${lName}`,
        reporterPhone: `+91-9${(100000000 + ((i * 987654) % 899999999)).toString()}`,
        source: i % 2 === 0 ? 'sos' : 'form',
        createdAt: new Date(Date.now() - 1000 * 60 * (i * 15)).toISOString(),
      });
    }

    // Insert in batches of 200
    for (let b = 0; b < reportsBatch.length; b += 200) {
      const chunk = reportsBatch.slice(b, b + 200);
      await prisma.report.createMany({ data: chunk as any });
    }
    console.log('Seeded 1020 incident reports');
  }

  if ((await prisma.alert.count()) === 0) {
    await prisma.alert.createMany({
      data: [
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
      ],
    });
    console.log('Seeded disaster alerts');
  }

  console.log('Seeding complete! 1,000+ realistic records ready.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });