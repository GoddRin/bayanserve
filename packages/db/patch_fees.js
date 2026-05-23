const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Patching Service Fees & Processing Days ===\n');

  const updates = [
    {
      name: 'Barangay Clearance',
      baseFee: 100.00,
      processingDays: 1,
      note: 'Typical personal clearance fee for small Cagayan municipalities'
    },
    {
      name: 'Community Tax Certificate (Cedula)',
      baseFee: 50.00,
      processingDays: 1,
      note: 'Flat minimum rate (LGC: ₱5 basic + income-based add-on; portal uses flat floor)'
    },
    {
      name: 'Business Permit',
      baseFee: 500.00,
      processingDays: 7,
      note: 'Mayor\'s Permit base fee; 7 working days per EODB Act'
    },
    {
      name: 'Working Permit',
      baseFee: 200.00,
      processingDays: 2,
      note: 'Occupational/Health permit fee for small municipality'
    },
    {
      name: 'Certificate of Indigency',
      baseFee: 0.00,
      processingDays: 1,
      note: 'Free — mandated for indigent residents'
    },
    {
      name: 'Complaint Filing',
      baseFee: 0.00,
      processingDays: 1,
      note: 'Free — logged in blotter within 1 day; summons & hearing scheduled shortly after'
    },
  ];

  for (const svc of updates) {
    const result = await prisma.serviceType.updateMany({
      where: { name: svc.name },
      data: {
        baseFee: svc.baseFee,
        processingDays: svc.processingDays,
      },
    });
    console.log(`✅ ${svc.name}`);
    console.log(`   Fee: ₱${svc.baseFee.toFixed(2)}  |  Processing: ${svc.processingDays} day(s)`);
    console.log(`   Note: ${svc.note}`);
    console.log(`   Rows updated: ${result.count}\n`);
  }

  console.log('=== Verification: All Services ===\n');
  const all = await prisma.serviceType.findMany({
    select: { name: true, baseFee: true, processingDays: true, category: true },
    orderBy: { name: 'asc' },
  });

  for (const s of all) {
    const fee = s.baseFee === 0 ? 'Free' : `₱${Number(s.baseFee).toFixed(2)}`;
    console.log(`  ${s.name} (${s.category})`);
    console.log(`    Base Fee: ${fee}  |  Processing: ${s.processingDays} day(s)`);
  }

  console.log('\n=== Done ===');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
