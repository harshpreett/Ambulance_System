import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { hashSecret } from '../src/utils/crypto.js';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const DEMO_PASSWORD = 'DemoAccess!2026';

async function main() {
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.tripStatusEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.hospitalCapacityHold.deleteMany(),
    prisma.hospitalProposal.deleteMany(),
    prisma.dispatchAssignment.deleteMany(),
    prisma.requestRequirement.deleteMany(),
    prisma.emergencyRequest.deleteMany(),
    prisma.hospitalBed.deleteMany(),
    prisma.hospitalSpecialty.deleteMany(),
    prisma.ambulanceCapability.deleteMany(),
    prisma.user.deleteMany(),
    prisma.hospital.deleteMany(),
    prisma.ambulance.deleteMany(),
  ]);

  const ambulances = await Promise.all([
    prisma.ambulance.create({ data: { callSign: 'AMB-101', type: 'ALS', latitude: 30.7333, longitude: 76.7794, capabilities: { create: ['oxygen', 'cardiac_support', 'paramedic', 'stretcher', 'icu', 'ventilator'].map((capability) => ({ capability })) } } }),
    prisma.ambulance.create({ data: { callSign: 'AMB-202', type: 'BLS', latitude: 30.7046, longitude: 76.7179, capabilities: { create: ['oxygen', 'paramedic', 'stretcher'].map((capability) => ({ capability })) } } }),
    prisma.ambulance.create({ data: { callSign: 'AMB-303', type: 'NEONATAL', latitude: 30.6942, longitude: 76.8606, capabilities: { create: ['oxygen', 'neonatal_care', 'paramedic', 'stretcher'].map((capability) => ({ capability })) } } }),
  ]);

  const hospitals = await Promise.all([
    prisma.hospital.create({ data: {
      name: 'Tricity General Hospital', ownership: 'GOVERNMENT', latitude: 30.7649, longitude: 76.7754, demoPhone: '0172-555-0101',
      specialties: { create: ['emergency', 'cardiac_care', 'oxygen', 'neonatal_care'].map((specialty) => ({ specialty })) },
      beds: { create: [{ bedType: 'EMERGENCY', totalCount: 12 }, { bedType: 'ICU', totalCount: 6 }, { bedType: 'VENTILATOR', totalCount: 4 }] },
    } }),
    prisma.hospital.create({ data: {
      name: 'Mohali Community Medical Centre', ownership: 'GOVERNMENT', latitude: 30.7042, longitude: 76.7181, demoPhone: '0172-555-0202',
      specialties: { create: ['emergency', 'oxygen'].map((specialty) => ({ specialty })) },
      beds: { create: [{ bedType: 'EMERGENCY', totalCount: 8 }, { bedType: 'ICU', totalCount: 2 }, { bedType: 'VENTILATOR', totalCount: 1 }] },
    } }),
    prisma.hospital.create({ data: {
      name: 'Panchkula Heart and Children Hospital', ownership: 'PRIVATE', latitude: 30.6945, longitude: 76.8610, demoPhone: '0172-555-0303',
      specialties: { create: ['emergency', 'cardiac_care', 'neonatal_care', 'oxygen'].map((specialty) => ({ specialty })) },
      beds: { create: [{ bedType: 'EMERGENCY', totalCount: 7 }, { bedType: 'ICU', totalCount: 3 }, { bedType: 'VENTILATOR', totalCount: 2 }] },
    } }),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await prisma.user.createMany({ data: [
    { name: 'Demo Administrator', email: 'admin@demo.local', passwordHash, role: 'ADMIN' },
    { name: 'Operator One', email: 'operator1@demo.local', passwordHash, role: 'OPERATOR', ambulanceId: ambulances[0].id },
    { name: 'Operator Two', email: 'operator2@demo.local', passwordHash, role: 'OPERATOR', ambulanceId: ambulances[1].id },
    { name: 'Operator Three', email: 'operator3@demo.local', passwordHash, role: 'OPERATOR', ambulanceId: ambulances[2].id },
    { name: 'Tricity General Desk', email: 'hospital1@demo.local', passwordHash, role: 'HOSPITAL', hospitalId: hospitals[0].id },
    { name: 'Mohali Community Desk', email: 'hospital2@demo.local', passwordHash, role: 'HOSPITAL', hospitalId: hospitals[1].id },
    { name: 'Panchkula Children Desk', email: 'hospital3@demo.local', passwordHash, role: 'HOSPITAL', hospitalId: hospitals[2].id },
  ] });

  const sampleCases = [
    { reference: 'TRI-DEMO-CLOSED', status: 'CLOSED', latitude: 30.7320, longitude: 76.7790, label: 'Sector 17, Chandigarh', type: 'EMERGENCY', reqs: [], note: 'Seeded completed example for dashboard history.' },
    { reference: 'TRI-DEMO-REVIEW', status: 'NEEDS_REVIEW', latitude: 30.7550, longitude: 76.8100, label: 'Sector 26, Chandigarh', type: 'REQUIREMENT_BASED', reqs: ['ventilator'], note: 'Seeded exception example for administrator review.' },
  ];
  for (const sample of sampleCases) {
    const request = await prisma.emergencyRequest.create({ data: {
      publicReference: sample.reference,
      lookupTokenHash: hashSecret(`seed-${sample.reference}-token-do-not-use`),
      idempotencyKey: `seed-key-${sample.reference}`,
      requestType: sample.type,
      status: sample.status,
      latitude: sample.latitude,
      longitude: sample.longitude,
      locationLabel: sample.label,
      requirements: { create: sample.reqs.map((capability) => ({ capability })) },
      tripEvents: { create: [
        { newStatus: 'MATCHING', note: 'Seeded demonstration case.' },
        { oldStatus: 'MATCHING', newStatus: sample.status, note: sample.note },
      ] },
    } });
    if (sample.status === 'NEEDS_REVIEW') {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@demo.local' } });
      await prisma.notification.create({ data: { userId: admin.id, requestId: request.id, type: 'CASE_REVIEW', message: 'Seed case TRI-DEMO-REVIEW needs review.' } });
    }
  }

  console.log('Seed complete. Demo accounts share password:', DEMO_PASSWORD);
}

main().catch((error) => {
  console.error('Seed failed.');
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});

