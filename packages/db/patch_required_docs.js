const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Patching requiredDocuments for all 6 service types...\n');

  // 1. Barangay Clearance
  await prisma.serviceType.updateMany({
    where: { name: 'Barangay Clearance' },
    data: {
      requiredDocuments: [
        'Valid ID (any government-issued)',
        'Proof of Residency (utility bill or lease contract)',
        '2x2 ID Photo (white background)',
      ],
    },
  });
  console.log('✅ Updated: Barangay Clearance');

  // 2. Community Tax Certificate (Cedula)
  await prisma.serviceType.updateMany({
    where: { name: 'Community Tax Certificate (Cedula)' },
    data: {
      requiredDocuments: [
        'Valid ID (any government-issued)',
        'Proof of Income (if employed — payslip or certificate of employment)',
      ],
    },
  });
  console.log('✅ Updated: Community Tax Certificate (Cedula)');

  // 3. Business Permit
  await prisma.serviceType.updateMany({
    where: { name: 'Business Permit' },
    data: {
      requiredDocuments: [
        'DTI Registration or Business Name Registration',
        'Barangay Clearance',
        'Fire Safety Inspection Certificate',
        'Lease Contract or Land Title (proof of business location)',
        'Community Tax Certificate (Cedula)',
      ],
    },
  });
  console.log('✅ Updated: Business Permit');

  // 4. Working Permit
  await prisma.serviceType.updateMany({
    where: { name: 'Working Permit' },
    data: {
      requiredDocuments: [
        'Barangay Clearance',
        'Health Certificate (from RHU or accredited clinic)',
        '2x2 ID Photo (white background)',
      ],
    },
  });
  console.log('✅ Updated: Working Permit');

  // 5. Certificate of Indigency
  await prisma.serviceType.updateMany({
    where: { name: 'Certificate of Indigency' },
    data: {
      requiredDocuments: [
        'Valid ID (any government-issued)',
        'Proof of Residency (utility bill or lease contract)',
      ],
    },
  });
  console.log('✅ Updated: Certificate of Indigency');

  // 6. Complaint Filing
  await prisma.serviceType.updateMany({
    where: { name: 'Complaint Filing' },
    data: {
      requiredDocuments: [],
    },
  });
  console.log('✅ Updated: Complaint Filing');

  // ─── Verification ──────────────────────────────────────────────────────────
  console.log('\n📋 Verification — all service types:\n');

  const allServices = await prisma.serviceType.findMany({
    select: { name: true, requiredDocuments: true },
    orderBy: { name: 'asc' },
  });

  for (const svc of allServices) {
    console.log(`  ${svc.name}`);
    console.log(`    requiredDocuments: ${JSON.stringify(svc.requiredDocuments)}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Patch failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
