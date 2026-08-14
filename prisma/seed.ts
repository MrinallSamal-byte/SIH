/**
 * Seed script — idempotent demo data for the AapdaSetu backend.
 * Run: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto.js';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@aapdasetu.org';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123';

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
    await prisma.volunteer.createMany({
      data: [
        { name: 'Rakesh Mohanty', phone: '+91-9000000001', skills: ['medical', 'search_rescue'], latitude: 20.2961, longitude: 85.8245, status: 'available' },
        { name: 'Sunita Behera', phone: '+91-9000000002', skills: ['medical'], latitude: 20.3, longitude: 85.83, status: 'available' },
        { name: 'Arjun Patnaik', phone: '+91-9000000003', skills: ['driving', 'logistics'], latitude: 20.31, longitude: 85.82, status: 'offline' },
        { name: 'Pratik Das', phone: '+91-9000000004', skills: ['search_rescue', 'driving'], latitude: 20.28, longitude: 85.84, status: 'available' },
      ],
    });
    console.log('Seeded 4 volunteers');
  }

  if ((await prisma.agency.count()) === 0) {
    await prisma.agency.createMany({
      data: [
        { name: 'NDRF Bhubaneswar', type: 'ndrf', contactPhone: '+91-9438888888', jurisdiction: 'Khordha', latitude: 20.2961, longitude: 85.8245 },
        { name: 'Fire Station Master Canteen', type: 'fire_department', contactPhone: '+91-674-2531000', jurisdiction: 'Bhubaneswar', latitude: 20.27, longitude: 85.84 },
        { name: 'Capital Police Station', type: 'police', contactPhone: '+91-674-2391391', jurisdiction: 'Bhubaneswar', latitude: 20.26, longitude: 85.83 },
        { name: 'Capital Hospital Bhubaneswar', type: 'hospital', contactPhone: '+91-674-2390190', jurisdiction: 'Bhubaneswar', latitude: 20.26, longitude: 85.82 },
      ],
    });
    console.log('Seeded 4 agencies');
  }

  if ((await prisma.shelter.count()) === 0) {
    const s1 = await prisma.shelter.create({
      data: {
        name: 'Janata Maidan Relief Shelter',
        address: 'Janata Maidan, Bhubaneswar',
        latitude: 20.2686,
        longitude: 85.8327,
        capacity: 500,
        occupancy: 0,
        facilities: ['food', 'water', 'medical_station'],
        contactPhone: '+91-674-2345000',
        status: 'open',
      },
    });
    const s2 = await prisma.shelter.create({
      data: {
        name: 'Kalinga Stadium Shelter',
        address: 'Kalinga Stadium, Bhubaneswar',
        latitude: 20.2934,
        longitude: 85.817,
        capacity: 800,
        occupancy: 0,
        facilities: ['food', 'water', 'medical_station', 'power_generator'],
        contactPhone: '+91-674-2744444',
        status: 'open',
      },
    });
    const s3 = await prisma.shelter.create({
      data: {
        name: 'Rajdhani High School Shelter',
        address: 'Rajdhani Enclave, Bhubaneswar',
        latitude: 20.315,
        longitude: 85.8305,
        capacity: 200,
        occupancy: 200,
        facilities: ['water'],
        contactPhone: '+91-674-2530500',
        status: 'full',
      },
    });
    await prisma.resource.createMany({
      data: [
        { name: 'Drinking Water Bottles', category: 'water', quantity: 2000, unit: 'bottles', shelterId: s1.id },
        { name: 'Rice Packets', category: 'food', quantity: 500, unit: 'packets', shelterId: s1.id },
        { name: 'Medical First-Aid Kits', category: 'medical', quantity: 60, unit: 'kits', shelterId: s1.id },
        { name: 'Blankets', category: 'clothing', quantity: 400, unit: 'pieces', shelterId: s2.id },
        { name: 'Diesel Generator Fuel', category: 'fuel', quantity: 300, unit: 'litres', shelterId: s2.id },
      ],
    });
    console.log('Seeded 3 shelters + resources');
  }

  if ((await prisma.report.count()) === 0) {
    await prisma.report.createMany({
      data: [
        {
          trackingId: 'apds_demo_001',
          type: 'flood',
          status: 'in_progress',
          priorityScore: 85,
          priorityLabel: 'RED',
          latitude: 20.31,
          longitude: 85.84,
          landmark: 'Brahmeswar Patna',
          description: 'Family trapped on roof, water 5ft rising, elderly member diabetic',
          reporterName: 'Demo Reporter 1',
          reporterPhone: '+91-9000000101',
          source: 'form',
          triageFactors: { factors: ['TYPE_BASE', 'KEYWORD:trapped', 'KEYWORD:roof', 'AGE_ELDERLY'] },
        },
        {
          trackingId: 'apds_demo_002',
          type: 'medical',
          status: 'pending',
          priorityScore: 72,
          priorityLabel: 'YELLOW',
          latitude: 20.29,
          longitude: 85.82,
          landmark: 'Old Town',
          description: 'Pregnant woman needs evacuation, contractions started',
          reporterName: 'Demo Reporter 2',
          reporterPhone: '+91-9000000102',
          source: 'sos',
          triageFactors: { factors: ['TYPE_BASE', 'MEDICAL_PREGNANCY'] },
        },
        {
          trackingId: 'apds_demo_003',
          type: 'missing_person',
          status: 'pending',
          priorityScore: 40,
          priorityLabel: 'GREEN',
          latitude: 20.27,
          longitude: 85.83,
          missingPersonName: 'Anita Sahoo',
          missingPersonAge: 9,
          missingPersonDesc: 'Last seen near market, wearing red dress',
          reporterName: 'Demo Reporter 3',
          reporterPhone: '+91-9000000103',
          source: 'form',
          triageFactors: { factors: ['TYPE_BASE', 'AGE_CHILD'] },
        },
        {
          trackingId: 'apds_demo_004',
          type: 'fire',
          status: 'resolved',
          priorityScore: 88,
          priorityLabel: 'RED',
          latitude: 20.25,
          longitude: 85.85,
          landmark: 'New Town Market',
          description: 'Fire spreading, child trapped inside, cardiac patient nearby',
          reporterName: 'Demo Reporter 4',
          reporterPhone: '+91-9000000104',
          source: 'sos',
          resolvedAt: new Date(Date.now() - 2 * 86400000),
          resolutionNotes: 'Fire controlled by NDRF, child rescued safely',
          triageFactors: { factors: ['TYPE_BASE', 'KEYWORD:trapped', 'KEYWORD:child', 'MEDICAL_CARDIAC'] },
        },
      ],
    });
    console.log('Seeded 4 demo reports');
  }

  if ((await prisma.alert.count()) === 0) {
    await prisma.alert.createMany({
      data: [
        {
          title: 'Heavy Rainfall Warning',
          message: 'Very heavy rainfall expected over the next 24 hours in Khordha district. Avoid low-lying areas and riverbanks.',
          severity: 'critical',
          channel: 'all',
          targetArea: 'Khordha',
          createdBy: 'system',
        },
        {
          title: 'Shelter Availability Update',
          message: 'Kalinga Stadium shelter has capacity available. Evacuees are requested to move to the nearest open shelter.',
          severity: 'warning',
          channel: 'public',
          targetArea: 'Bhubaneswar',
          createdBy: 'system',
        },
      ],
    });
    console.log('Seeded 2 alerts');
  }

  if ((await prisma.safetyCheckin.count()) === 0) {
    await prisma.safetyCheckin.createMany({
      data: [
        { fullName: 'Demo Citizen 1', phone: '+91-9000000201', locationName: 'Janata Maidan', status: 'safe', latitude: 20.2686, longitude: 85.8327 },
        { fullName: 'Demo Citizen 2', phone: '+91-9000000202', locationName: 'Old Town', status: 'need_assistance', latitude: 20.29, longitude: 85.82, notes: 'Stuck on first floor, water rising' },
      ],
    });
    console.log('Seeded 2 safety checkins');
  }

  if ((await prisma.routeHazard.count()) === 0) {
    await prisma.routeHazard.createMany({
      data: [
        { type: 'flood_polygon', name: 'Daya river flood zone', geometry: { type: 'Polygon', coordinates: [[[85.81, 20.3], [85.85, 20.3], [85.85, 20.33], [85.81, 20.33], [85.81, 20.3]]] }, active: true },
        { type: 'blocked_underpass', name: 'Railway underpass blocked', geometry: { type: 'Point', coordinates: [85.84, 20.27] }, active: true },
      ],
    });
    console.log('Seeded 2 route hazards');
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());