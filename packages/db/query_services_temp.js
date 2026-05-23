const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const services = await p.serviceType.findMany();
  console.log(JSON.stringify(services, null, 2));
}

main().catch(e => console.error(e)).finally(() => p.$disconnect());
