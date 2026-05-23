const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const services = await p.serviceType.findMany({
    select: { name: true, category: true, requiredDocuments: true }
  });
  console.log(JSON.stringify(services, null, 2));
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
