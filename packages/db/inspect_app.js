const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const app = await prisma.application.findFirst({
    where: { trackingNumber: 'PNB-2026-157542' },
    include: {
      citizen: true,
      serviceType: true
    }
  });
  console.log('TYPE OF formData:', typeof app.formData);
  console.log('VALUE OF formData:', app.formData);
  if (app.formData) {
    console.log('KEYS of formData:', Object.keys(app.formData));
    console.log('personal:', app.formData.personal);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
